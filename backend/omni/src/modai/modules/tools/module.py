from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter

from modai.module import ModaiModule, ModuleDependencies


@dataclass(frozen=True)
class ToolDefinition:
    """A tool's metadata as returned by the Tool Registry."""

    url: str
    method: str
    openapi_spec: dict[str, Any]


class ToolRegistryModule(ModaiModule, ABC):
    """
    Module Declaration for: Tool Registry (Plain Module)

    Aggregates OpenAPI specs from all configured tools.

    Each tool is an independent microservice that:
    - Exposes an HTTP endpoint to trigger the tool (method chosen by the tool)
    - Provides an OpenAPI spec describing all its endpoints and parameters

    The registry fetches each tool's OpenAPI spec and returns them grouped
    together (unmodified).

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

    @abstractmethod
    async def get_tools(self) -> list[ToolDefinition]:
        """
        Returns all configured tool definitions.

        Each ToolDefinition contains the tool's trigger url, HTTP method,
        and its full OpenAPI spec (unmodified).

        Unavailable tool services are omitted from the result with a
        warning logged.
        """
        pass

    @abstractmethod
    async def get_tool_by_name(self, name: str) -> ToolDefinition | None:
        """
        Look up a tool by its function name (derived from operationId).

        Returns the matching ToolDefinition if found,
        or None if the tool name is not found.
        """
        pass


class ToolsWebModule(ModaiModule, ABC):
    """
    Module Declaration for: Tools Web Module (Web Module)

    Exposes GET /api/tools. Retrieves tool definitions from the Tool Registry
    and returns them in a format suitable for the consumer (e.g. frontend, chat agent).
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route("/api/tools", self.get_tools, methods=["GET"])

    @abstractmethod
    async def get_tools(self) -> dict[str, Any]:
        """
        Returns all available tools in a consumer-specific format.

        The response must contain a "tools" key with a list of tool definitions.
        The exact structure of each tool definition is determined by the
        implementation.
        """
        pass
