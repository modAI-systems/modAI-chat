"""Tests for StrandsAgentChatModule — public interface only.

Every test exercises only the two public entry-points:
  * ``StrandsAgentChatModule.__init__``
  * ``StrandsAgentChatModule.generate_response``

Internal / private helpers are tested **indirectly** through these methods.

A llmock testcontainer (``ghcr.io/modai-systems/llmock:latest``) is used as
a deterministic mock LLM server.  By default it echoes the last user message
back (MirrorStrategy) and can return HTTP errors via ErrorStrategy triggers.
"""

import json
import os
import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, Mock

import httpx as httpx_lib
import openai
import pytest
import yaml
from dotenv import find_dotenv, load_dotenv
from fastapi import Request
from testcontainers.core.container import DockerContainer

from modai.module import ModuleDependencies
from modai.modules.chat.openai_agent_chat import StrandsAgentChatModule
from modai.modules.model_provider.module import (
    ModelProviderResponse,
    ModelProvidersListResponse,
)
from modai.modules.tools.module import Tool, ToolDefinition

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))


def _make_tool(
    definition: ToolDefinition, run_url: str = "", run_method: str = "POST"
) -> Tool:
    """Create a Tool stub for testing.

    If run_url is provided the tool will make a real HTTP call to that URL
    when run() is called; otherwise run() returns an empty string.
    """
    url = run_url
    method = run_method

    class _TestTool(Tool):
        @property
        def definition(self) -> ToolDefinition:
            return definition

        async def run(self, params: dict[str, Any]) -> Any:
            if url:
                import httpx

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.request(
                        method=method.upper(), url=url, json=params
                    )
                    response.raise_for_status()
                    return response.text
            return ""

    return _TestTool()


# ---------------------------------------------------------------------------
# llmock container
# ---------------------------------------------------------------------------

LLMOCK_IMAGE = "ghcr.io/modai-systems/llmock:latest"
LLMOCK_PORT = 8000
LLMOCK_API_KEY = "test-key"

LLMOCK_CONFIG: dict[str, Any] = {
    "api-key": LLMOCK_API_KEY,
    "models": [
        {"id": "gpt-4o", "created": 1715367049, "owned_by": "openai"},
    ],
    "strategies": ["ErrorStrategy", "ToolCallStrategy", "MirrorStrategy"],
}

SAMPLE_TOOL_OPENAPI_SPEC: dict[str, Any] = {
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
                                        "description": "Math expression",
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


@pytest.fixture(scope="module")
def llmock_base_url(
    request: pytest.FixtureRequest, tmp_path_factory: pytest.TempPathFactory
) -> str:
    """llmock container with ErrorStrategy + ToolCallStrategy + MirrorStrategy (module-scoped)."""
    config_file: Path = tmp_path_factory.mktemp("llmock") / "config.yaml"
    config_file.write_text(yaml.dump(LLMOCK_CONFIG))
    os.chmod(config_file, 0o644)

    container = (
        DockerContainer(LLMOCK_IMAGE)
        .with_exposed_ports(LLMOCK_PORT)
        .with_volume_mapping(str(config_file), "/app/config.yaml", "ro")
    )
    container.start()

    host = container.get_container_host_ip()
    port = container.get_exposed_port(LLMOCK_PORT)
    root_url = f"http://{host}:{port}"
    _wait_for_health(root_url)

    request.addfinalizer(container.stop)
    return f"{root_url}/"


def _wait_for_health(base_url: str, timeout: float = 30.0) -> None:
    """Poll the llmock health endpoint until it responds."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            resp = httpx_lib.get(f"{base_url}/health", timeout=2.0)
            if resp.status_code == 200:
                return
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError(
        f"llmock health check at {base_url}/health did not respond within {timeout}s"
    )


# ===================================================================
# 1) Construction tests  (__init__)
# ===================================================================


class TestConstruction:
    """Tests for module construction via __init__."""

    def test_raises_without_provider_module(self):
        deps = ModuleDependencies({})
        with pytest.raises(ValueError, match="llm_provider_module"):
            StrandsAgentChatModule(dependencies=deps, config={})

    def test_creates_successfully_with_valid_dependencies(self):
        """Construction with a valid provider module must not raise."""
        StrandsAgentChatModule(dependencies=_make_dependencies(), config={})


# ===================================================================
# 2) Happy-path: non-streaming generate_response
# ===================================================================


class TestNonStreamingHappyPath:
    """generate_response returns an OpenAI Response when stream is False.

    llmock MirrorStrategy echoes the last user message back, so the
    response text matches the input.
    """

    @pytest.mark.asyncio
    async def test_response_contains_mirrored_text(self, llmock_base_url):
        """llmock MirrorStrategy echoes the last user message."""
        module = _llmock_module(llmock_base_url)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Say hello",
        }

        result = await module.generate_response(_make_request(), body)

        assert result.status == "completed"
        assert "Say hello" in result.output[0].content[0].text

    @pytest.mark.asyncio
    async def test_response_reports_token_usage(self, llmock_base_url):
        module = _llmock_module(llmock_base_url)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Hi",
        }

        result = await module.generate_response(_make_request(), body)

        assert result.usage.input_tokens > 0
        assert result.usage.output_tokens > 0
        assert result.usage.total_tokens > 0

    @pytest.mark.asyncio
    async def test_multi_turn_conversation_succeeds(self, llmock_base_url):
        """Multi-turn conversation with prior history produces a valid response."""
        module = _llmock_module(llmock_base_url)
        body = {
            "model": "myprovider/gpt-4o",
            "input": [
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello!"},
                {"role": "user", "content": "How are you?"},
            ],
        }

        result = await module.generate_response(_make_request(), body)

        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"
        assert len(result.output) > 0

    @pytest.mark.asyncio
    async def test_system_prompt_from_instructions_field(self, llmock_base_url):
        """The 'instructions' field is accepted and the response succeeds."""
        module = _llmock_module(llmock_base_url)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Hi",
            "instructions": "You are a pirate.",
        }

        result = await module.generate_response(_make_request(), body)

        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"


# ===================================================================
# 3) Happy-path: streaming generate_response
# ===================================================================


class TestStreamingHappyPath:
    """generate_response returns an async generator when stream=True."""

    @pytest.mark.asyncio
    async def test_stream_assembled_text_echoes_input(self, llmock_base_url):
        """The assembled text from all deltas matches the mirrored input."""
        module = _llmock_module(llmock_base_url)

        gen = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Hola Mundo",
                "stream": True,
            },
        )

        events = [e async for e in gen]

        full_text = "".join(
            e.delta
            for e in events
            if getattr(e, "type", None) == "response.output_text.delta"
        )
        assert "Hola Mundo" in full_text
        assert len(events) > 2  # at least created + completed events

    @pytest.mark.asyncio
    async def test_stream_completed_response_is_valid(self, llmock_base_url):
        """The final completed event carries a valid OpenAI Response."""
        module = _llmock_module(llmock_base_url)

        gen = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Test message",
                "stream": True,
            },
        )

        events = [e async for e in gen]
        completed = events[-1]

        assert isinstance(completed.response, openai.types.responses.Response)
        assert completed.response.status == "completed"
        assert len(completed.response.output) > 0
        assert completed.response.output[0].content[0].text != ""


# ===================================================================
# 4) Happy-path: tool calling
# ===================================================================


class TestToolCallingHappyPath:
    """Tools are resolved from the registry and forwarded to the agent."""

    def _make_tool_registry(self, tool: Tool | None = None) -> Mock:
        registry = Mock()
        if tool:
            registry.get_tool_by_name = AsyncMock(return_value=tool)
        else:
            registry.get_tool_by_name = AsyncMock(return_value=None)
        return registry

    @pytest.mark.asyncio
    async def test_actual_http_call_reaches_tool_endpoint(
        self, llmock_base_url, httpserver
    ):
        """The tool HTTP endpoint receives the POST request with the correct JSON body.

        A real local HTTP server (pytest-httpserver) acts as the tool endpoint.
        ToolCallStrategy fires exactly once when the user message contains the
        trigger phrase. The tool responds with a result; on the next turn
        MirrorStrategy takes over and the agent completes successfully.
        This is a full end-to-end exercise of the httpx.Client call in _create_http_tool.
        """
        from werkzeug.wrappers import Response as WerkzeugResponse

        captured_body: dict[str, Any] = {}

        def _capture(request):
            nonlocal captured_body
            captured_body = request.get_json()
            return WerkzeugResponse(
                json.dumps({"result": 42}),
                status=200,
                content_type="application/json",
            )

        httpserver.expect_oneshot_request(
            "/calculate", method="POST"
        ).respond_with_handler(_capture)

        definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
        )
        tool = _make_tool(
            definition, run_url=httpserver.url_for("/calculate"), run_method="POST"
        )
        registry = self._make_tool_registry(tool)
        module = _llmock_module(llmock_base_url, tool_registry=registry)

        body = {
            "model": "myprovider/gpt-4o",
            "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
            "tools": [{"type": "function", "function": {"name": "calculate"}}],
        }

        result = await module.generate_response(_make_request(), body)

        assert result.status == "completed"
        httpserver.check_assertions()
        assert isinstance(captured_body, dict)
        assert "expression" in captured_body
        assert captured_body["expression"] == "6*7"

    @pytest.mark.asyncio
    async def test_actual_http_call_reaches_tool_endpoint_streaming(
        self, llmock_base_url, httpserver
    ):
        """Same as above but for streaming: the tool endpoint receives the call
        and the stream completes successfully.
        """
        from werkzeug.wrappers import Response as WerkzeugResponse

        captured_body: dict[str, Any] = {}

        def _capture(request):
            nonlocal captured_body
            captured_body = request.get_json()
            return WerkzeugResponse(
                json.dumps({"result": 42}),
                status=200,
                content_type="application/json",
            )

        httpserver.expect_oneshot_request(
            "/calculate", method="POST"
        ).respond_with_handler(_capture)

        definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
                "required": ["expression"],
            },
        )
        tool = _make_tool(
            definition, run_url=httpserver.url_for("/calculate"), run_method="POST"
        )
        registry = self._make_tool_registry(tool)
        module = _llmock_module(llmock_base_url, tool_registry=registry)

        body = {
            "model": "myprovider/gpt-4o",
            "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
            "tools": [{"type": "function", "function": {"name": "calculate"}}],
            "stream": True,
        }

        gen = await module.generate_response(_make_request(), body)
        events = [e async for e in gen]

        assert events[-1].type == "response.completed"
        httpserver.check_assertions()
        assert isinstance(captured_body, dict)
        assert "expression" in captured_body


# ===================================================================
# 5) Error-path: invalid model / provider issues
# ===================================================================


class TestModelAndProviderErrors:
    """Errors when the model string is malformed or provider is unknown."""

    @pytest.mark.asyncio
    async def test_invalid_model_format_no_slash(self):
        module = StrandsAgentChatModule(dependencies=_make_dependencies(), config={})
        with pytest.raises(ValueError, match="Invalid model format"):
            await module.generate_response(
                _make_request(),
                {"model": "gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_invalid_model_format_empty_provider(self):
        module = StrandsAgentChatModule(dependencies=_make_dependencies(), config={})
        with pytest.raises(ValueError, match="Invalid model format"):
            await module.generate_response(
                _make_request(),
                {"model": "/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_invalid_model_format_empty_model(self):
        module = StrandsAgentChatModule(dependencies=_make_dependencies(), config={})
        with pytest.raises(ValueError, match="Invalid model format"):
            await module.generate_response(
                _make_request(),
                {"model": "provider/", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_provider_not_found(self):
        module = StrandsAgentChatModule(dependencies=_make_dependencies(), config={})
        with pytest.raises(ValueError, match="Provider 'unknown' not found"):
            await module.generate_response(
                _make_request(),
                {"model": "unknown/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_provider_module_raises_propagates(self):
        """If the provider module itself raises, the error propagates."""
        provider_module = Mock()
        provider_module.get_providers = AsyncMock(
            side_effect=RuntimeError("DB connection lost")
        )
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(provider_module=provider_module), config={}
        )

        with pytest.raises(RuntimeError, match="DB connection lost"):
            await module.generate_response(
                _make_request(),
                {"model": "myprovider/gpt-4o", "input": "Hi"},
            )


# ===================================================================
# 6) Error-path: LLM unreachable / LLM errors
# ===================================================================


class TestLLMErrors:
    """Errors during the actual LLM call (non-streaming and streaming)."""

    @pytest.mark.asyncio
    async def test_non_streaming_error_trigger_429(self, llmock_base_url):
        """llmock ErrorStrategy returns 429 when message matches trigger."""
        module = _llmock_module(llmock_base_url)

        with pytest.raises(Exception):
            await module.generate_response(
                _make_request(),
                {
                    "model": "myprovider/gpt-4o",
                    "input": 'raise error {"code": 429, "message": "Rate limit exceeded"}',
                },
            )

    @pytest.mark.asyncio
    async def test_non_streaming_error_trigger_500(self, llmock_base_url):
        """llmock ErrorStrategy returns 500 when message matches trigger."""
        module = _llmock_module(llmock_base_url)

        with pytest.raises(Exception):
            await module.generate_response(
                _make_request(),
                {
                    "model": "myprovider/gpt-4o",
                    "input": 'raise error {"code": 500, "message": "Internal server error"}',
                },
            )

    @pytest.mark.asyncio
    async def test_non_streaming_connection_error(self):
        """Connection error when the LLM is unreachable."""
        provider = _make_provider(base_url="http://localhost:1/v1", api_key="unused")
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(
                provider_module=_make_provider_module([provider])
            ),
            config={},
        )

        with pytest.raises(Exception):
            await module.generate_response(
                _make_request(),
                {"model": "myprovider/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_streaming_error_trigger(self, llmock_base_url):
        """Error during streaming when llmock ErrorStrategy is triggered."""
        module = _llmock_module(llmock_base_url)

        gen = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": 'raise error {"code": 500, "message": "Internal server error"}',
                "stream": True,
            },
        )

        with pytest.raises(Exception):
            async for _ in gen:
                pass

    @pytest.mark.asyncio
    async def test_streaming_connection_error(self):
        """Connection error during streaming when LLM is unreachable."""
        provider = _make_provider(base_url="http://localhost:1/v1", api_key="unused")
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(
                provider_module=_make_provider_module([provider])
            ),
            config={},
        )

        gen = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Hi",
                "stream": True,
            },
        )

        with pytest.raises(Exception):
            async for _ in gen:
                pass


# ===================================================================
# 7) Error-path: tool not available / tool errors
# ===================================================================


class TestToolErrors:
    """Errors during tool resolution and tool invocation."""

    @pytest.mark.asyncio
    async def test_unknown_tool_is_silently_skipped(self, llmock_base_url):
        """A tool name not found in the registry is skipped; response still succeeds."""
        registry = Mock()
        registry.get_tool_by_name = AsyncMock(return_value=None)

        module = _llmock_module(llmock_base_url, tool_registry=registry)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Hi",
            "tools": [
                {"type": "function", "function": {"name": "nonexistent_tool"}},
            ],
        }

        result = await module.generate_response(_make_request(), body)

        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_run_error_is_handled_gracefully(self, llmock_base_url):
        """A tool whose run() raises an error does not crash the agent."""

        class _FailingTool(Tool):
            @property
            def definition(self) -> ToolDefinition:
                return ToolDefinition(
                    name="broken_tool",
                    description="Broken",
                    parameters={"type": "object", "properties": {}},
                )

            async def run(self, params: dict[str, Any]) -> Any:
                raise RuntimeError("tool exploded")

        registry = Mock()
        registry.get_tool_by_name = AsyncMock(return_value=_FailingTool())

        module = _llmock_module(llmock_base_url, tool_registry=registry)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Hi",
            "tools": [
                {"type": "function", "function": {"name": "broken_tool"}},
            ],
        }

        result = await module.generate_response(_make_request(), body)

        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_registry_error_propagates(self):
        """If the tool registry raises, the error propagates."""
        registry = Mock()
        registry.get_tool_by_name = AsyncMock(
            side_effect=RuntimeError("Registry unavailable")
        )

        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(tool_registry=registry), config={}
        )
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Hi",
            "tools": [
                {"type": "function", "function": {"name": "calculate"}},
            ],
        }

        with pytest.raises(RuntimeError, match="Registry unavailable"):
            await module.generate_response(_make_request(), body)

    @pytest.mark.asyncio
    async def test_tool_invocation_http_error_agent_handles_gracefully(
        self, llmock_base_url
    ):
        """When a tool URL is unreachable the agent receives a tool error.

        ToolCallStrategy fires exactly once (only when the last conversation
        message is a user message). On the next turn the last message is the
        tool result, so MirrorStrategy takes over and the agent completes.
        """
        definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
            },
        )
        # run_url points to an unreachable port — tool.run() will raise
        tool = _make_tool(
            definition, run_url="http://localhost:1/calculate", run_method="POST"
        )
        registry = Mock()
        registry.get_tool_by_name = AsyncMock(return_value=tool)

        module = _llmock_module(llmock_base_url, tool_registry=registry)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "call tool 'calculate' with '{}'",
            "tools": [{"type": "function", "function": {"name": "calculate"}}],
        }

        result = await module.generate_response(_make_request(), body)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_invocation_success_request_sent_to_tool(
        self, llmock_base_url, httpserver
    ):
        """The tool HTTP endpoint receives the call forwarded by the agent.

        ``pytest-httpserver`` acts as the real tool endpoint — no patching.
        ToolCallStrategy fires exactly once (user-message-only trigger). The
        tool responds; on the next turn the last message is the tool result so
        MirrorStrategy takes over and returns a completed response.
        """
        httpserver.expect_oneshot_request("/calculate").respond_with_json({"result": 4})

        definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
            },
        )
        tool = _make_tool(
            definition, run_url=httpserver.url_for("/calculate"), run_method="POST"
        )
        registry = Mock()
        registry.get_tool_by_name = AsyncMock(return_value=tool)

        module = _llmock_module(llmock_base_url, tool_registry=registry)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "call tool 'calculate' with '{\"expression\": \"2+2\"}'",
            "tools": [{"type": "function", "function": {"name": "calculate"}}],
        }

        result = await module.generate_response(_make_request(), body)
        assert result.status == "completed"
        httpserver.check_assertions()

    @pytest.mark.asyncio
    async def test_partial_tools_resolved_when_some_missing(self, llmock_base_url):
        """When some tools are found and others not, only found tools are used."""
        calc_definition = ToolDefinition(
            name="calculate",
            description="Evaluate a math expression",
            parameters={
                "type": "object",
                "properties": {"expression": {"type": "string"}},
            },
        )
        calc_tool = _make_tool(calc_definition)
        registry = Mock()
        registry.get_tool_by_name = AsyncMock(
            side_effect=lambda name: calc_tool if name == "calculate" else None
        )

        module = _llmock_module(llmock_base_url, tool_registry=registry)
        body = {
            "model": "myprovider/gpt-4o",
            "input": "Do stuff",
            "tools": [
                {"type": "function", "function": {"name": "calculate"}},
                {"type": "function", "function": {"name": "missing_tool"}},
            ],
        }

        result = await module.generate_response(_make_request(), body)

        assert registry.get_tool_by_name.call_count == 2
        assert isinstance(result, openai.types.responses.Response)


# ===================================================================
# 8) Integration tests (require OPENAI_API_KEY in .env)
# ===================================================================


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
class TestRealProviderIntegration:
    """End-to-end tests against a real LLM. Skipped if OPENAI_API_KEY is absent."""

    @staticmethod
    def _real_provider() -> ModelProviderResponse:
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

    @staticmethod
    def _real_model() -> str:
        model = os.environ.get("OPENAI_MODEL", "gpt-4o")
        return f"myopenai/{model}"

    def _real_deps(self) -> ModuleDependencies:
        provider = self._real_provider()
        return _make_dependencies(provider_module=_make_provider_module([provider]))

    @pytest.mark.asyncio
    async def test_non_streaming_integration(self):
        module = StrandsAgentChatModule(dependencies=self._real_deps(), config={})
        body = {
            "model": self._real_model(),
            "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
        }

        result = await module.generate_response(_make_request(), body)

        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"
        assert "Hello" in result.output[0].content[0].text
        assert result.usage.input_tokens > 0
        assert result.usage.output_tokens > 0

    @pytest.mark.asyncio
    async def test_streaming_integration(self):
        module = StrandsAgentChatModule(dependencies=self._real_deps(), config={})
        body = {
            "model": self._real_model(),
            "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
            "stream": True,
        }

        gen = await module.generate_response(_make_request(), body)
        assert hasattr(gen, "__aiter__")

        events = []
        async for event in gen:
            events.append(event)

        assert len(events) >= 3
        assert events[0].type == "response.created"

        full_text = "".join(
            e.delta
            for e in events
            if getattr(e, "type", None) == "response.output_text.delta"
        )
        assert "Hello" in full_text

        assert events[-1].type == "response.completed"
        assert events[-1].response.output[0].content[0].text == full_text


# ---------------------------------------------------------------------------
# Shared helpers / fixtures
# ---------------------------------------------------------------------------


def _make_dependencies(
    provider_module=None,
    tool_registry=None,
) -> ModuleDependencies:
    modules: dict[str, Any] = {
        "llm_provider_module": provider_module or _make_provider_module(),
    }
    if tool_registry is not None:
        modules["tool_registry"] = tool_registry
    return ModuleDependencies(modules)


def _make_request() -> Request:
    return Mock(spec=Request)


def _llmock_module(
    base_url: str,
    tool_registry=None,
) -> StrandsAgentChatModule:
    """Create a ``StrandsAgentChatModule`` pointing at the llmock container."""
    provider = _make_provider(base_url=base_url, api_key=LLMOCK_API_KEY)
    return StrandsAgentChatModule(
        dependencies=_make_dependencies(
            provider_module=_make_provider_module([provider]),
            tool_registry=tool_registry,
        ),
        config={},
    )


def _make_provider_module(providers: list[ModelProviderResponse] | None = None):
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


def _make_provider(
    name: str = "myprovider",
    base_url: str = "https://api.openai.com/v1",
    api_key: str = "sk-test-key",
) -> ModelProviderResponse:
    return ModelProviderResponse(
        id="provider_1",
        type="openai",
        name=name,
        base_url=base_url,
        api_key=api_key,
        properties={},
        created_at=None,
        updated_at=None,
    )
