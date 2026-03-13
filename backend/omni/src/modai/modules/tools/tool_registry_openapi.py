import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition, ToolRegistryModule

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10.0
TOOL_HTTP_TIMEOUT_SECONDS = 30.0


class _OpenAPITool(Tool):
    """Tool backed by an OpenAPI microservice endpoint.

    Holds the tool's pre-built definition and invokes the microservice
    over HTTP when ``run`` is called.
    """

    def __init__(self, url: str, method: str, definition: ToolDefinition) -> None:
        self._url = url
        self._method = method
        self._definition_val = definition

    @property
    def definition(self) -> ToolDefinition:
        return self._definition_val

    async def run(self, params: dict[str, Any]) -> Any:
        """Invoke the tool microservice over HTTP with the given parameters.

        Extracts reserved metadata keys from ``params`` before sending the
        request.  Currently recognised keys:

        * ``_bearer_token`` — forwarded as the ``Authorization: Bearer``
          header; never included in the JSON request body.
        """
        body = dict(params)
        bearer_token = body.pop("_bearer_token", None)
        headers: dict[str, str] = {}
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"
        async with httpx.AsyncClient(timeout=TOOL_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.request(
                method=self._method.upper(),
                url=self._url,
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
        tools: list of dicts, each with:
          - "url": the full trigger endpoint URL of the tool microservice
          - "method": the HTTP method to invoke the tool (e.g. PUT, POST, GET)
        The registry derives the base URL from "url" and appends
        "/openapi.json" to fetch the spec.

    Example config:
        tools:
          - url: http://calculator-service:8000/calculate
            method: POST
          - url: http://web-search-service:8000/search
            method: PUT
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.tool_services: list[dict[str, str]] = config.get("tools", [])

    async def get_tools(self) -> list[Tool]:
        tools: list[Tool] = []

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            for service in self.tool_services:
                url = service["url"]
                method = service["method"]
                base_url = _derive_base_url(url)
                spec = await _fetch_openapi_spec(client, base_url)
                if spec is None:
                    continue
                definition = _build_tool_definition(spec)
                if definition is None:
                    logger.warning(
                        "No valid operation with operationId found in spec from %s, skipping",
                        base_url,
                    )
                    continue
                tools.append(
                    _OpenAPITool(url=url, method=method, definition=definition)
                )

        return tools

    async def get_tool_by_name(self, name: str) -> Tool | None:
        tools = await self.get_tools()
        for tool in tools:
            if tool.definition.name == name:
                return tool
        return None


def _build_tool_definition(spec: dict[str, Any]) -> ToolDefinition | None:
    """Build a ToolDefinition from an OpenAPI spec.

    Extracts name (operationId), description (summary/description), and
    parameters (request body schema with $ref fully resolved).

    Returns None if no operation with an operationId is found.
    """
    paths = spec.get("paths", {})
    for _path, methods in paths.items():
        for _method, operation in methods.items():
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue
            name = operation["operationId"]
            description = operation.get("summary") or operation.get("description", "")
            parameters = _extract_parameters(operation, spec)
            return ToolDefinition(
                name=name, description=description, parameters=parameters
            )
    return None


def _extract_parameters(
    operation: dict[str, Any], spec: dict[str, Any]
) -> dict[str, Any]:
    """Extract and resolve the parameter schema from an OpenAPI operation's request body.

    Resolves any $ref references against the full OpenAPI spec so the
    returned schema is fully inlined.
    """
    request_body = operation.get("requestBody", {})
    content = request_body.get("content", {})
    json_content = content.get("application/json", {})
    schema = json_content.get("schema", {"type": "object", "properties": {}})
    return _resolve_refs(schema, spec)


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


def _derive_base_url(trigger_url: str) -> str:
    """Derive the service base URL from a full trigger endpoint URL.

    E.g. 'http://calc:8000/calculate' -> 'http://calc:8000'
    """
    parsed = urlparse(trigger_url)
    return f"{parsed.scheme}://{parsed.netloc}"


async def _fetch_openapi_spec(
    client: httpx.AsyncClient, base_url: str
) -> dict[str, Any] | None:
    openapi_url = f"{base_url.rstrip('/')}/openapi.json"
    try:
        response = await client.get(openapi_url)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        logger.warning(
            "Tool service %s returned HTTP %s", base_url, e.response.status_code
        )
        return None
    except httpx.RequestError as e:
        logger.warning("Failed to reach tool service %s: %s", base_url, e)
        return None
    except Exception:
        logger.warning(
            "Unexpected error fetching spec from %s", base_url, exc_info=True
        )
        return None
