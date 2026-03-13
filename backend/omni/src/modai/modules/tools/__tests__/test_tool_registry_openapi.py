from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from modai.module import ModuleDependencies
from modai.modules.tools.module import Tool, ToolDefinition
from modai.modules.tools.tool_registry_openapi import (
    OpenAPIToolRegistryModule,
    _build_tool_definition,
    _derive_base_url,
    _fetch_openapi_spec,
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
    def _make_module(self, tools: list[dict]) -> OpenAPIToolRegistryModule:
        deps = ModuleDependencies()
        config = {"tools": tools}
        return OpenAPIToolRegistryModule(deps, config)

    @pytest.mark.asyncio
    async def test_get_tools_empty_config(self):
        module = self._make_module([])
        result = await module.get_tools()
        assert result == []

    @pytest.mark.asyncio
    async def test_get_tools_returns_tools_from_all_services(self):
        module = self._make_module(
            [
                {"url": "http://calc:8000/calculate", "method": "POST"},
                {"url": "http://search:8000/search", "method": "PUT"},
            ]
        )

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

        async def mock_get(url, **kwargs):
            if "calc" in url:
                resp = MagicMock()
                resp.raise_for_status = lambda: None
                resp.json.return_value = SAMPLE_OPENAPI_SPEC
                return resp
            resp = MagicMock()
            resp.raise_for_status = lambda: None
            resp.json.return_value = search_spec
            return resp

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert len(result) == 2
        assert isinstance(result[0], Tool)
        assert isinstance(result[1], Tool)
        names = {tool.definition.name for tool in result}
        assert names == {"calculate", "web_search"}

    @pytest.mark.asyncio
    async def test_tool_definition_extracted_from_spec(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}]
        )

        mock_response = MagicMock()
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        async def mock_get(url, **kwargs):
            return mock_response

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert len(result) == 1
        definition = result[0].definition
        assert definition.name == "calculate"
        assert definition.description == "Evaluate a math expression"
        assert "expression" in definition.parameters["properties"]

    @pytest.mark.asyncio
    async def test_get_tools_skips_unavailable_service(self):
        module = self._make_module(
            [
                {"url": "http://good:8000/run", "method": "POST"},
                {"url": "http://bad:8000/run", "method": "POST"},
            ]
        )

        mock_response_good = MagicMock()
        mock_response_good.raise_for_status = lambda: None
        mock_response_good.json.return_value = SAMPLE_OPENAPI_SPEC

        async def mock_get(url, **kwargs):
            if "bad" in url:
                raise httpx.ConnectError("Connection refused")
            return mock_response_good

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert len(result) == 1
        assert result[0].definition.name == "calculate"

    @pytest.mark.asyncio
    async def test_get_tools_skips_spec_without_operation_id(self):
        module = self._make_module([{"url": "http://tool:8000/run", "method": "POST"}])

        no_op_spec = {"paths": {"/run": {"post": {"summary": "No operationId"}}}}

        mock_response = MagicMock()
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = no_op_spec

        async def mock_get(url, **kwargs):
            return mock_response

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

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

    def _make_module(self, tools: list[dict]) -> OpenAPIToolRegistryModule:
        deps = ModuleDependencies()
        return OpenAPIToolRegistryModule(deps, {"tools": tools})

    @pytest.mark.asyncio
    async def test_run_makes_http_request_to_tool_endpoint(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}]
        )

        fetch_response = MagicMock()
        fetch_response.raise_for_status = lambda: None
        fetch_response.json.return_value = SAMPLE_OPENAPI_SPEC

        run_response = MagicMock()
        run_response.raise_for_status = lambda: None
        run_response.text = '{"result": 42}'

        async def mock_get(url, **kwargs):
            return fetch_response

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            tools = await module.get_tools()

        assert len(tools) == 1
        tool = tools[0]

        mock_run_client = AsyncMock()
        mock_run_client.request = AsyncMock(return_value=run_response)
        mock_run_client.__aenter__ = AsyncMock(return_value=mock_run_client)
        mock_run_client.__aexit__ = AsyncMock(return_value=False)

        with patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient",
            return_value=mock_run_client,
        ):
            result = await tool.run({"expression": "6*7"})

        mock_run_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/calculate",
            json={"expression": "6*7"},
        )
        assert result == '{"result": 42}'


class TestFetchOpenapiSpec:
    @pytest.mark.asyncio
    async def test_success(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        client = AsyncMock()
        client.get = AsyncMock(return_value=mock_response)

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result == SAMPLE_OPENAPI_SPEC
        client.get.assert_called_once_with("http://tool:8000/openapi.json")

    @pytest.mark.asyncio
    async def test_strips_trailing_slash(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        client = AsyncMock()
        client.get = AsyncMock(return_value=mock_response)

        await _fetch_openapi_spec(client, "http://tool:8000/")
        client.get.assert_called_once_with("http://tool:8000/openapi.json")

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
        client.get = AsyncMock(return_value=mock_response)

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result is None

    @pytest.mark.asyncio
    async def test_connection_error_returns_none(self):
        client = AsyncMock()
        client.get = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

        result = await _fetch_openapi_spec(client, "http://tool:8000")
        assert result is None

    @pytest.mark.asyncio
    async def test_unexpected_error_returns_none(self):
        client = AsyncMock()
        client.get = AsyncMock(side_effect=RuntimeError("something went wrong"))

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
    def _make_module(self, tools: list[dict]) -> OpenAPIToolRegistryModule:
        deps = ModuleDependencies()
        config = {"tools": tools}
        return OpenAPIToolRegistryModule(deps, config)

    def _mock_httpx(self, spec_map: dict[str, dict]):
        mock_responses = {}
        for key, spec in spec_map.items():
            resp = MagicMock()
            resp.status_code = 200
            resp.raise_for_status = lambda: None
            resp.json.return_value = spec
            mock_responses[key] = resp

        async def mock_get(url, **kwargs):
            for key, resp in mock_responses.items():
                if key in url:
                    return resp
            raise httpx.ConnectError("No mock for " + url)

        mock_client_cls = patch(
            "modai.modules.tools.tool_registry_openapi.httpx.AsyncClient"
        )
        return mock_client_cls, mock_get

    @pytest.mark.asyncio
    async def test_finds_tool_by_name(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}]
        )

        mock_client_cls, mock_get = self._mock_httpx({"calc": SAMPLE_OPENAPI_SPEC})
        with mock_client_cls as cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            cls.return_value = mock_client

            result = await module.get_tool_by_name("calculate")

        assert result is not None
        assert isinstance(result, Tool)
        assert result.definition.name == "calculate"
        assert result.definition.description == "Evaluate a math expression"

    @pytest.mark.asyncio
    async def test_returns_none_for_unknown_name(self):
        module = self._make_module(
            [{"url": "http://calc:8000/calculate", "method": "POST"}]
        )

        mock_client_cls, mock_get = self._mock_httpx({"calc": SAMPLE_OPENAPI_SPEC})
        with mock_client_cls as cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            cls.return_value = mock_client

            result = await module.get_tool_by_name("nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_returns_none_for_empty_registry(self):
        module = self._make_module([])
        result = await module.get_tool_by_name("calculate")
        assert result is None
