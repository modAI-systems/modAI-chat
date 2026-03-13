from typing import Any
from unittest.mock import AsyncMock

import pytest

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition
from modai.modules.tools.tools_web_module import (
    OpenAIToolsWebModule,
    _to_openai_format,
)


SAMPLE_OPENAPI_SPEC = {
    "openapi": "3.1.0",
    "info": {"title": "Calculator Tool", "version": "1.0.0"},
    "paths": {
        "/calculate": {
            "post": {
                "summary": "Evaluate a math expression",
                "operationId": "calculate",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "expression": {
                                        "type": "string",
                                        "description": "Math expression to evaluate",
                                    }
                                },
                                "required": ["expression"],
                            }
                        }
                    },
                },
            }
        }
    },
}

SAMPLE_DEFINITION = ToolDefinition(
    name="calculate",
    description="Evaluate a math expression",
    parameters={
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Math expression to evaluate",
            }
        },
        "required": ["expression"],
    },
)


def _make_tool(definition: ToolDefinition) -> Tool:
    """Create a minimal Tool stub for testing."""

    class _StubTool(Tool):
        @property
        def definition(self) -> ToolDefinition:
            return definition

        async def run(self, params: dict[str, Any]) -> Any:
            return ""

    return _StubTool()


class TestToOpenAIFormat:
    def test_formats_valid_definition(self):
        result = _to_openai_format(SAMPLE_DEFINITION)
        assert result == {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Evaluate a math expression",
                "parameters": SAMPLE_DEFINITION.parameters,
                "strict": True,
            },
        }

    def test_uses_provided_description(self):
        definition = ToolDefinition(
            name="run_task",
            description="Runs something",
            parameters={"type": "object", "properties": {}},
        )
        result = _to_openai_format(definition)
        assert result["function"]["description"] == "Runs something"

    def test_empty_description_is_preserved(self):
        definition = ToolDefinition(
            name="run_task",
            description="",
            parameters={"type": "object", "properties": {}},
        )
        result = _to_openai_format(definition)
        assert result["function"]["description"] == ""

    def test_parameters_are_passed_through(self):
        custom_params = {"type": "object", "properties": {"x": {"type": "integer"}}}
        definition = ToolDefinition(
            name="calc", description="desc", parameters=custom_params
        )
        result = _to_openai_format(definition)
        assert result["function"]["parameters"] == custom_params

    def test_strict_is_always_true(self):
        result = _to_openai_format(SAMPLE_DEFINITION)
        assert result["function"]["strict"] is True


class TestToolsWebModule:
    def _make_module(self, registry_tools: list[Tool]) -> OpenAIToolsWebModule:
        mock_registry = AsyncMock()
        mock_registry.get_tools = AsyncMock(return_value=registry_tools)
        deps = ModuleDependencies(modules={"tool_registry": mock_registry})
        return OpenAIToolsWebModule(deps, {})

    def test_has_router_with_tools_endpoint(self):
        module = self._make_module([])
        assert hasattr(module, "router")
        routes = [r.path for r in module.router.routes]
        assert "/api/tools" in routes

    @pytest.mark.asyncio
    async def test_returns_empty_tools_when_registry_empty(self):
        module = self._make_module([])
        result = await module.get_tools()
        assert result == {"tools": []}

    @pytest.mark.asyncio
    async def test_transforms_registry_tools_to_openai_format(self):
        definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "Math expression to evaluate",
                    }
                },
                "required": ["expression"],
            },
        )
        module = self._make_module([_make_tool(definition)])
        result = await module.get_tools()

        assert len(result["tools"]) == 1
        tool = result["tools"][0]
        assert tool["type"] == "function"
        assert tool["function"]["name"] == "calculate"
        assert tool["function"]["description"] == "Evaluate a math expression"
        assert "expression" in tool["function"]["parameters"]["properties"]

    @pytest.mark.asyncio
    async def test_multiple_tools_returned(self):
        search_def = ToolDefinition(
            name="web_search",
            description="Search the web",
            parameters={
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        )
        module = self._make_module(
            [_make_tool(SAMPLE_DEFINITION), _make_tool(search_def)]
        )
        result = await module.get_tools()

        assert len(result["tools"]) == 2
        names = [t["function"]["name"] for t in result["tools"]]
        assert "calculate" in names
        assert "web_search" in names
