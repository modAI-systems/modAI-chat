from abc import ABC, abstractmethod
from typing import Any

from fastapi import Request
from openai.types.responses.function_tool_param import FunctionToolParam

from modai.module import ModaiModule


ToolDefinition = FunctionToolParam


class ToolRegistryModule(ModaiModule, ABC):
    """
    Module Declaration for: Tool Registry (Plain Module)

    Abstract contract for tool discovery and execution.

    This interface defines runtime tool discovery via ``get_tools`` and
    tool execution via ``run_tool``.

    Concrete implementations decide how tools are sourced and invoked
    (for example via OpenAPI specs, static definitions, or other backends).
    """

    @abstractmethod
    async def get_tools(self, request: Request) -> list[ToolDefinition]:
        """
        Returns all configured tools.

        Each entry is returned in OpenAI ``function`` tool format.
        Unavailable tool services are omitted with a warning logged.

        Args:
            request: FastAPI request context.
        """
        pass

    @abstractmethod
    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        """
        Execute a configured tool.

        Args:
            request: FastAPI request context.
            params: Invocation payload. Implementations should expect at least
                ``name`` and ``arguments`` keys.
        """
        pass
