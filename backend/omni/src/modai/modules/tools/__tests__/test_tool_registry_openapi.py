from contextlib import asynccontextmanager
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.http_client.module import HttpClientModule
from modai.modules.tools.tool_registry_openapi import (
    OpenAPIToolRegistryModule,
    _build_operation_specs,
    _derive_base_url,
    _fetch_openapi_spec,
)


class _StubHttpClientFactory(HttpClientModule):
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


def _request(
    path: str = "/api/tools", headers: dict[str, str] | None = None
) -> Request:
    raw_headers = [
        (name.lower().encode("latin-1"), value.encode("latin-1"))
        for name, value in (headers or {}).items()
    ]
    scope: dict[str, Any] = {
        "type": "http",
        "method": "GET",
        "path": path,
        "headers": raw_headers,
    }
    return Request(scope)


def _mock_response(spec: dict | None = None, text: str = "") -> MagicMock:
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    if spec is not None:
        resp.json.return_value = spec
    resp.text = text
    return resp


SAMPLE_OPENAPI_SPEC = {
    "openapi": "3.1.0",
    "paths": {
        "/calculate": {
            "post": {
                "summary": "Evaluate a math expression",
                "operationId": "calculate",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {"expression": {"type": "string"}},
                                "required": ["expression"],
                            }
                        }
                    }
                },
            }
        }
    },
}

PATH_PARAMS_SPEC = {
    "openapi": "3.1.0",
    "paths": {
        "/users/{user_id}/orders/{order_id}": {
            "get": {
                "summary": "Get a specific user order",
                "operationId": "get_user_order",
                "parameters": [
                    {
                        "name": "user_id",
                        "in": "path",
                        "required": True,
                        "description": "The user's ID",
                        "schema": {"type": "string"},
                    },
                    {
                        "name": "order_id",
                        "in": "path",
                        "required": True,
                        "description": "The order's ID",
                        "schema": {"type": "integer"},
                    },
                ],
            }
        }
    },
}

HEADER_PARAMS_SPEC = {
    "openapi": "3.1.0",
    "paths": {
        "/data": {
            "get": {
                "summary": "Fetch session data",
                "operationId": "fetch_data",
                "parameters": [
                    {
                        "name": "X-Session-Id",
                        "in": "header",
                        "required": True,
                        "description": "Active session identifier",
                        "schema": {"type": "string"},
                    },
                    {
                        "name": "X-Tenant",
                        "in": "header",
                        "required": False,
                        "description": "Optional tenant override",
                        "schema": {"type": "string"},
                    },
                ],
            }
        }
    },
}

HEADER_AND_BODY_SPEC = {
    "openapi": "3.1.0",
    "paths": {
        "/submit": {
            "post": {
                "summary": "Submit a payload",
                "operationId": "submit",
                "parameters": [
                    {
                        "name": "X-Request-Id",
                        "in": "header",
                        "required": True,
                        "description": "Idempotency key",
                        "schema": {"type": "string"},
                    }
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {"payload": {"type": "string"}},
                                "required": ["payload"],
                            }
                        }
                    },
                },
            }
        }
    },
}

PATH_PARAMS_WITH_BODY_SPEC = {
    "openapi": "3.1.0",
    "paths": {
        "/items/{item_id}": {
            "put": {
                "summary": "Update an item",
                "operationId": "update_item",
                "parameters": [
                    {
                        "name": "item_id",
                        "in": "path",
                        "required": True,
                        "description": "The item's ID",
                        "schema": {"type": "integer"},
                    },
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {"name": {"type": "string"}},
                                "required": ["name"],
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


class TestBuildOperationSpecs:
    def test_builds_openai_function_tool_definition(self):
        specs = _build_operation_specs(SAMPLE_OPENAPI_SPEC)
        assert len(specs) == 1
        assert specs[0].definition == {
            "type": "function",
            "name": "calculate",
            "description": "Evaluate a math expression",
            "parameters": {
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
            "strict": True,
        }

    def test_ref_schema_is_resolved(self):
        specs = _build_operation_specs(DICE_ROLLER_SPEC)
        assert len(specs) == 1
        params = specs[0].definition["parameters"]
        assert "count" in params["properties"]
        assert "sides" in params["properties"]
        assert params["properties"]["count"]["type"] == "integer"
        assert specs[0].header_param_names == frozenset()

    def test_path_parameters_become_properties(self):
        specs = _build_operation_specs(PATH_PARAMS_SPEC)
        assert len(specs) == 1
        definition = specs[0].definition
        assert definition["name"] == "get_user_order"
        params = definition["parameters"]
        assert "user_id" in params["properties"]
        assert "order_id" in params["properties"]
        assert params["properties"]["user_id"]["type"] == "string"
        assert params["properties"]["user_id"]["description"] == "The user's ID"
        assert params["properties"]["order_id"]["type"] == "integer"
        assert set(params["required"]) == {"user_id", "order_id"}
        assert specs[0].header_param_names == frozenset()

    def test_path_parameters_merged_with_request_body(self):
        specs = _build_operation_specs(PATH_PARAMS_WITH_BODY_SPEC)
        assert len(specs) == 1
        params = specs[0].definition["parameters"]
        assert "item_id" in params["properties"]
        assert "name" in params["properties"]
        assert "item_id" in params["required"]
        assert "name" in params["required"]
        assert specs[0].header_param_names == frozenset()

    def test_header_parameters_in_definition(self):
        specs = _build_operation_specs(HEADER_PARAMS_SPEC)
        assert len(specs) == 1
        params = specs[0].definition["parameters"]
        assert "X-Session-Id" in params["properties"]
        assert "X-Tenant" in params["properties"]
        assert params["properties"]["X-Session-Id"]["type"] == "string"
        assert (
            params["properties"]["X-Session-Id"]["description"]
            == "Active session identifier"
        )
        assert "X-Session-Id" in params["required"]
        assert "X-Tenant" not in params.get("required", [])
        assert specs[0].header_param_names == frozenset({"X-Session-Id", "X-Tenant"})

    def test_header_parameters_merged_with_request_body(self):
        specs = _build_operation_specs(HEADER_AND_BODY_SPEC)
        assert len(specs) == 1
        params = specs[0].definition["parameters"]
        assert "X-Request-Id" in params["properties"]
        assert "payload" in params["properties"]
        assert "X-Request-Id" in params["required"]
        assert "payload" in params["required"]
        assert specs[0].header_param_names == frozenset({"X-Request-Id"})

    def test_no_operation_id_skips_operation(self):
        spec = {"paths": {"/run": {"post": {"summary": "no id"}}}}
        assert _build_operation_specs(spec) == []


class TestGetTools:
    def _make_module(
        self,
        factory: HttpClientModule,
        tool_servers: list[dict] | None = None,
    ) -> OpenAPIToolRegistryModule:
        deps = ModuleDependencies({"http_client": factory})
        return OpenAPIToolRegistryModule(
            deps,
            {
                "tool_servers": tool_servers
                or [{"url": "http://calc:8000/openapi.json"}]
            },
        )

    @pytest.mark.asyncio
    async def test_get_tools_returns_openai_function_tools(self):
        spec_client = AsyncMock()
        spec_client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )
        module = self._make_module(_StubHttpClientFactory(spec_client))

        result = await module.get_tools(_request())

        assert len(result) == 1
        assert result[0]["type"] == "function"
        assert result[0]["name"] == "calculate"
        assert result[0]["strict"] is True

    @pytest.mark.asyncio
    async def test_get_tools_empty_config(self):
        deps = ModuleDependencies({"http_client": _StubHttpClientFactory(AsyncMock())})
        module = OpenAPIToolRegistryModule(deps, {})

        result = await module.get_tools(_request())

        assert result == []

    @pytest.mark.asyncio
    async def test_get_tools_returns_tools_from_all_services(self):
        search_spec = {
            "openapi": "3.1.0",
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
            _StubHttpClientFactory(mock_client),
            tool_servers=[
                {"url": "http://calc:8000/openapi.json"},
                {"url": "http://search:8000/openapi.json"},
            ],
        )

        result = await module.get_tools(_request())

        assert len(result) == 2
        names = {tool["name"] for tool in result}
        assert names == {"calculate", "web_search"}

    @pytest.mark.asyncio
    async def test_get_tools_skips_unavailable_service(self):
        async def mock_request(method, url, **kwargs):
            if "bad" in url:
                raise httpx.ConnectError("Connection refused")
            return _mock_response(spec=SAMPLE_OPENAPI_SPEC)

        mock_client = AsyncMock()
        mock_client.request = mock_request
        module = self._make_module(
            _StubHttpClientFactory(mock_client),
            tool_servers=[
                {"url": "http://good:8000/openapi.json"},
                {"url": "http://bad:8000/openapi.json"},
            ],
        )

        result = await module.get_tools(_request())

        assert len(result) == 1
        assert result[0]["name"] == "calculate"

    @pytest.mark.asyncio
    async def test_get_tools_skips_spec_without_operation_id(self):
        no_op_spec = {"paths": {"/run": {"post": {"summary": "No operationId"}}}}
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=_mock_response(spec=no_op_spec))
        module = self._make_module(_StubHttpClientFactory(mock_client))

        result = await module.get_tools(_request())

        assert result == []

    @pytest.mark.asyncio
    async def test_get_tools_returns_all_operations_from_single_server(self):
        multi_op_spec = {
            "openapi": "3.1.0",
            "paths": {
                "/calculate": {
                    "post": {"summary": "Evaluate", "operationId": "calculate"}
                },
                "/search": {"put": {"summary": "Search", "operationId": "web_search"}},
            },
        }
        mock_client = AsyncMock()
        mock_client.request = AsyncMock(return_value=_mock_response(spec=multi_op_spec))
        module = self._make_module(_StubHttpClientFactory(mock_client))

        result = await module.get_tools(_request())

        names = {tool["name"] for tool in result}
        assert names == {"calculate", "web_search"}

    def test_has_no_router(self):
        deps = ModuleDependencies({"http_client": _StubHttpClientFactory(AsyncMock())})
        module = OpenAPIToolRegistryModule(deps, {})
        assert not hasattr(module, "router")

    def test_stores_tool_servers_from_config(self):
        tool_servers = [
            {"url": "http://a:8000/openapi.json"},
            {"url": "http://b:9000/openapi.json"},
        ]
        deps = ModuleDependencies({"http_client": _StubHttpClientFactory(AsyncMock())})
        module = OpenAPIToolRegistryModule(deps, {"tool_servers": tool_servers})
        assert module.tool_servers == tool_servers

    def test_defaults_to_empty_tool_servers_list(self):
        deps = ModuleDependencies({"http_client": _StubHttpClientFactory(AsyncMock())})
        module = OpenAPIToolRegistryModule(deps, {})
        assert module.tool_servers == []


class TestRunTool:
    def _make_module(
        self, spec: dict[str, Any], run_client: AsyncMock
    ) -> OpenAPIToolRegistryModule:
        spec_client = AsyncMock()
        spec_client.request = AsyncMock(return_value=_mock_response(spec=spec))
        deps = ModuleDependencies(
            {"http_client": _StubHttpClientFactory(spec_client, run_client)}
        )
        return OpenAPIToolRegistryModule(
            deps, {"tool_servers": [{"url": "http://calc:8000/openapi.json"}]}
        )

    @pytest.mark.asyncio
    async def test_run_tool_executes_operation_by_name(self):
        run_client = AsyncMock()
        run_client.request = AsyncMock(
            return_value=_mock_response(text='{"result": 42}')
        )
        module = self._make_module(SAMPLE_OPENAPI_SPEC, run_client)

        result = await module.run_tool(
            _request("/api/responses"),
            {"name": "calculate", "arguments": {"expression": "6*7"}},
        )

        run_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/calculate",
            json={"expression": "6*7"},
            headers={},
        )
        assert result == '{"result": 42}'

    @pytest.mark.asyncio
    async def test_run_tool_forwards_bearer_and_header_params(self):
        spec = {
            "openapi": "3.1.0",
            "paths": {
                "/submit": {
                    "post": {
                        "operationId": "submit",
                        "parameters": [
                            {
                                "name": "X-Request-Id",
                                "in": "header",
                                "required": True,
                                "schema": {"type": "string"},
                            }
                        ],
                    }
                }
            },
        }
        run_client = AsyncMock()
        run_client.request = AsyncMock(return_value=_mock_response(text='{"ok": true}'))
        module = self._make_module(spec, run_client)

        await module.run_tool(
            _request(),
            {
                "name": "submit",
                "arguments": {
                    "payload": "hello",
                    "X-Request-Id": "req-1",
                    "_bearer_token": "secret",
                },
            },
        )

        run_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/submit",
            json={"payload": "hello"},
            headers={"Authorization": "Bearer secret", "X-Request-Id": "req-1"},
        )

    @pytest.mark.asyncio
    async def test_run_tool_raises_for_unknown_name(self):
        run_client = AsyncMock()
        run_client.request = AsyncMock(return_value=_mock_response(text='{"ok": true}'))
        module = self._make_module(SAMPLE_OPENAPI_SPEC, run_client)

        with pytest.raises(ValueError, match="not found"):
            await module.run_tool(_request(), {"name": "unknown", "arguments": {}})

    @pytest.mark.asyncio
    async def test_run_tool_substitutes_path_parameters_into_url(self):
        run_client = AsyncMock()
        run_client.request = AsyncMock(
            return_value=_mock_response(text='{"order": "details"}')
        )
        module = self._make_module(PATH_PARAMS_SPEC, run_client)

        result = await module.run_tool(
            _request(),
            {
                "name": "get_user_order",
                "arguments": {"user_id": "alice", "order_id": 42},
            },
        )

        run_client.request.assert_called_once_with(
            method="GET",
            url="http://calc:8000/users/alice/orders/42",
            json={},
            headers={},
        )
        assert result == '{"order": "details"}'

    @pytest.mark.asyncio
    async def test_run_tool_substitutes_path_params_leaving_body(self):
        run_client = AsyncMock()
        run_client.request = AsyncMock(
            return_value=_mock_response(text='{"updated": true}')
        )
        module = self._make_module(PATH_PARAMS_WITH_BODY_SPEC, run_client)

        await module.run_tool(
            _request(),
            {"name": "update_item", "arguments": {"item_id": 7, "name": "Widget"}},
        )

        run_client.request.assert_called_once_with(
            method="PUT",
            url="http://calc:8000/items/7",
            json={"name": "Widget"},
            headers={},
        )


class TestHelpers:
    @pytest.mark.asyncio
    async def test_fetch_openapi_spec_appends_default_path(self):
        client = AsyncMock()
        client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )

        result = await _fetch_openapi_spec(client, "http://tool:8000")

        assert result == SAMPLE_OPENAPI_SPEC
        client.request.assert_called_once_with("GET", "http://tool:8000/openapi.json")

    @pytest.mark.asyncio
    async def test_fetch_openapi_spec_strips_trailing_slash(self):
        client = AsyncMock()
        client.request = AsyncMock(
            return_value=_mock_response(spec=SAMPLE_OPENAPI_SPEC)
        )

        await _fetch_openapi_spec(client, "http://tool:8000/")

        client.request.assert_called_once_with("GET", "http://tool:8000/openapi.json")

    @pytest.mark.asyncio
    async def test_fetch_openapi_spec_http_error_returns_none(self):
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
    async def test_fetch_openapi_spec_connection_error_returns_none(self):
        client = AsyncMock()
        client.request = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))

        result = await _fetch_openapi_spec(client, "http://tool:8000")

        assert result is None

    @pytest.mark.asyncio
    async def test_fetch_openapi_spec_unexpected_error_returns_none(self):
        client = AsyncMock()
        client.request = AsyncMock(side_effect=RuntimeError("something went wrong"))

        result = await _fetch_openapi_spec(client, "http://tool:8000")

        assert result is None

    def test_derive_base_url(self):
        assert (
            _derive_base_url("http://host:9000/api/openapi.json")
            == "http://host:9000/api"
        )

    def test_derive_base_url_strips_openapi_json(self):
        assert _derive_base_url("http://calc:8000/openapi.json") == "http://calc:8000"

    def test_derive_base_url_keeps_nested_base_path(self):
        assert (
            _derive_base_url("http://host:9000/api/v1/openapi.json")
            == "http://host:9000/api/v1"
        )

    def test_derive_base_url_accepts_bare_base_url(self):
        assert _derive_base_url("http://tool:8000") == "http://tool:8000"

    def test_derive_base_url_trailing_slash(self):
        assert _derive_base_url("http://tool:8000/") == "http://tool:8000"
