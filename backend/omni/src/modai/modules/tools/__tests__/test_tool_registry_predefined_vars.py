from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition, ToolRegistryModule
from modai.modules.tools.tool_registry_predefined_vars import (
    PredefinedVariablesToolRegistryModule,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_tool(definition: ToolDefinition) -> Tool:
    class _StubTool(Tool):
        @property
        def definition(self) -> ToolDefinition:
            return definition

        async def run(self, params: dict[str, Any]) -> Any:
            return params

    return _StubTool()


def _make_capturing_tool(definition: ToolDefinition) -> tuple[Tool, list[dict]]:
    """Return a tool and a list that receives each run() params call."""
    calls: list[dict] = []

    class _CapturingTool(Tool):
        @property
        def definition(self) -> ToolDefinition:
            return definition

        async def run(self, params: dict[str, Any]) -> Any:
            calls.append(dict(params))
            return "ok"

    return _CapturingTool(), calls


def _stub_registry(*tools: Tool) -> ToolRegistryModule:
    """Build a mock ToolRegistryModule that returns the given tools."""
    registry = MagicMock(spec=ToolRegistryModule)
    registry.get_tools = AsyncMock(return_value=list(tools))

    async def _get_by_name(name: str, predefined_params=None) -> Tool | None:
        return next((t for t in tools if t.definition.name == name), None)

    registry.get_tool_by_name = _get_by_name
    return registry


def _make_module(inner: ToolRegistryModule) -> PredefinedVariablesToolRegistryModule:
    deps = ModuleDependencies({"delegate_registry": inner})
    return PredefinedVariablesToolRegistryModule(deps, {})


FULL_DEFINITION = ToolDefinition(
    name="get_user_order",
    description="Retrieve an order",
    parameters={
        "type": "object",
        "properties": {
            "user_id": {"type": "string", "description": "The user's ID"},
            "order_id": {"type": "integer", "description": "The order's ID"},
            "session_id": {"type": "string", "description": "Active session"},
        },
        "required": ["user_id", "order_id", "session_id"],
    },
)

SIMPLE_DEFINITION = ToolDefinition(
    name="calculate",
    description="Evaluate a math expression",
    parameters={
        "type": "object",
        "properties": {"expression": {"type": "string"}},
        "required": ["expression"],
    },
)


# ---------------------------------------------------------------------------
# get_tools: definition filtering
# ---------------------------------------------------------------------------


class TestGetToolsDefinitionFiltering:
    @pytest.mark.asyncio
    async def test_no_predefined_params_returns_full_definition(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools()

        assert len(result) == 1
        assert result[0].definition == FULL_DEFINITION

    @pytest.mark.asyncio
    async def test_predefined_param_stripped_from_properties(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(predefined_params={"_session_id": "abc"})

        assert len(result) == 1
        params = result[0].definition.parameters
        assert "session_id" not in params["properties"]
        assert "user_id" in params["properties"]
        assert "order_id" in params["properties"]

    @pytest.mark.asyncio
    async def test_predefined_param_stripped_from_required(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(predefined_params={"_session_id": "abc"})

        required = result[0].definition.parameters["required"]
        assert "session_id" not in required
        assert "user_id" in required
        assert "order_id" in required

    @pytest.mark.asyncio
    async def test_multiple_predefined_params_stripped(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(
            predefined_params={"_session_id": "s1", "_user_id": "u1"}
        )

        params = result[0].definition.parameters
        assert "session_id" not in params["properties"]
        assert "user_id" not in params["properties"]
        assert "order_id" in params["properties"]

    @pytest.mark.asyncio
    async def test_predefined_param_not_in_schema_leaves_definition_unchanged(self):
        tool = _make_tool(SIMPLE_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(predefined_params={"_session_id": "abc"})

        # session_id doesn't exist in the schema → tool is returned as-is (no wrapper)
        assert result[0].definition == SIMPLE_DEFINITION

    @pytest.mark.asyncio
    async def test_non_prefixed_predefined_key_is_ignored(self):
        """Keys without a leading _ are not treated as predefined variables."""
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(predefined_params={"session_id": "abc"})

        params = result[0].definition.parameters
        assert "session_id" in params["properties"]

    @pytest.mark.asyncio
    async def test_empty_predefined_params_returns_full_definition(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tools(predefined_params={})

        assert result[0].definition == FULL_DEFINITION

    @pytest.mark.asyncio
    async def test_multiple_tools_each_filtered(self):
        tool_a = _make_tool(FULL_DEFINITION)
        tool_b = _make_tool(SIMPLE_DEFINITION)
        module = _make_module(_stub_registry(tool_a, tool_b))

        result = await module.get_tools(predefined_params={"_session_id": "s1"})

        assert len(result) == 2
        # tool_a had session_id → stripped
        assert "session_id" not in result[0].definition.parameters["properties"]
        # tool_b had no session_id → unchanged
        assert result[1].definition == SIMPLE_DEFINITION


# ---------------------------------------------------------------------------
# get_tool_by_name
# ---------------------------------------------------------------------------


class TestGetToolByName:
    @pytest.mark.asyncio
    async def test_returns_filtered_tool_when_found(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tool_by_name(
            "get_user_order", predefined_params={"_session_id": "s1"}
        )

        assert result is not None
        assert "session_id" not in result.definition.parameters["properties"]

    @pytest.mark.asyncio
    async def test_returns_none_when_not_found(self):
        module = _make_module(_stub_registry())

        result = await module.get_tool_by_name(
            "nonexistent", predefined_params={"_session_id": "s1"}
        )

        assert result is None

    @pytest.mark.asyncio
    async def test_no_predefined_params_returns_full_definition(self):
        tool = _make_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tool_by_name("get_user_order")

        assert result is not None
        assert result.definition == FULL_DEFINITION


# ---------------------------------------------------------------------------
# run() — predefined variable translation
# ---------------------------------------------------------------------------


class TestRunTranslation:
    @pytest.mark.asyncio
    async def test_predefined_key_translated_to_unprefixed_before_inner_run(self):
        inner_tool, calls = _make_capturing_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(inner_tool))

        wrapped = await module.get_tool_by_name(
            "get_user_order", predefined_params={"_session_id": "session-xyz"}
        )
        assert wrapped is not None

        await wrapped.run(
            {"user_id": "alice", "order_id": 7, "_session_id": "session-xyz"}
        )

        assert len(calls) == 1
        assert calls[0]["session_id"] == "session-xyz"
        assert "_session_id" not in calls[0]

    @pytest.mark.asyncio
    async def test_non_predefined_params_passed_through_unchanged(self):
        inner_tool, calls = _make_capturing_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(inner_tool))

        wrapped = await module.get_tool_by_name(
            "get_user_order", predefined_params={"_session_id": "s1"}
        )
        assert wrapped is not None

        await wrapped.run({"user_id": "alice", "order_id": 7, "_session_id": "s1"})

        assert calls[0]["user_id"] == "alice"
        assert calls[0]["order_id"] == 7

    @pytest.mark.asyncio
    async def test_bearer_token_not_in_schema_stays_prefixed(self):
        """_bearer_token is a reserved key not found in the schema — it must
        remain as _bearer_token so the inner tool (e.g. _OpenAPITool) can
        handle it for the Authorization header."""
        inner_tool, calls = _make_capturing_tool(FULL_DEFINITION)
        module = _make_module(_stub_registry(inner_tool))

        # _bearer_token is NOT in the schema, so it is NOT a hidden property
        wrapped = await module.get_tool_by_name(
            "get_user_order",
            predefined_params={"_session_id": "s1", "_bearer_token": "tok"},
        )
        assert wrapped is not None

        await wrapped.run(
            {
                "user_id": "alice",
                "order_id": 7,
                "_session_id": "s1",
                "_bearer_token": "tok",
            }
        )

        # _bearer_token was not in schema so it is not translated
        assert "_bearer_token" in calls[0]
        assert "bearer_token" not in calls[0]

    @pytest.mark.asyncio
    async def test_tool_not_requiring_wrapping_is_returned_directly(self):
        """When predefined params have no overlap with the schema, the original
        tool object is returned without a wrapper."""
        tool = _make_tool(SIMPLE_DEFINITION)
        module = _make_module(_stub_registry(tool))

        result = await module.get_tool_by_name(
            "calculate", predefined_params={"_session_id": "s1"}
        )

        # Same object — no wrapper was needed
        assert result is tool
