from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter

from modai.module import ModaiModule, ModuleDependencies


@dataclass(frozen=True)
class ToolDefinition:
    """LLM-agnostic description of a tool.

    Contains enough information to construct LLM tool calls but is not tied
    to any specific LLM API format.  Parameters are fully resolved (no $ref)
    so they can be passed directly to any LLM.
    """

    name: str
    description: str
    parameters: dict[str, Any]


class Tool(ABC):
    """A tool with its LLM-agnostic definition and run capability.

    Implementations provide both the definition (used by LLMs to understand
    and invoke the tool) and the ability to execute the tool with parameters
    returned by the LLM.
    """

    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        """The tool's LLM-agnostic definition (name, description, parameters)."""
        pass

    @abstractmethod
    async def run(self, params: dict[str, Any]) -> Any:
        """Execute the tool with the given parameters.

        Args:
            params: Parameters to pass to the tool, typically the arguments
                    returned by an LLM tool call.  Callers may inject
                    additional transport-level properties using ``_``-prefixed
                    keys (e.g. ``_bearer_token``).  These reserved keys must
                    be extracted and consumed by the implementation before
                    building the request payload — they are never forwarded
                    to the tool microservice as part of the JSON body.

        Returns:
            The tool's result (implementation-specific).
        """
        pass


class ToolRegistryModule(ModaiModule, ABC):
    """
    Module Declaration for: Tool Registry (Plain Module)

    Aggregates tools from all configured sources and provides lookup by name.

    Configuration:
        tools: list of dicts, each with:
          - "url": the full trigger endpoint URL of the tool microservice
          - "method": the HTTP method to invoke the tool (e.g. PUT, POST, GET)

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
    async def get_tools(self) -> list[Tool]:
        """
        Returns all configured tools.

        Each Tool provides its definition and run capability.
        Unavailable tool services are omitted with a warning logged.
        """
        pass

    @abstractmethod
    async def get_tool_by_name(self, name: str) -> Tool | None:
        """
        Look up a tool by its name.

        Returns the matching Tool if found, or None if not found.
        """
        pass


class ToolsWebModule(ModaiModule, ABC):
    """
    Module Declaration for: Tools Web Module (Web Module)

    Exposes GET /api/tools. Retrieves tools from the Tool Registry and returns
    their definitions in a format suitable for the consumer.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.router.add_api_route("/api/tools", self.get_tools, methods=["GET"])

    @abstractmethod
    async def get_tools(self) -> dict[str, Any]:
        """
        Returns all available tool definitions in a consumer-specific format.

        The response must contain a "tools" key with a list of tool definitions.
        The exact structure of each tool definition is determined by the
        implementation.
        """
        pass
