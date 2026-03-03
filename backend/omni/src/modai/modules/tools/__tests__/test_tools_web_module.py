from unittest.mock import AsyncMock

import pytest

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolDefinition
from modai.modules.tools.tools_web_module import (
    OpenAIToolsWebModule,
    _extract_parameters,
    _transform_openapi_to_openai,
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


class TestTransformOpenapiToOpenai:
    def test_transforms_valid_spec(self):
        result = _transform_openapi_to_openai(SAMPLE_OPENAPI_SPEC)
        assert result == {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Evaluate a math expression",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {
                            "type": "string",
                            "description": "Math expression to evaluate",
                        }
                    },
                    "required": ["expression"],
                },
                "strict": True,
            },
        }

    def test_uses_description_when_no_summary(self):
        spec = {
            "paths": {
                "/run": {
                    "post": {
                        "description": "Runs something",
                        "operationId": "run_task",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {"type": "object", "properties": {}}
                                }
                            }
                        },
                    }
                }
            }
        }
        result = _transform_openapi_to_openai(spec)
        assert result["function"]["description"] == "Runs something"

    def test_empty_description_when_none_provided(self):
        spec = {
            "paths": {
                "/run": {
                    "post": {
                        "operationId": "run_task",
                    }
                }
            }
        }
        result = _transform_openapi_to_openai(spec)
        assert result["function"]["description"] == ""

    def test_returns_none_for_no_operation_id(self):
        spec = {"paths": {"/run": {"post": {"summary": "No operationId"}}}}
        result = _transform_openapi_to_openai(spec)
        assert result is None

    def test_returns_none_for_empty_paths(self):
        spec = {"paths": {}}
        result = _transform_openapi_to_openai(spec)
        assert result is None

    def test_returns_none_for_missing_paths(self):
        result = _transform_openapi_to_openai({})
        assert result is None

    def test_default_parameters_when_no_request_body(self):
        spec = {
            "paths": {
                "/status": {
                    "get": {
                        "operationId": "get_status",
                        "summary": "Get status",
                    }
                }
            }
        }
        result = _transform_openapi_to_openai(spec)
        assert result["function"]["parameters"] == {
            "type": "object",
            "properties": {},
        }


class TestExtractParameters:
    def test_extracts_json_schema(self):
        operation = {
            "requestBody": {
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {"x": {"type": "integer"}},
                        }
                    }
                }
            }
        }
        result = _extract_parameters(operation)
        assert result == {
            "type": "object",
            "properties": {"x": {"type": "integer"}},
        }

    def test_returns_default_when_no_request_body(self):
        result = _extract_parameters({})
        assert result == {"type": "object", "properties": {}}

    def test_returns_default_when_no_json_content(self):
        operation = {
            "requestBody": {"content": {"text/plain": {"schema": {"type": "string"}}}}
        }
        result = _extract_parameters(operation)
        assert result == {"type": "object", "properties": {}}


class TestToolsWebModule:
    def _make_module(
        self, registry_tools: list[ToolDefinition]
    ) -> OpenAIToolsWebModule:
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
        registry_tools = [
            ToolDefinition(
                url="http://calc:8000/calculate",
                method="POST",
                openapi_spec=SAMPLE_OPENAPI_SPEC,
            )
        ]
        module = self._make_module(registry_tools)
        result = await module.get_tools()

        assert len(result["tools"]) == 1
        tool = result["tools"][0]
        assert tool["type"] == "function"
        assert tool["function"]["name"] == "calculate"
        assert tool["function"]["description"] == "Evaluate a math expression"
        assert "expression" in tool["function"]["parameters"]["properties"]

    @pytest.mark.asyncio
    async def test_skips_tools_without_operation_id(self):
        bad_spec = {"paths": {"/run": {"post": {"summary": "No operationId"}}}}
        registry_tools = [
            ToolDefinition(
                url="http://calc:8000/calculate",
                method="POST",
                openapi_spec=SAMPLE_OPENAPI_SPEC,
            ),
            ToolDefinition(
                url="http://bad:8000/run",
                method="POST",
                openapi_spec=bad_spec,
            ),
        ]
        module = self._make_module(registry_tools)
        result = await module.get_tools()

        assert len(result["tools"]) == 1
        assert result["tools"][0]["function"]["name"] == "calculate"

    @pytest.mark.asyncio
    async def test_multiple_tools_transformed(self):
        search_spec = {
            "openapi": "3.1.0",
            "info": {"title": "Search", "version": "1.0.0"},
            "paths": {
                "/search": {
                    "put": {
                        "summary": "Search the web",
                        "operationId": "web_search",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {"query": {"type": "string"}},
                                        "required": ["query"],
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }
        registry_tools = [
            ToolDefinition(
                url="http://calc:8000/calculate",
                method="POST",
                openapi_spec=SAMPLE_OPENAPI_SPEC,
            ),
            ToolDefinition(
                url="http://search:8000/search",
                method="PUT",
                openapi_spec=search_spec,
            ),
        ]
        module = self._make_module(registry_tools)
        result = await module.get_tools()

        assert len(result["tools"]) == 2
        names = [t["function"]["name"] for t in result["tools"]]
        assert "calculate" in names
        assert "web_search" in names
