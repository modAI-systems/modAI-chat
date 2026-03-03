from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from modai.module import ModuleDependencies
from modai.modules.tools.module import ToolDefinition
from modai.modules.tools.tool_registry import (
    HttpToolRegistryModule,
    _derive_base_url,
    _extract_operation_id,
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


class TestHttpToolRegistryModule:
    def _make_module(self, tools: list[dict]) -> HttpToolRegistryModule:
        deps = ModuleDependencies()
        config = {"tools": tools}
        return HttpToolRegistryModule(deps, config)

    @pytest.mark.asyncio
    async def test_get_tools_empty_config(self):
        module = self._make_module([])
        result = await module.get_tools()
        assert result == []

    @pytest.mark.asyncio
    async def test_get_tools_returns_specs_from_all_services(self):
        module = self._make_module(
            [
                {"url": "http://calc:8000/calculate", "method": "POST"},
                {"url": "http://search:8000/search", "method": "PUT"},
            ]
        )

        spec_a = {**SAMPLE_OPENAPI_SPEC, "info": {"title": "Calc", "version": "1.0.0"}}
        spec_b = {
            **SAMPLE_OPENAPI_SPEC,
            "info": {"title": "Search", "version": "1.0.0"},
        }

        mock_response_a = MagicMock()
        mock_response_a.status_code = 200
        mock_response_a.raise_for_status = lambda: None
        mock_response_a.json.return_value = spec_a

        mock_response_b = MagicMock()
        mock_response_b.status_code = 200
        mock_response_b.raise_for_status = lambda: None
        mock_response_b.json.return_value = spec_b

        async def mock_get(url, **kwargs):
            if "calc" in url:
                return mock_response_a
            return mock_response_b

        with patch(
            "modai.modules.tools.tool_registry.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert len(result) == 2
        assert result[0].url == "http://calc:8000/calculate"
        assert result[0].method == "POST"
        assert result[0].openapi_spec["info"]["title"] == "Calc"
        assert result[1].url == "http://search:8000/search"
        assert result[1].method == "PUT"
        assert result[1].openapi_spec["info"]["title"] == "Search"

    @pytest.mark.asyncio
    async def test_get_tools_skips_unavailable_service(self):
        module = self._make_module(
            [
                {"url": "http://good:8000/run", "method": "POST"},
                {"url": "http://bad:8000/run", "method": "POST"},
            ]
        )

        mock_response_good = MagicMock()
        mock_response_good.status_code = 200
        mock_response_good.raise_for_status = lambda: None
        mock_response_good.json.return_value = SAMPLE_OPENAPI_SPEC

        async def mock_get(url, **kwargs):
            if "bad" in url:
                raise httpx.ConnectError("Connection refused")
            return mock_response_good

        with patch(
            "modai.modules.tools.tool_registry.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert len(result) == 1
        assert result[0].url == "http://good:8000/run"

    @pytest.mark.asyncio
    async def test_specs_are_returned_unmodified(self):
        module = self._make_module([{"url": "http://tool:8000/run", "method": "PUT"}])

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = lambda: None
        mock_response.json.return_value = SAMPLE_OPENAPI_SPEC

        async def mock_get(url, **kwargs):
            return mock_response

        with patch(
            "modai.modules.tools.tool_registry.httpx.AsyncClient"
        ) as mock_client_cls:
            mock_client = AsyncMock()
            mock_client.get = mock_get
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_client

            result = await module.get_tools()

        assert result[0].openapi_spec == SAMPLE_OPENAPI_SPEC

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
        module = HttpToolRegistryModule(deps, {})
        assert module.tool_services == []


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


class TestExtractOperationId:
    def test_extracts_from_valid_spec(self):
        assert _extract_operation_id(SAMPLE_OPENAPI_SPEC) == "calculate"

    def test_returns_none_for_empty_paths(self):
        assert _extract_operation_id({"paths": {}}) is None

    def test_returns_none_for_missing_paths(self):
        assert _extract_operation_id({}) is None

    def test_returns_none_for_no_operation_id(self):
        spec = {"paths": {"/run": {"post": {"summary": "No operationId here"}}}}
        assert _extract_operation_id(spec) is None

    def test_skips_non_dict_entries(self):
        spec = {
            "paths": {
                "/run": {
                    "parameters": [{"name": "x"}],
                    "post": {"operationId": "run_it", "summary": "Run"},
                }
            }
        }
        assert _extract_operation_id(spec) == "run_it"


class TestGetToolByName:
    def _make_module(self, tools: list[dict]) -> HttpToolRegistryModule:
        deps = ModuleDependencies()
        config = {"tools": tools}
        return HttpToolRegistryModule(deps, config)

    def _mock_httpx(self, spec_map: dict[str, dict]):
        """Return a context manager that patches httpx.AsyncClient.

        spec_map: domain substring -> openapi spec to return
        """
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

        mock_client_cls = patch("modai.modules.tools.tool_registry.httpx.AsyncClient")
        return mock_client_cls, mock_get

    @pytest.mark.asyncio
    async def test_finds_tool_by_operation_id(self):
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

        assert result == ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec=SAMPLE_OPENAPI_SPEC,
        )

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
