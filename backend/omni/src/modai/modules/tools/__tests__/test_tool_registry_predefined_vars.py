from typing import Any
from unittest.mock import ANY, AsyncMock, MagicMock

import pytest
from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolRegistryModule
from modai.modules.tools.tool_registry_predefined_vars import (
    PredefinedVariablesToolRegistryModule,
    _extract_predefined_params,
)


def _request(headers: dict[str, str] | None = None) -> Request:
    raw_headers = [
        (name.lower().encode("latin-1"), value.encode("latin-1"))
        for name, value in (headers or {}).items()
    ]
    scope: dict[str, Any] = {
        "type": "http",
        "method": "GET",
        "path": "/api/tools",
        "headers": raw_headers,
    }
    return Request(scope)


FULL_TOOL = {
    "type": "function",
    "name": "get_user_order",
    "description": "Retrieve an order",
    "parameters": {
        "type": "object",
        "properties": {
            "user_id": {"type": "string"},
            "session_id": {"type": "string"},
            "X-Session-Id": {"type": "string"},
        },
        "required": ["user_id", "session_id", "X-Session-Id"],
    },
    "strict": True,
}


def _make_module(
    inner_get_tools: AsyncMock,
    inner_run_tool: AsyncMock,
    variable_mappings: dict[str, str] | None = None,
) -> PredefinedVariablesToolRegistryModule:
    inner = MagicMock(spec=ToolRegistryModule)
    inner.get_tools = inner_get_tools
    inner.run_tool = inner_run_tool

    deps = ModuleDependencies({"delegate_registry": inner})
    config: dict[str, Any] = {}
    if variable_mappings:
        config["variable_mappings"] = variable_mappings
    return PredefinedVariablesToolRegistryModule(deps, config)


class TestExtractPredefinedParams:
    def test_extracts_header_values_with_underscore_prefix(self):
        params = _extract_predefined_params(
            _request({"Authorization": "Bearer abc", "X-Session-Id": "sid-1"})
        )
        assert params == {
            "_authorization": "Bearer abc",
            "_x_session_id": "sid-1",
        }


class TestGetTools:
    @pytest.mark.asyncio
    async def test_hides_schema_properties_that_are_predefined(self):
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=AsyncMock(),
        )

        result = await module.get_tools(_request({"Session-Id": "sid-1"}))

        assert len(result) == 1
        props = result[0]["parameters"]["properties"]
        assert "session_id" not in props
        assert "user_id" in props

    @pytest.mark.asyncio
    async def test_hides_mapped_property_from_definition(self):
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=AsyncMock(),
            variable_mappings={"X-Session-Id": "x_session_id"},
        )

        result = await module.get_tools(_request({"X-Session-Id": "sid-1"}))

        props = result[0]["parameters"]["properties"]
        assert "X-Session-Id" not in props


class TestRunTool:
    @pytest.mark.asyncio
    async def test_injects_predefined_values_into_arguments(self):
        inner_run_tool = AsyncMock(return_value="ok")
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=inner_run_tool,
        )

        await module.run_tool(
            _request({"Session-Id": "sid-1"}),
            {
                "name": "get_user_order",
                "arguments": {"user_id": "alice"},
            },
        )

        inner_run_tool.assert_awaited_once_with(
            ANY,
            {
                "name": "get_user_order",
                "arguments": {"user_id": "alice", "session_id": "sid-1"},
            },
        )

    @pytest.mark.asyncio
    async def test_mapped_injection_uses_configured_tool_param_name(self):
        inner_run_tool = AsyncMock(return_value="ok")
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=inner_run_tool,
            variable_mappings={"X-Session-Id": "x_session_id"},
        )

        await module.run_tool(
            _request({"X-Session-Id": "sid-1"}),
            {
                "name": "get_user_order",
                "arguments": {"user_id": "alice"},
            },
        )

        inner_run_tool.assert_awaited_once_with(
            ANY,
            {
                "name": "get_user_order",
                "arguments": {"user_id": "alice", "X-Session-Id": "sid-1"},
            },
        )

    @pytest.mark.asyncio
    async def test_unknown_tool_raises(self):
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[]),
            inner_run_tool=AsyncMock(),
        )

        with pytest.raises(ValueError, match="not found"):
            await module.run_tool(_request(), {"name": "missing", "arguments": {}})
