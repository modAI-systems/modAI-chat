from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from modai.module import ModuleDependencies
from modai.modules.http_client.module import HttpClientModule
from modai.modules.tools.module import Tool, ToolDefinition
from modai.modules.tools.tool_registry_openapi import (
    OpenAPIToolRegistryModule,
    _build_tool_definition,
    _derive_base_url,
    _fetch_openapi_spec,
)


class _StubHttpClientFactory(HttpClientModule):
    """Test factory that yields clients in sequence; reuses the last one when exhausted."""

    def __init__(self, *clients: httpx.AsyncClient):
        super().__init__(ModuleDependencies(), {})
        self._clients = list(clients)
        self._index = 0

    def new(self, timeout: float) -> Any:
        @asynccontextmanager
        async def _ctx():
            idx = min(self._index, len(self._clients) - 1)
            self._index += 1
            yield self._clients[idx]

        return _ctx()


def _mock_response(spec: dict | None = None, text: str = "") -> MagicMock:
    """Build a minimal mock httpx response."""
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    if spec is not None:
        resp.json.return_value = spec
    resp.text = text
    return resp


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
                                "properties": {"expression": {"type": "string"}},
                                "required": ["expression"],
                            }
                        }
                    },
                },
            }
        }
    },
}

DICE_ROLLER_SPEC = {
    "openapi": "3.1.0",
    "info": {"title": "Dice Roller Tool", "version": "1.0.0"},
    "paths": {
        "/roll": {
            "post": {
                "summary": "Roll dice and return the results",
                "operationId": "roll_dice",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/DiceRequest"}
                        }
                    },
                },
            }
        }
    },
    "components": {
        "schemas": {
            "DiceRequest": {
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "default": 1,
                        "description": "Number of dice to roll",
                    },
                    "sides": {
                        "type": "integer",
                        "default": 6,
                        "description": "Number of sides per die",
                    },
                },
            }
        }
    },
}


class TestBuildToolDefinition:
    def test_openapi_with_inline_schema(self):
        assert _build_tool_definition(SAMPLE_OPENAPI_SPEC) == ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
        )

    def test_openapi_with_ref_schema(self):
        assert _build_tool_definition(DICE_ROLLER_SPEC) == ToolDefinition(
            name="roll_dice",
            description="Roll dice and return the results",
            parameters={
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "default": 1,
                        "description": "Number of dice to roll",
                    },
                    "sides": {
                        "type": "integer",
                        "default": 6,
                        "description": "Number of sides per die",
                    },
                },
            },
        )


class TestOpenAPIToolRegistryModule:
    def _make_module(
        self, tools: list[dict], factory=None
    ) -> OpenAPIToolRegistryModule:
        if factory is None:
            # Provide a factory that yields a no-op async client by default
            factory = _StubHttpClientFactory(AsyncMock())
        deps = ModuleDependencies({"http_client": factory})
        return OpenAPIToolRegistryModule(deps, {"tools": tools})

    @pytest.mark.asyncio
    async def test_get_tools_empty_config(self):
        module = self._make_module([])
        result = await module.get_tools()
        assert result == []

    @pytest.mark.asyncio
    async def test_get_tools_returns_tools_from_all_services(self):
        search_spec = {
            **SAMPLE_OPENAPI_SPEC,
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
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }

        async def mock_request(method, url, **kwargs):
            if "calc" in url:
                return _mock_response(spec=SAMPLE_OPENAPI_SPEC)
            return _mock_response(spec=search_spec)

        mock_client = AsyncMock()
        mock_client.request = mock_request
        module = self._make_module(
            [
                {"url": "http://calc:8000/calculate", "method": "POST"},
                {"url": "http://search:8000/search", "method": "PUT"},
            ],
            factory=_StubHttpClientFactory(mock_client),
        )

        result = await module.get_tools()

        assert len(result) == 2
        assert isinstance(result[0], Tool)
        assert isinstance(result[1], Tool)
        names = {tool.definition.name for tool in result}
        assert names == {"calculate", "web_search"}

    @pytest.mark.asyncio
    async def test_tool_definition_extracted_from_spec(self):
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}],
            factory=_StubHttpClientFactory(mock_client),
        )

        result = await module.get_tools()

        assert len(result) == 1
        definition = result[0].definition
        assert definition.name == "calculate"
        assert definition.description == "Evaluate a math expression"
        assert "expression" in definition.parameters["properties"]

    @pytest.mark.asyncio
    async def test_get_tools_skips_unavailable_service(self):
        async def mock_request(method, url, **kwargs):
            if "bad" in url:
                raise httpx.ConnectError("Connection refused")
            return _mock_response(spec=SAMPLE_OPENAPI_SPEC)

        mock_client = AsyncMock()
        mock_client.request = mock_request
        module = self._make_module(
            [
                {"url": "http://good:8000/run", "method": "POST"},
                {"url": "http://bad:8000/run", "method": "POST"},
            ],
            factory=_StubHttpClientFactory(mock_client),
        )

        result = await module.get_tools()

        assert len(result) == 1
        assert result[0].definition.name == "calculate"

    @pytest.mark.asyncio
    async def test_get_tools_skips_spec_without_operation_id(self):
        no_op_spec = {"paths": {"/run": {"post": {"summary": "No operationId"}}}}
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=_mock_response(spec=no_op_spec))
        module = self._make_module(
            [{"url": "http://tool:8000/run", "method": "POST"}],
            factory=_StubHttpClientFactory(mock_client),
        )

        result = await module.get_tools()

        assert result == []

    def test_has_no_router(self):
        module = self._make_module([])
        assert not hasattr(module, "router")

    def test_stores_tool_services_from_config(self):
        tools = [
            {"url": "http://a:8000/run", "method": "POST"},
            {"url": "http://b:9000/exec", "method": "PUT"},
        ]
        module = self._make_module(tools)
        assert module.tool_services == tools

    def test_defaults_to_empty_tools_list(self):
        deps = ModuleDependencies()
        module = OpenAPIToolRegistryModule(deps, {})
        assert module.tool_services == []


class TestToolRun:
    """Tool.run invokes the tool microservice over HTTP."""

    def _make_module(
        self, tools: list[dict], factory=None
    ) -> OpenAPIToolRegistryModule:
        if factory is None:
            factory = _StubHttpClientFactory(AsyncMock())
        deps = ModuleDependencies({"http_client": factory})
        return OpenAPIToolRegistryModule(deps, {"tools": tools})

    @pytest.mark.asyncio
    async def test_run_makes_http_request_to_tool_endpoint(self):
        spec_client = AsyncMock()
        spec_client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )

        run_response = _mock_response(text='{"result": 42}')
        run_client = AsyncMock()
        run_client.request = AsyncMock(return_value=run_response)

        # factory yields spec_client on first new() call, run_client on second
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}],
            factory=_StubHttpClientFactory(spec_client, run_client),
        )

        tools = await module.get_tools()
        assert len(tools) == 1

        result = await tools[0].run({"expression": "6*7"})

        run_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/calculate",
            json={"expression": "6*7"},
            headers={},
        )
        assert result == '{"result": 42}'

    @pytest.mark.asyncio
    async def test_run_forwards_bearer_token_as_authorization_header(self):
        """When _bearer_token is in params it becomes Authorization: Bearer <token>."""
        spec_client = AsyncMock()
        spec_client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )

        run_response = _mock_response(text='{"result": 42}')
        run_client = AsyncMock()
        run_client.request = AsyncMock(return_value=run_response)

        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}],
            factory=_StubHttpClientFactory(spec_client, run_client),
        )

        tools = await module.get_tools()
        await tools[0].run({"expression": "2+2", "_bearer_token": "secret"})

        run_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/calculate",
            json={"expression": "2+2"},
            headers={"Authorization": "Bearer secret"},
        )


class TestFetchOpenapiSpec:
    @pytest.mark.asyncio
    async def test_success(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        client = AsyncMock()
        client.request = AsyncMock(return_value=mock_response)

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result == SAMPLE_OPENAPI_SPEC
        client.request.assert_called_once_with("GET", "http://tool:8000/openapi.json")

    @pytest.mark.asyncio
    async def test_strips_trailing_slash(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        client = AsyncMock()
        client.request = AsyncMock(return_value=mock_response)

        await _fetch_openapi_spec(client, "http://tool:8000/")
        client.request.assert_called_once_with("GET", "http://tool:8000/openapi.json")

    @pytest.mark.asyncio
    async def test_http_error_returns_none(self):
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Server Error",
            request=httpx.Request("GET", "http://tool:8000/openapi.json"),
            response=mock_response,
        )

        client = AsyncMock()
        client.request = AsyncMock(return_value=mock_response)

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result is None

    @pytest.mark.asyncio
    async def test_connection_error_returns_none(self):
        client = AsyncMock()
        client.request = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result is None

    @pytest.mark.asyncio
    async def test_unexpected_error_returns_none(self):
        client = AsyncMock()
        client.request = AsyncMock(side_effect=RuntimeError("something went wrong"))

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result is None


class TestDeriveBaseUrl:
    def test_strips_path(self):
        assert _derive_base_url("http://calc:8000/calculate") == "http://calc:8000"

    def test_strips_nested_path(self):
        assert _derive_base_url("http://host:9000/api/v1/run") == "http://host:9000"

    def test_no_path(self):
        assert _derive_base_url("http://tool:8000") == "http://tool:8000"

    def test_trailing_slash(self):
        assert _derive_base_url("http://tool:8000/") == "http://tool:8000"


class TestGetToolByName:
    def _make_module(
        self, tools: list[dict], factory=None
    ) -> OpenAPIToolRegistryModule:
        if factory is None:
            factory = _StubHttpClientFactory(AsyncMock())
        deps = ModuleDependencies({"http_client": factory})
        return OpenAPIToolRegistryModule(deps, {"tools": tools})

    def _make_spec_factory(self, spec_map: dict[str, dict]):
        """Build an HttpClientFactory whose client dispatches by URL key."""

        async def mock_request(method, url, **kwargs):
            for key, spec in spec_map.items():
                if key in url:
                    return _mock_response(spec=spec)
            raise httpx.ConnectError("No mock for " + url)

        mock_client = AsyncMock()
        mock_client.request = mock_request
        return _StubHttpClientFactory(mock_client)

    @pytest.mark.asyncio
    async def test_finds_tool_by_name(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}],
            factory=self._make_spec_factory({"calc": SAMPLE_OPENAPI_SPEC}),
        )

        result = await module.get_tool_by_name("calculate")

        assert result is not None
        assert isinstance(result, Tool)
        assert result.definition.name == "calculate"
        assert result.definition.description == "Evaluate a math expression"

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_name(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}],
            factory=self._make_spec_factory({"calc": SAMPLE_OPENAPI_SPEC}),
        )

        result = await module.get_tool_by_name("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_for_empty_registry(self):
        module = self._make_module([])
        result = await module.get_tool_by_name("calculate")
        assert result is None
