import logging
from typing import Any

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolRegistryModule, ToolsWebModule

logger = logging.getLogger(__name__)


class OpenAIToolsWebModule(ToolsWebModule):
    """
    ToolsWebModule implementation that returns tools in OpenAI
    function-calling format.

    Transforms each tool's OpenAPI spec into the format expected by
    the OpenAI Chat Completions API:
    {
        "type": "function",
        "function": {
            "name": "<operationId>",
            "description": "<summary or description>",
            "parameters": { <request body schema> },
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
        openai_tools = []
        for tool in tools:
            openai_tool = _transform_openapi_to_openai(tool.openapi_spec)
            if openai_tool is not None:
                openai_tools.append(openai_tool)
        return {"tools": openai_tools}


def _transform_openapi_to_openai(spec: dict[str, Any]) -> dict[str, Any] | None:
    """
    Transform an OpenAPI spec into OpenAI function-calling format.

    Transformation rules:
    - operationId → function.name
    - summary (or description) → function.description
    - Request body schema → function.parameters
    - strict = True → function.strict (enables structured outputs)
    """
    paths = spec.get("paths", {})
    for _path, methods in paths.items():
        for _method, operation in methods.items():
            if not isinstance(operation, dict) or "operationId" not in operation:
                continue

            name = operation["operationId"]
            description = operation.get("summary") or operation.get("description", "")
            parameters = _extract_parameters(operation)

            return {
                "type": "function",
                "function": {
                    "name": name,
                    "description": description,
                    "parameters": parameters,
                    "strict": True,
                },
            }

    logger.warning(
        "No operation with operationId found in spec: %s", spec.get("info", {})
    )
    return None


def _extract_parameters(operation: dict[str, Any]) -> dict[str, Any]:
    """Extract parameter schema from an OpenAPI operation's request body."""
    request_body = operation.get("requestBody", {})
    content = request_body.get("content", {})
    json_content = content.get("application/json", {})
    return json_content.get("schema", {"type": "object", "properties": {}})
