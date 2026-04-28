from typing import Any
from unittest.mock import AsyncMock, MagicMock

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
            "x_session_id": {"type": "string"},
            "X-Session-Id": {"type": "string"},
        },
        "required": ["user_id", "session_id", "x_session_id", "X-Session-Id"],
    },
    "strict": True,
}


def _make_module(
    inner_get_tools: AsyncMock,
    inner_run_tool: AsyncMock,
    variable_mappings: list[dict[str, str]] | None = None,
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
    def test_stores_both_hyphen_and_underscore_forms(self):
        params = _extract_predefined_params(
            _request({"X-Session-Id": "sid-1", "X-User-Id": "uid-1"})
        )
        assert params == {
            "x-session-id": "sid-1",
            "x_session_id": "sid-1",
            "x-user-id": "uid-1",
            "x_user_id": "uid-1",
        }

    def test_explicit_mapping_adds_target_param_name(self):
        params = _extract_predefined_params(
            _request({"X-Session-Id": "sid-1"}),
            variable_mappings=[
                {"from_modai_header": "X-Session-Id", "to_tool_parameter": "session_id"}
            ],
        )
        assert params["session_id"] == "sid-1"


class TestGetTools:
    @pytest.mark.asyncio
    async def test_auto_hides_predefined_vars_form_parameter(self):
        """Header X-Session-Id auto-fills tool param x_session_id without config."""
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=AsyncMock(),
        )

        result = await module.get_tools(_request({"X-Session-Id": "sid-1"}))

        props = result[0]["parameters"]["properties"]
        assert "x_session_id" not in props
        assert "X-Session-Id" not in props
        assert "session_id" in props
        assert "user_id" in props

    @pytest.mark.asyncio
    async def test_explicit_mapping_hides_target_parameter(self):
        """Explicit mapping hides the mapped param in addition to auto-matched forms."""
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=AsyncMock(),
            variable_mappings=[
                {"from_modai_header": "X-Session-Id", "to_tool_parameter": "session_id"}
            ],
        )

        result = await module.get_tools(_request({"X-Session-Id": "sid-1"}))

        props = result[0]["parameters"]["properties"]
        # explicit mapping target is hidden
        assert "session_id" not in props
        # auto-matched forms are still hidden
        assert "x_session_id" not in props
        assert "X-Session-Id" not in props
        assert "user_id" in props


class TestRunTool:
    @pytest.mark.asyncio
    async def test_auto_injects_underscore_form_parameter(self):
        """Header X-Session-Id is injected as x_session_id without explicit config."""
        inner_run_tool = AsyncMock(return_value="ok")
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=inner_run_tool,
        )

        await module.run_tool(
            _request({"X-Session-Id": "sid-1"}),
            {"name": "get_user_order", "arguments": {"user_id": "alice"}},
        )

        call_args = inner_run_tool.call_args[0][1]
        assert call_args["arguments"]["x_session_id"] == "sid-1"

    @pytest.mark.asyncio
    async def test_auto_injects_header_style_parameter(self):
        """Header X-Session-Id is also injected as X-Session-Id without explicit config."""
        inner_run_tool = AsyncMock(return_value="ok")
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=inner_run_tool,
        )

        await module.run_tool(
            _request({"X-Session-Id": "sid-1"}),
            {"name": "get_user_order", "arguments": {"user_id": "alice"}},
        )

        call_args = inner_run_tool.call_args[0][1]
        assert call_args["arguments"]["X-Session-Id"] == "sid-1"

    @pytest.mark.asyncio
    async def test_explicit_mapping_injects_target_parameter(self):
        """Explicit mapping fills the specified tool param alongside auto-matched ones."""
        inner_run_tool = AsyncMock(return_value="ok")
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[FULL_TOOL]),
            inner_run_tool=inner_run_tool,
            variable_mappings=[
                {"from_modai_header": "X-Session-Id", "to_tool_parameter": "session_id"}
            ],
        )

        await module.run_tool(
            _request({"X-Session-Id": "sid-1"}),
            {"name": "get_user_order", "arguments": {"user_id": "alice"}},
        )

        call_args = inner_run_tool.call_args[0][1]
        # explicit mapping target is injected
        assert call_args["arguments"]["session_id"] == "sid-1"
        # auto-matched forms are also still injected
        assert call_args["arguments"]["x_session_id"] == "sid-1"
        assert call_args["arguments"]["X-Session-Id"] == "sid-1"

    @pytest.mark.asyncio
    async def test_unknown_tool_raises(self):
        module = _make_module(
            inner_get_tools=AsyncMock(return_value=[]),
            inner_run_tool=AsyncMock(),
        )

        with pytest.raises(ValueError, match="not found"):
            await module.run_tool(_request(), {"name": "missing", "arguments": {}})
