from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolRegistryModule
from modai.modules.tools.tool_router import ToolsRouterModule


class _RegistryStub(ToolRegistryModule):
    def __init__(
        self,
        get_tools_result: list[dict[str, Any]],
        run_tool_result: Any,
    ):
        super().__init__(ModuleDependencies(), {})
        self._get_tools_result = get_tools_result
        self._run_tool_mock = AsyncMock(return_value=run_tool_result)

    async def get_tools(self, request: Request) -> list[dict[str, Any]]:
        del request
        return self._get_tools_result

    async def run_tool(self, request: Request, params: dict[str, Any]) -> Any:
        return await self._run_tool_mock(request, params)


def _request() -> Request:
    scope: dict[str, Any] = {
        "type": "http",
        "method": "GET",
        "path": "/api/tools",
        "headers": [],
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_aggregates_tool_names_without_prefix():
    registry_a = _RegistryStub(
        get_tools_result=[
            {
                "type": "function",
                "name": "calculate",
                "parameters": {"type": "object", "properties": {}},
                "strict": True,
            }
        ],
        run_tool_result="a",
    )
    registry_b = _RegistryStub(
        get_tools_result=[
            {
                "type": "function",
                "name": "search",
                "parameters": {"type": "object", "properties": {}},
                "strict": True,
            }
        ],
        run_tool_result="b",
    )

    module = ToolsRouterModule(
        ModuleDependencies(
            {
                "registry_a": registry_a,
                "registry_b": registry_b,
            }
        ),
        {},
    )

    tools = await module.get_tools(_request())

    assert [tool["name"] for tool in tools] == ["calculate", "search"]


@pytest.mark.asyncio
async def test_dispatches_to_registry_that_exposes_tool_name():
    registry = _RegistryStub(
        get_tools_result=[
            {
                "type": "function",
                "name": "calculate",
                "parameters": {"type": "object", "properties": {}},
                "strict": True,
            }
        ],
        run_tool_result='{"ok": true}',
    )
    module = ToolsRouterModule(
        ModuleDependencies({"openapi": registry}),
        {},
    )

    request = _request()
    result = await module.run_tool(
        request,
        {
            "name": "calculate",
            "arguments": {"expression": "1+1"},
        },
    )

    assert result == '{"ok": true}'
    registry._run_tool_mock.assert_awaited_once_with(
        request,
        {
            "name": "calculate",
            "arguments": {"expression": "1+1"},
        },
    )


@pytest.mark.asyncio
async def test_raises_when_tool_name_is_not_found():
    registry = _RegistryStub(
        get_tools_result=[],
        run_tool_result="ok",
    )
    module = ToolsRouterModule(
        ModuleDependencies({"registry": registry}),
        {},
    )

    with pytest.raises(ValueError, match="not found"):
        await module.run_tool(_request(), {"name": "calculate", "arguments": {}})


@pytest.mark.asyncio
async def test_raises_when_tool_name_is_ambiguous():
    registry_a = _RegistryStub(
        get_tools_result=[
            {
                "type": "function",
                "name": "calculate",
                "parameters": {"type": "object", "properties": {}},
                "strict": True,
            }
        ],
        run_tool_result="a",
    )
    registry_b = _RegistryStub(
        get_tools_result=[
            {
                "type": "function",
                "name": "calculate",
                "parameters": {"type": "object", "properties": {}},
                "strict": True,
            }
        ],
        run_tool_result="b",
    )
    module = ToolsRouterModule(
        ModuleDependencies({"a": registry_a, "b": registry_b}),
        {},
    )

    with pytest.raises(ValueError, match="multiple registries"):
        await module.run_tool(_request(), {"name": "calculate", "arguments": {}})
