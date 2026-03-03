import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from modai.module import ModuleDependencies
from modai.modules.tools.module import (
    ToolDefinition,
    ToolRegistryModule,
)

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10.0


class HttpToolRegistryModule(ToolRegistryModule):
    """
    Tool Registry implementation that fetches OpenAPI specs from
    configured tool microservices over HTTP.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.tool_services: list[dict[str, str]] = config.get("tools", [])

    async def get_tools(self) -> list[ToolDefinition]:
        tools: list[ToolDefinition] = []

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
            for service in self.tool_services:
                url = service["url"]
                method = service["method"]
                base_url = _derive_base_url(url)
                spec = await _fetch_openapi_spec(client, base_url)
                if spec is not None:
                    tools.append(
                        ToolDefinition(url=url, method=method, openapi_spec=spec)
                    )

        return tools

    async def get_tool_by_name(self, name: str) -> ToolDefinition | None:
        tools = await self.get_tools()
        for tool in tools:
            operation_id = _extract_operation_id(tool.openapi_spec)
            if operation_id == name:
                return tool
        return None


def _extract_operation_id(spec: dict[str, Any]) -> str | None:
    """Extract the operationId from the first operation in an OpenAPI spec."""
    paths = spec.get("paths", {})
    for _path, methods in paths.items():
        for _method, operation in methods.items():
            if isinstance(operation, dict) and "operationId" in operation:
                return operation["operationId"]
    return None


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
