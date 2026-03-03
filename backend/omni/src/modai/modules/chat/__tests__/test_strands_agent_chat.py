"""Tests for the StrandsAgentChatModule."""

import os
from pathlib import Path

import pytest
from dotenv import find_dotenv, load_dotenv
from unittest.mock import AsyncMock, Mock, patch
from dataclasses import dataclass, field

from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.chat.openai_agent_chat import (
    StrandsAgentChatModule,
    _parse_model,
    _extract_last_user_message,
    _build_conversation_history,
    _to_strands_message,
    _message_text,
    _build_openai_response,
    _extract_tool_names,
    _resolve_request_tools,
    _create_http_tool,
    _extract_operation,
)
from modai.modules.model_provider.module import (
    ModelProviderResponse,
    ModelProvidersListResponse,
)
from modai.modules.tools.module import ToolDefinition
import openai

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_provider(name: str = "myprovider") -> ModelProviderResponse:
    return ModelProviderResponse(
        id="provider_1",
        type="openai",
        name=name,
        base_url="https://api.openai.com/v1",
        api_key="sk-test-key",
        properties={},
        created_at=None,
        updated_at=None,
    )


def _make_mock_provider_module(providers: list[ModelProviderResponse] | None = None):
    providers = providers or [_make_provider()]
    mock = Mock()
    mock.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=providers,
            total=len(providers),
            limit=None,
            offset=None,
        )
    )
    return mock


def _make_dependencies(provider_module=None):
    provider_module = provider_module or _make_mock_provider_module()
    deps = ModuleDependencies({"llm_provider_module": provider_module})
    return deps


# ---------------------------------------------------------------------------
# _parse_model
# ---------------------------------------------------------------------------


class TestParseModel:
    def test_valid_model(self):
        provider, model = _parse_model("myprovider/gpt-4o")
        assert provider == "myprovider"
        assert model == "gpt-4o"

    def test_valid_model_with_slash_in_name(self):
        provider, model = _parse_model("myprovider/azure/gpt-5")
        assert provider == "myprovider"
        assert model == "azure/gpt-5"

    def test_invalid_no_slash(self):
        with pytest.raises(ValueError, match="Invalid model format"):
            _parse_model("gpt-4o")


# ---------------------------------------------------------------------------
# _extract_last_user_message
# ---------------------------------------------------------------------------


class TestExtractLastUserMessage:
    def test_string_input(self):
        body = {"input": "Hello there"}
        assert _extract_last_user_message(body) == "Hello there"

    def test_list_simple_content(self):
        body = {"input": [{"role": "user", "content": "Hi"}]}
        assert _extract_last_user_message(body) == "Hi"

    def test_list_structured_content(self):
        body = {
            "input": [
                {"role": "user", "content": [{"type": "input_text", "text": "Hello"}]}
            ]
        }
        assert _extract_last_user_message(body) == "Hello"

    def test_multiple_messages_returns_last(self):
        body = {
            "input": [
                {"role": "user", "content": "First"},
                {"role": "assistant", "content": "Response"},
                {"role": "user", "content": "Second"},
            ]
        }
        assert _extract_last_user_message(body) == "Second"

    def test_empty_input(self):
        assert _extract_last_user_message({"input": ""}) == ""
        assert _extract_last_user_message({"input": []}) == ""
        assert _extract_last_user_message({}) == ""


# ---------------------------------------------------------------------------
# _build_conversation_history
# ---------------------------------------------------------------------------


class TestBuildConversationHistory:
    def test_string_input_returns_empty(self):
        assert _build_conversation_history({"input": "Hello"}) == []

    def test_single_message_returns_empty(self):
        body = {"input": [{"role": "user", "content": "Hi"}]}
        assert _build_conversation_history(body) == []

    def test_multi_turn_excludes_last(self):
        body = {
            "input": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi"},
                {"role": "user", "content": "How are you?"},
            ]
        }
        history = _build_conversation_history(body)
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[0]["content"] == [{"text": "Hello"}]
        assert history[1]["role"] == "assistant"
        assert history[1]["content"] == [{"text": "Hi"}]


# ---------------------------------------------------------------------------
# _to_strands_message / _message_text
# ---------------------------------------------------------------------------


class TestMessageConversion:
    def test_to_strands_message_simple(self):
        msg = _to_strands_message({"role": "user", "content": "Hello"})
        assert msg == {"role": "user", "content": [{"text": "Hello"}]}

    def test_to_strands_message_structured(self):
        msg = _to_strands_message(
            {"role": "assistant", "content": [{"type": "output_text", "text": "Hey"}]}
        )
        assert msg == {"role": "assistant", "content": [{"text": "Hey"}]}

    def test_message_text_string(self):
        assert _message_text("Hello") == "Hello"

    def test_message_text_dict_string_content(self):
        assert _message_text({"content": "Hello"}) == "Hello"

    def test_message_text_dict_list_content(self):
        assert (
            _message_text({"content": [{"type": "input_text", "text": "Hi"}]}) == "Hi"
        )

    def test_message_text_none(self):
        assert _message_text(None) == ""


# ---------------------------------------------------------------------------
# _build_openai_response
# ---------------------------------------------------------------------------


class TestBuildOpenAIResponse:
    def test_builds_valid_response(self):
        resp = _build_openai_response(
            text="Hello!",
            model="gpt-4o",
            response_id="resp_test123",
            msg_id="msg_test456",
            input_tokens=10,
            output_tokens=5,
        )
        assert isinstance(resp, openai.types.responses.Response)
        assert resp.id == "resp_test123"
        assert resp.model == "gpt-4o"
        assert resp.status == "completed"
        assert resp.output[0].content[0].text == "Hello!"
        assert resp.usage.input_tokens == 10
        assert resp.usage.output_tokens == 5
        assert resp.usage.total_tokens == 15


# ---------------------------------------------------------------------------
# _extract_tool_names
# ---------------------------------------------------------------------------

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
                "responses": {
                    "200": {
                        "description": "Calculation result",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"result": {"type": "number"}},
                                }
                            }
                        },
                    }
                },
            }
        }
    },
}


class TestExtractToolNames:
    def test_extracts_function_tool_names(self):
        body = {
            "tools": [
                {
                    "type": "function",
                    "function": {"name": "calculate", "description": "calc"},
                },
                {
                    "type": "function",
                    "function": {"name": "web_search", "description": "search"},
                },
            ]
        }
        assert _extract_tool_names(body) == ["calculate", "web_search"]

    def test_empty_tools(self):
        assert _extract_tool_names({"tools": []}) == []

    def test_no_tools_key(self):
        assert _extract_tool_names({"model": "gpt-4o"}) == []

    def test_skips_non_function_types(self):
        body = {
            "tools": [
                {"type": "code_interpreter"},
                {
                    "type": "function",
                    "function": {"name": "calculate"},
                },
            ]
        }
        assert _extract_tool_names(body) == ["calculate"]

    def test_skips_missing_name(self):
        body = {"tools": [{"type": "function", "function": {"description": "no name"}}]}
        assert _extract_tool_names(body) == []


# ---------------------------------------------------------------------------
# _extract_operation
# ---------------------------------------------------------------------------


class TestExtractOperation:
    def test_extracts_first_operation(self):
        op = _extract_operation(SAMPLE_OPENAPI_SPEC)
        assert op is not None
        assert op["operationId"] == "calculate"
        assert op["summary"] == "Evaluate a math expression"

    def test_returns_none_for_empty_spec(self):
        assert _extract_operation({}) is None
        assert _extract_operation({"paths": {}}) is None

    def test_skips_non_dict_operations(self):
        spec = {"paths": {"/foo": {"post": "not a dict"}}}
        assert _extract_operation(spec) is None

    def test_skips_operations_without_operation_id(self):
        spec = {"paths": {"/foo": {"post": {"summary": "no id"}}}}
        assert _extract_operation(spec) is None


# ---------------------------------------------------------------------------
# _create_http_tool
# ---------------------------------------------------------------------------


class TestCreateHttpTool:
    def test_creates_tool_from_valid_definition(self):
        tool_def = ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec=SAMPLE_OPENAPI_SPEC,
        )
        tool = _create_http_tool(tool_def)
        assert tool is not None
        assert tool.tool_name == "calculate"
        assert tool.tool_spec["name"] == "calculate"
        assert tool.tool_spec["description"] == "Evaluate a math expression"
        schema = tool.tool_spec["inputSchema"]["json"]
        assert "expression" in schema["properties"]

    def test_returns_none_for_empty_spec(self):
        tool_def = ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec={"paths": {}},
        )
        assert _create_http_tool(tool_def) is None

    def test_tool_handler_success(self):
        tool_def = ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec=SAMPLE_OPENAPI_SPEC,
        )
        tool = _create_http_tool(tool_def)
        assert tool is not None

        mock_response = Mock()
        mock_response.raise_for_status = Mock()
        mock_response.text = '{"result": 42}'

        with patch(
            "modai.modules.chat.openai_agent_chat.httpx.Client"
        ) as mock_client_cls:
            mock_client = Mock()
            mock_client.__enter__ = Mock(return_value=mock_client)
            mock_client.__exit__ = Mock(return_value=False)
            mock_client.request.return_value = mock_response
            mock_client_cls.return_value = mock_client

            result = tool._tool_func(
                {
                    "toolUseId": "tu_123",
                    "name": "calculate",
                    "input": {"expression": "6*7"},
                },
            )

        assert result["status"] == "success"
        assert result["toolUseId"] == "tu_123"
        assert '{"result": 42}' in result["content"][0]["text"]
        mock_client.request.assert_called_once_with(
            method="POST",
            url="http://calc:8000/calculate",
            json={"expression": "6*7"},
        )

    def test_tool_handler_http_error(self):
        tool_def = ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec=SAMPLE_OPENAPI_SPEC,
        )
        tool = _create_http_tool(tool_def)
        assert tool is not None

        with patch(
            "modai.modules.chat.openai_agent_chat.httpx.Client"
        ) as mock_client_cls:
            mock_client = Mock()
            mock_client.__enter__ = Mock(return_value=mock_client)
            mock_client.__exit__ = Mock(return_value=False)
            mock_client.request.side_effect = Exception("Connection refused")
            mock_client_cls.return_value = mock_client

            result = tool._tool_func(
                {
                    "toolUseId": "tu_456",
                    "name": "calculate",
                    "input": {"expression": "1/0"},
                },
            )

        assert result["status"] == "error"
        assert result["toolUseId"] == "tu_456"
        assert "Connection refused" in result["content"][0]["text"]


# ---------------------------------------------------------------------------
# _resolve_request_tools
# ---------------------------------------------------------------------------


class TestResolveRequestTools:
    @pytest.mark.asyncio
    async def test_returns_empty_when_no_registry(self):
        body = {
            "tools": [
                {"type": "function", "function": {"name": "calculate"}},
            ]
        }
        result = await _resolve_request_tools(body, None)
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_no_tools_in_request(self):
        mock_registry = Mock()
        result = await _resolve_request_tools({"model": "gpt-4o"}, mock_registry)
        assert result == []

    @pytest.mark.asyncio
    async def test_resolves_tools_from_registry(self):
        tool_def = ToolDefinition(
            url="http://calc:8000/calculate",
            method="POST",
            openapi_spec=SAMPLE_OPENAPI_SPEC,
        )
        mock_registry = Mock()
        mock_registry.get_tool_by_name = AsyncMock(return_value=tool_def)

        body = {
            "tools": [
                {"type": "function", "function": {"name": "calculate"}},
            ]
        }
        result = await _resolve_request_tools(body, mock_registry)
        assert len(result) == 1
        assert result[0].tool_name == "calculate"
        mock_registry.get_tool_by_name.assert_called_once_with("calculate")

    @pytest.mark.asyncio
    async def test_skips_unknown_tools(self):
        mock_registry = Mock()
        mock_registry.get_tool_by_name = AsyncMock(return_value=None)

        body = {
            "tools": [
                {"type": "function", "function": {"name": "unknown_tool"}},
            ]
        }
        result = await _resolve_request_tools(body, mock_registry)
        assert result == []


# ---------------------------------------------------------------------------
# StrandsAgentChatModule.__init__
# ---------------------------------------------------------------------------


class TestStrandsAgentChatModuleInit:
    def test_raises_without_provider(self):
        deps = ModuleDependencies({})
        with pytest.raises(ValueError, match="llm_provider_module"):
            StrandsAgentChatModule(dependencies=deps, config={})

    def test_creates_with_provider(self):
        deps = _make_dependencies()
        module = StrandsAgentChatModule(dependencies=deps, config={})
        assert module.provider_module is not None

    def test_tool_registry_is_none_when_not_configured(self):
        deps = _make_dependencies()
        module = StrandsAgentChatModule(dependencies=deps, config={})
        assert module.tool_registry is None

    def test_tool_registry_set_when_configured(self):
        mock_registry = Mock()
        provider_module = _make_mock_provider_module()
        deps = ModuleDependencies(
            {"llm_provider_module": provider_module, "tool_registry": mock_registry}
        )
        module = StrandsAgentChatModule(dependencies=deps, config={})
        assert module.tool_registry is mock_registry


# ---------------------------------------------------------------------------
# StrandsAgentChatModule.generate_response (mocked)
# ---------------------------------------------------------------------------


@dataclass
class _FakeUsage:
    inputTokens: int = 10
    outputTokens: int = 20
    totalTokens: int = 30

    def get(self, key, default=0):
        return getattr(self, key, default)


@dataclass
class _FakeMetrics:
    accumulated_usage: dict = field(
        default_factory=lambda: {
            "inputTokens": 10,
            "outputTokens": 20,
            "totalTokens": 30,
        }
    )


@dataclass
class _FakeAgentResult:
    text: str = "Mocked response"
    metrics: _FakeMetrics = field(default_factory=_FakeMetrics)
    stop_reason: str = "end_turn"
    message: dict = field(
        default_factory=lambda: {
            "role": "assistant",
            "content": [{"text": "Mocked response"}],
        }
    )

    def __str__(self) -> str:
        return self.text


@pytest.mark.asyncio
async def test_generate_response_non_streaming():
    """Non-streaming generate_response returns an OpenAI Response."""
    deps = _make_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    fake_result = _FakeAgentResult()

    with (
        patch(
            "modai.modules.chat.openai_agent_chat._create_agent"
        ) as mock_create_agent,
        patch("asyncio.to_thread", new_callable=AsyncMock, return_value=fake_result),
    ):
        mock_agent = Mock()
        mock_create_agent.return_value = mock_agent

        body = {
            "model": "myprovider/gpt-4o",
            "input": [{"role": "user", "content": "Hello"}],
        }

        result = await module.generate_response(request, body)

    assert isinstance(result, openai.types.responses.Response)
    assert result.status == "completed"
    assert result.output[0].content[0].text == "Mocked response"
    assert result.usage.input_tokens == 10
    assert result.usage.output_tokens == 20


@pytest.mark.asyncio
async def test_generate_response_streaming():
    """Streaming generate_response returns an async generator of events."""
    deps = _make_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    async def fake_stream_async(prompt):
        yield {"data": "Hello"}
        yield {"data": " world"}

    with patch(
        "modai.modules.chat.openai_agent_chat._create_agent"
    ) as mock_create_agent:
        mock_agent = Mock()
        mock_agent.stream_async = fake_stream_async
        mock_create_agent.return_value = mock_agent

        body = {
            "model": "myprovider/gpt-4o",
            "input": [{"role": "user", "content": "Hi"}],
            "stream": True,
        }

        result = await module.generate_response(request, body)

    # Result should be an async generator
    assert hasattr(result, "__aiter__")

    events = []
    async for event in result:
        events.append(event)

    # Expected: created, 2 text deltas, text done, completed
    assert len(events) == 5

    # First event is response.created
    assert events[0].type == "response.created"

    # Delta events
    assert events[1].type == "response.output_text.delta"
    assert events[1].delta == "Hello"
    assert events[2].type == "response.output_text.delta"
    assert events[2].delta == " world"

    # Text done
    assert events[3].type == "response.output_text.done"
    assert events[3].text == "Hello world"

    # Completed
    assert events[4].type == "response.completed"
    assert events[4].response.output[0].content[0].text == "Hello world"


@pytest.mark.asyncio
async def test_generate_response_with_tools():
    """Tools from the request body are resolved and passed to the agent."""
    tool_def = ToolDefinition(
        url="http://calc:8000/calculate",
        method="POST",
        openapi_spec=SAMPLE_OPENAPI_SPEC,
    )
    mock_registry = Mock()
    mock_registry.get_tool_by_name = AsyncMock(return_value=tool_def)

    provider_module = _make_mock_provider_module()
    deps = ModuleDependencies(
        {"llm_provider_module": provider_module, "tool_registry": mock_registry}
    )
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    fake_result = _FakeAgentResult()

    with (
        patch(
            "modai.modules.chat.openai_agent_chat._create_agent"
        ) as mock_create_agent,
        patch("asyncio.to_thread", new_callable=AsyncMock, return_value=fake_result),
    ):
        mock_agent = Mock()
        mock_create_agent.return_value = mock_agent

        body = {
            "model": "myprovider/gpt-4o",
            "input": [{"role": "user", "content": "Calculate 6*7"}],
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "calculate",
                        "description": "Evaluate a math expression",
                        "parameters": {
                            "type": "object",
                            "properties": {"expression": {"type": "string"}},
                        },
                    },
                }
            ],
        }

        result = await module.generate_response(request, body)

    # Verify the tool registry was queried
    mock_registry.get_tool_by_name.assert_called_once_with("calculate")

    # Verify _create_agent was called with tools
    call_args = mock_create_agent.call_args
    tools_arg = call_args[0][3] if len(call_args[0]) > 3 else call_args[1].get("tools")
    assert tools_arg is not None
    assert len(tools_arg) == 1
    assert tools_arg[0].tool_name == "calculate"

    assert isinstance(result, openai.types.responses.Response)


@pytest.mark.asyncio
async def test_generate_response_without_tool_registry():
    """Without tool_registry configured, tools in request are ignored."""
    deps = _make_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    fake_result = _FakeAgentResult()

    with (
        patch(
            "modai.modules.chat.openai_agent_chat._create_agent"
        ) as mock_create_agent,
        patch("asyncio.to_thread", new_callable=AsyncMock, return_value=fake_result),
    ):
        mock_agent = Mock()
        mock_create_agent.return_value = mock_agent

        body = {
            "model": "myprovider/gpt-4o",
            "input": [{"role": "user", "content": "Hello"}],
            "tools": [
                {
                    "type": "function",
                    "function": {"name": "calculate"},
                }
            ],
        }

        result = await module.generate_response(request, body)

    # _create_agent should be called with empty tools list
    call_args = mock_create_agent.call_args
    tools_arg = (
        call_args[0][3] if len(call_args[0]) > 3 else call_args[1].get("tools", [])
    )
    assert tools_arg == []

    assert isinstance(result, openai.types.responses.Response)


# ---------------------------------------------------------------------------
# Provider resolution
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_model_format():
    """Raises ValueError for an invalid model string."""
    deps = _make_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    body = {
        "model": "no_slash_model",
        "input": "Hello",
    }
    with pytest.raises(ValueError, match="Invalid model format"):
        await module.generate_response(request, body)


@pytest.mark.asyncio
async def test_provider_not_found():
    """Raises ValueError when provider name is unknown."""
    deps = _make_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    body = {
        "model": "unknown/gpt-4o",
        "input": "Hello",
    }
    with pytest.raises(ValueError, match="Provider 'unknown' not found"):
        await module.generate_response(request, body)


# ---------------------------------------------------------------------------
# Integration tests (require OPENAI_API_KEY in .env)
# ---------------------------------------------------------------------------


def _make_real_provider() -> ModelProviderResponse:
    """Create a provider backed by the env-var credentials."""
    return ModelProviderResponse(
        id="test_provider",
        type="openai",
        name="myopenai",
        base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        properties={},
        created_at=None,
        updated_at=None,
    )


def _make_real_dependencies() -> ModuleDependencies:
    """Dependencies wired to the real provider from env vars."""
    provider = _make_real_provider()
    provider_module = _make_mock_provider_module([provider])
    return ModuleDependencies({"llm_provider_module": provider_module})


def _real_model() -> str:
    """Return 'myopenai/<model>' using OPENAI_MODEL from env."""
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")
    return f"myopenai/{model}"


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_strands_generate_response_non_streaming_integration():
    """Integration: non-streaming response via Strands Agent + real LLM."""
    deps = _make_real_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    body = {
        "model": _real_model(),
        "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
    }

    result = await module.generate_response(request, body)

    assert isinstance(result, openai.types.responses.Response)
    assert result.status == "completed"
    assert result.output
    assert len(result.output) > 0
    text = result.output[0].content[0].text
    assert "Hello" in text
    assert result.usage.input_tokens > 0
    assert result.usage.output_tokens > 0


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_strands_generate_response_streaming_integration():
    """Integration: streaming response via Strands Agent + real LLM."""
    deps = _make_real_dependencies()
    module = StrandsAgentChatModule(dependencies=deps, config={})
    request = Mock(spec=Request)

    body = {
        "model": _real_model(),
        "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
        "stream": True,
    }

    result = await module.generate_response(request, body)
    assert hasattr(result, "__aiter__")

    events = []
    async for event in result:
        events.append(event)

    # Must have at least created + text done + completed
    assert len(events) >= 3

    # First is response.created
    assert events[0].type == "response.created"

    # Collect text deltas
    full_text = ""
    for evt in events:
        if hasattr(evt, "type") and evt.type == "response.output_text.delta":
            full_text += evt.delta

    assert "Hello" in full_text

    # Last is response.completed
    assert events[-1].type == "response.completed"
    assert events[-1].response.output[0].content[0].text == full_text
