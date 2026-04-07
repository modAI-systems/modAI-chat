import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

import httpx

from modai.module import ModuleDependencies
from modai.modules.http_client.module import HttpClientModule
from modai.modules.tools.module import Tool, ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10.0
TOOL_HTTP_TIMEOUT_SECONDS = 30.0


class _OpenAPITool(Tool):
    """Tool backed by an OpenAPI microservice endpoint.

    Holds the tool's pre-built definition and invokes the microservice
    over HTTP when ``run`` is called.
    """

    def __init__(
        self,
        url: str,
        method: str,
        definition: ToolDefinition,
        http_client_factory: HttpClientModule,
        header_param_names: frozenset[str] = frozenset(),
    ) -> None:
        self._url = url
        self._method = method
        self._definition_val = definition
        self._http_client_factory = http_client_factory
        self._header_param_names = header_param_names

    @property
    def definition(self) -> ToolDefinition:
        return self._definition_val

    async def run(self, params: dict[str, Any]) -> Any:
        """Invoke the tool microservice over HTTP with the given parameters.

        Extracts reserved metadata keys from ``params`` before sending the
        request.  Currently recognised keys:

        * ``_bearer_token`` — forwarded as the ``Authorization: Bearer``
          header; never included in the JSON request body.

        Path parameters present in the URL template (e.g. ``{user_id}``) are
        substituted directly into the URL and removed from the request body.

        Header parameters declared in the OpenAPI spec (``in: header``) are
        forwarded as-is HTTP headers and removed from the request body.
        """
        body = dict(params)
        bearer_token = body.pop("_bearer_token", None)
        headers: dict[str, str] = {}
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"

        for header_name in self._header_param_names:
            if header_name in body:
                headers[header_name] = str(body.pop(header_name))

        url = self._url
        for name in re.findall(r"\{(\w+)\}", url):
            if name in body:
                url = url.replace(f"{{{name}}}", str(body.pop(name)))

        async with self._http_client_factory.new(
            timeout=TOOL_HTTP_TIMEOUT_SECONDS
        ) as client:
            response = await client.request(
                method=self._method.upper(),
                url=url,
                json=body,
                headers=headers,
            )
            response.raise_for_status()
            return response.text


class OpenAPIToolRegistryModule(ToolRegistryModule):
    """
    Tool Registry that fetches OpenAPI specs from configured microservices
    and creates Tool instances with HTTP-based run capability.

    Each Tool's definition (name, description, parameters) is extracted from
    the service's OpenAPI spec.  The run method makes an HTTP request to the
    configured trigger endpoint.

        Configuration:
                tool_servers: list of dicts, each with:
                    - "url": the OpenAPI specification URL of a tool server
                        (e.g. ``http://tool-service:8000/openapi.json``)

                The registry discovers all operations with ``operationId`` from each
                OpenAPI spec and creates one Tool per operation.

    Module Dependencies:
        http_client: an HttpClientModule used for all outbound HTTP requests.

        Example config:
                tool_servers:
                    - url: http://calculator-service:8000/openapi.json
                    - url: http://web-search-service:8000/openapi.json
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.tool_servers: list[dict[str, str]] = config.get("tool_servers", [])
        self._http_client: HttpClientModule = dependencies.get_module("http_client")  # type: ignore[assignment]

    async def get_tools(
        self,
        predefined_params: dict[str, Any] | None = None,  # noqa: ARG002
    ) -> list[Tool]:
        tools: list[Tool] = []

        async with self._http_client.new(timeout=HTTP_TIMEOUT_SECONDS) as client:
            for server in self.tool_servers:
                openapi_url = server["url"]
                spec = await _fetch_openapi_spec(client, openapi_url)
                if spec is None:
                    continue
                service_base_url = _derive_base_url(openapi_url)
                operation_specs = _build_operation_specs(spec)
                if not operation_specs:
                    logger.warning(
                        "No valid operation with operationId found in spec from %s, skipping",
                        openapi_url,
                    )
                    continue
                for operation_spec in operation_specs:
                    tool_url = _build_operation_url(
                        service_base_url, operation_spec.path
                    )
                    tools.append(
                        _OpenAPITool(
                            url=tool_url,
                            method=operation_spec.method,
                            definition=operation_spec.definition,
                            http_client_factory=self._http_client,
                            header_param_names=operation_spec.header_param_names,
                        )
                    )

        return tools

    async def get_tool_by_name(
        self,
        name: str,
        predefined_params: dict[str, Any] | None = None,  # noqa: ARG002
    ) -> Tool | None:
        tools = await self.get_tools()
        for tool in tools:
            if tool.definition.name == name:
                return tool
        return None


@dataclass(frozen=True)
class _OperationSpec:
    """Resolved operation information needed to build a Tool instance."""

    path: str
    method: str
    definition: ToolDefinition
    header_param_names: frozenset[str]


def _build_operation_specs(spec: dict[str, Any]) -> list[_OperationSpec]:
    """Build all Tool definitions from an OpenAPI spec.

    Extracts name (operationId), description (summary/description), and
    parameters (request body schema with $ref fully resolved, path params and
    header params merged in).

    Returns one entry per operation that has an ``operationId``.
    """
    paths = spec.get("paths", {})
    operation_specs: list[_OperationSpec] = []
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

            name = operation["operationId"]
            description = operation.get("summary") or operation.get("description", "")
            parameters = _extract_parameters(merged_operation, spec)
            header_params = _extract_header_parameters(merged_operation, spec)
            header_param_names = frozenset(p["name"] for p in header_params)
            operation_specs.append(
                _OperationSpec(
                    path=path,
                    method=method,
                    definition=ToolDefinition(
                        name=name,
                        description=description,
                        parameters=parameters,
                    ),
                    header_param_names=header_param_names,
                )
            )

    return operation_specs


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
    """Return resolved path parameters (``in: path``) from an OpenAPI operation."""
    return [
        _resolve_refs(param, spec)
        for param in operation.get("parameters", [])
        if _resolve_refs(param, spec).get("in") == "path"
    ]


def _extract_header_parameters(
    operation: dict[str, Any], spec: dict[str, Any]
) -> list[dict[str, Any]]:
    """Return resolved header parameters (``in: header``) from an OpenAPI operation."""
    return [
        _resolve_refs(param, spec)
        for param in operation.get("parameters", [])
        if _resolve_refs(param, spec).get("in") == "header"
    ]


def _resolve_refs(node: Any, spec: dict[str, Any]) -> Any:
    """Recursively resolve all $ref pointers in a JSON Schema against the OpenAPI spec."""
    if isinstance(node, dict):
        if "$ref" in node:
            resolved = _follow_ref(node["$ref"], spec)
            return _resolve_refs(resolved, spec)
        return {key: _resolve_refs(value, spec) for key, value in node.items()}
    if isinstance(node, list):
        return [_resolve_refs(item, spec) for item in node]
    return node


def _follow_ref(ref: str, spec: dict[str, Any]) -> dict[str, Any]:
    """Follow a JSON Pointer reference like '#/components/schemas/Foo'."""
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
    """Join service base URL with an OpenAPI path item key."""
    if operation_path.startswith("/"):
        return f"{service_base_url.rstrip('/')}{operation_path}"
    return f"{service_base_url.rstrip('/')}/{operation_path}"


def _normalize_openapi_url(openapi_url: str) -> str:
    """Normalize OpenAPI URL; append '/openapi.json' if only server base was provided."""
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
