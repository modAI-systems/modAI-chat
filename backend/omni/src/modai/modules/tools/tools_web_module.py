import logging
from typing import Any

from modai.module import ModuleDependencies
from modai.modules.tools.module import (
    ToolDefinition,
    ToolRegistryModule,
    ToolsWebModule,
)

logger = logging.getLogger(__name__)


class OpenAIToolsWebModule(ToolsWebModule):
    """
    ToolsWebModule implementation that returns tools in OpenAI
    function-calling format.

    Converts each tool's ToolDefinition into the format expected by
    the OpenAI Chat Completions API:
    {
        "type": "function",
        "function": {
            "name": "<name>",
            "description": "<description>",
            "parameters": { <parameters JSON Schema> },
            "strict": true
        }
    }
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.tool_registry: ToolRegistryModule = dependencies.get_module(
            "tool_registry"
        )

    async def get_tools(self) -> dict[str, Any]:
        tools = await self.tool_registry.get_tools()
        openai_tools = [_to_openai_format(tool.definition) for tool in tools]
        return {"tools": openai_tools}


def _to_openai_format(definition: ToolDefinition) -> dict[str, Any]:
    """Convert a ToolDefinition to OpenAI function-calling format."""
    return {
        "type": "function",
        "function": {
            "name": definition.name,
            "description": definition.description,
            "parameters": definition.parameters,
            "strict": True,
        },
    }
