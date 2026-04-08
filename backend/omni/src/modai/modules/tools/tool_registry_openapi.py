import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.http_client.module import HttpClientModule
from modai.modules.tools.module import ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10.0
TOOL_HTTP_TIMEOUT_SECONDS = 30.0


class OpenAPIToolRegistryModule(ToolRegistryModule):
    """Tool Registry that fetches OpenAPI specs from configured microservices.

    It exposes tools in OpenAI ``function`` tool format and executes tool calls
    over HTTP based on the operation metadata discovered from OpenAPI specs.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.tool_servers: list[dict[str, str]] = config.get("tool_servers", [])
        self._http_client: HttpClientModule = dependencies.get_module("http_client")

    async def get_tools(self, request: Request) -> list[ToolDefinition]:
        del request
        operation_specs = await self._collect_operation_specs()
        return [spec.definition for spec in operation_specs]

    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        del request
        name = params.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("Tool invocation requires a non-empty 'name'")

        raw_arguments = params.get("arguments")
        if raw_arguments is None:
            raw_arguments = {k: v for k, v in params.items() if k != "name"}
        if not isinstance(raw_arguments, dict):
            raise ValueError("Tool invocation 'arguments' must be an object")

        operation_spec = await self._find_operation_spec_by_name(name)
        if operation_spec is None:
            raise ValueError(f"Tool '{name}' not found")

        return await _run_operation(
            http_client_factory=self._http_client,
            operation_spec=operation_spec,
            params=raw_arguments,
        )

    async def _find_operation_spec_by_name(self, name: str) -> "_OperationSpec | None":
        operation_specs = await self._collect_operation_specs()
        return next(
            (spec for spec in operation_specs if spec.definition["name"] == name), None
        )

    async def _collect_operation_specs(self) -> list["_OperationSpec"]:
        operation_specs: list[_OperationSpec] = []

        async with self._http_client.new(timeout=HTTP_TIMEOUT_SECONDS) as client:
            for server in self.tool_servers:
                openapi_url = server["url"]
                spec = await _fetch_openapi_spec(client, openapi_url)
                if spec is None:
                    continue

                service_base_url = _derive_base_url(openapi_url)
                built_specs = _build_operation_specs(spec)
                if not built_specs:
                    logger.warning(
                        "No valid operation with operationId found in spec from %s, skipping",
                        openapi_url,
                    )
                    continue

                for built_spec in built_specs:
                    operation_specs.append(
                        _OperationSpec(
                            url=_build_operation_url(service_base_url, built_spec.path),
                            method=built_spec.method,
                            definition=built_spec.definition,
                            header_param_names=built_spec.header_param_names,
                        )
                    )

        return operation_specs


@dataclass(frozen=True)
class _BuiltOperationSpec:
    path: str
    method: str
    definition: ToolDefinition
    header_param_names: frozenset[str]


@dataclass(frozen=True)
class _OperationSpec:
    url: str
    method: str
    definition: ToolDefinition
    header_param_names: frozenset[str]


def _build_operation_specs(spec: dict[str, Any]) -> list[_BuiltOperationSpec]:
    paths = spec.get("paths", {})
    operation_specs: list[_BuiltOperationSpec] = []
    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue

        shared_parameters = methods.get("parameters", [])
        for method, operation in methods.items():
            if method == "parameters":
                continue
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue

            merged_operation = {
                **operation,
                "parameters": [*shared_parameters, *operation.get("parameters", [])],
            }
            operation_specs.append(
                _BuiltOperationSpec(
                    path=path,
                    method=method,
                    definition={
                        "type": "function",
                        "name": operation["operationId"],
                        "description": operation.get("summary")
                        or operation.get("description", ""),
                        "parameters": _extract_parameters(merged_operation, spec),
                        "strict": True,
                    },
                    header_param_names=frozenset(
                        p["name"]
                        for p in _extract_header_parameters(merged_operation, spec)
                    ),
                )
            )

    return operation_specs


async def _run_operation(
    http_client_factory: HttpClientModule,
    operation_spec: _OperationSpec,
    params: dict[str, Any],
) -> Any:
    body = dict(params)
    bearer_token = body.pop("_bearer_token", None)

    headers: dict[str, str] = {}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    for header_name in operation_spec.header_param_names:
        if header_name in body:
            headers[header_name] = str(body.pop(header_name))

    resolved_url = operation_spec.url
    for name in re.findall(r"\{(\w+)\}", resolved_url):
        if name in body:
            resolved_url = resolved_url.replace(f"{{{name}}}", str(body.pop(name)))

    async with http_client_factory.new(timeout=TOOL_HTTP_TIMEOUT_SECONDS) as client:
        response = await client.request(
            method=operation_spec.method.upper(),
            url=resolved_url,
            json=body,
            headers=headers,
        )
        response.raise_for_status()
        return response.text


def _extract_parameters(
    operation: dict[str, Any], spec: dict[str, Any]
) -> dict[str, Any]:
    """Extract and resolve the parameter schema from an OpenAPI operation.

    Combines:
    - Request body schema (``application/json``), with ``$ref`` pointers fully
      resolved.
    - Path parameters (``in: path``) merged as additional properties so the
      LLM knows to supply them for URL substitution.
    - Header parameters (``in: header``) merged as additional properties so
      the LLM knows to supply them; at invocation time they are forwarded as
      HTTP headers rather than in the request body.
    """
    request_body = operation.get("requestBody", {})
    content = request_body.get("content", {})
    json_content = content.get("application/json", {})
    schema = json_content.get("schema", {"type": "object", "properties": {}})
    resolved = _resolve_refs(schema, spec)

    extra_params = [
        *_extract_path_parameters(operation, spec),
        *_extract_header_parameters(operation, spec),
    ]
    if not extra_params:
        return resolved

    properties = dict(resolved.get("properties", {}))
    required: list[str] = list(resolved.get("required", []))

    for param in extra_params:
        name = param["name"]
        param_schema: dict[str, Any] = dict(param.get("schema", {"type": "string"}))
        if param.get("description"):
            param_schema["description"] = param["description"]
        properties[name] = param_schema
        if param.get("required", True) and name not in required:
            required.append(name)

    result: dict[str, Any] = {**resolved, "properties": properties}
    if required:
        result["required"] = required
    return result


def _extract_path_parameters(
    operation: dict[str, Any], spec: dict[str, Any]
) -> list[dict[str, Any]]:
    return [
        _resolve_refs(param, spec)
        for param in operation.get("parameters", [])
        if _resolve_refs(param, spec).get("in") == "path"
    ]


def _extract_header_parameters(
    operation: dict[str, Any], spec: dict[str, Any]
) -> list[dict[str, Any]]:
    return [
        _resolve_refs(param, spec)
        for param in operation.get("parameters", [])
        if _resolve_refs(param, spec).get("in") == "header"
    ]


def _resolve_refs(node: Any, spec: dict[str, Any]) -> Any:
    if isinstance(node, dict):
        if "$ref" in node:
            resolved = _follow_ref(node["$ref"], spec)
            return _resolve_refs(resolved, spec)
        return {key: _resolve_refs(value, spec) for key, value in node.items()}
    if isinstance(node, list):
        return [_resolve_refs(item, spec) for item in node]
    return node


def _follow_ref(ref: str, spec: dict[str, Any]) -> dict[str, Any]:
    if not ref.startswith("#/"):
        logger.warning("Unsupported $ref format: %s", ref)
        return {}
    parts = ref.lstrip("#/").split("/")
    current: Any = spec
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            logger.warning("Could not resolve $ref path: %s", ref)
            return {}
    return current if isinstance(current, dict) else {}


def _derive_base_url(openapi_url: str) -> str:
    """Derive service base URL from an OpenAPI spec URL.

    E.g. 'http://calc:8000/openapi.json' -> 'http://calc:8000'
         'http://calc:8000/api/openapi.json' -> 'http://calc:8000/api'
    """
    parsed = urlparse(_normalize_openapi_url(openapi_url))
    base_path = parsed.path.rsplit("/", maxsplit=1)[0]
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return f"{origin}{base_path}" if base_path else origin


def _build_operation_url(service_base_url: str, operation_path: str) -> str:
    if operation_path.startswith("/"):
        return f"{service_base_url.rstrip('/')}{operation_path}"
    return f"{service_base_url.rstrip('/')}/{operation_path}"


def _normalize_openapi_url(openapi_url: str) -> str:
    normalized = openapi_url.rstrip("/")
    if normalized.endswith(".json"):
        return normalized
    return f"{normalized}/openapi.json"


async def _fetch_openapi_spec(
    client: httpx.AsyncClient, openapi_url: str
) -> dict[str, Any] | None:
    normalized_openapi_url = _normalize_openapi_url(openapi_url)
    try:
        response = await client.request("GET", normalized_openapi_url)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        logger.warning(
            "Tool service %s returned HTTP %s",
            normalized_openapi_url,
            e.response.status_code,
        )
        return None
    except httpx.RequestError as e:
        logger.warning("Failed to reach tool service %s: %s", normalized_openapi_url, e)
        return None
    except Exception:
        logger.warning(
            "Unexpected error fetching spec from %s",
            normalized_openapi_url,
            exc_info=True,
        )
        return None
