"""Parameterised tests for chat modules.

Exercises both ``StrandsAgentChatModule`` and ``OpenAILLMChatModule`` through
a shared public interface to ensure behavioural equivalence.  Tests are
parametrised over:

  * StrandsAgentChatModule + llmock   (always runs)
  * OpenAILLMChatModule   + llmock   (always runs)
  * StrandsAgentChatModule + OpenAI  (requires OPENAI_API_KEY)
  * OpenAILLMChatModule   + OpenAI  (requires OPENAI_API_KEY)

Module-specific test groups use a narrower parameter set:
  * TestAgenticLoop      — strands-only (StrandsAgentChatModule drives the
                           tool-execution loop autonomously)
  * TestRawToolCalling   — openai-raw-only (OpenAILLMChatModule returns tool
                           calls in the response without executing them)

No test body contains conditionals that inspect which module class is in use.
"""

import json
import os
import time
from dataclasses import dataclass
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
from modai.modules.chat.openai_raw_chat import OpenAILLMChatModule
from modai.modules.model_provider.module import (
    ModelProviderResponse,
    ModelProvidersListResponse,
)

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))

# ---------------------------------------------------------------------------
# llmock container config
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

# ---------------------------------------------------------------------------
# Parametrisation IDs
# ---------------------------------------------------------------------------

_AGENTIC_LLMOCK = "agentic_llmock"
_NON_AGENTIC_LLMOCK = "non_agentic_llmock"
_AGENTIC_OPENAI = "agentic_openai"
_NON_AGENTIC_OPENAI = "non_agentic_openai"

_HAS_OPENAI_KEY = bool(os.environ.get("OPENAI_API_KEY"))
_SKIP_NO_KEY = pytest.mark.skipif(not _HAS_OPENAI_KEY, reason="OPENAI_API_KEY not set")

_ALL_PARAMS = [
    _AGENTIC_LLMOCK,
    _NON_AGENTIC_LLMOCK,
    pytest.param(_AGENTIC_OPENAI, marks=_SKIP_NO_KEY),
    pytest.param(_NON_AGENTIC_OPENAI, marks=_SKIP_NO_KEY),
]

_AGENTIC_ONLY_PARAMS = [
    _AGENTIC_LLMOCK,
    pytest.param(_AGENTIC_OPENAI, marks=_SKIP_NO_KEY),
]

_NON_AGENTIC_ONLY_PARAMS = [
    _NON_AGENTIC_LLMOCK,
    pytest.param(_NON_AGENTIC_OPENAI, marks=_SKIP_NO_KEY),
]

# Both module classes, llmock backend only (no OpenAI key required).
_LLMOCK_ONLY_PARAMS = [_AGENTIC_LLMOCK, _NON_AGENTIC_LLMOCK]

# Agentic module with llmock only — for tool-call execution tests that require
# deterministic LLM behaviour (llmock ToolCallStrategy always calls the tool).
_AGENTIC_LLMOCK_ONLY_PARAMS = [_AGENTIC_LLMOCK]

# ---------------------------------------------------------------------------
# Module factory
# ---------------------------------------------------------------------------


@dataclass
class ModuleFactory:
    """Creates module instances with optional tool registry.

    ``model`` is the fully-qualified model string for the underlying backend
    (e.g. ``"myprovider/gpt-4o"`` for llmock or ``"myopenai/gpt-4o"`` for
    a real OpenAI provider).
    """

    module_class: type
    provider_module: Any
    model: str

    def create(self, tool_registry: Any = None) -> Any:
        """Instantiate the module, optionally wiring in a tool registry."""
        deps = _make_dependencies(
            provider_module=self.provider_module,
            tool_registry=tool_registry,
        )
        return self.module_class(dependencies=deps, config={})


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def llmock_base_url(
    request: pytest.FixtureRequest, tmp_path_factory: pytest.TempPathFactory
) -> str:
    """llmock container (module-scoped)."""
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


@pytest.fixture(params=_ALL_PARAMS)
def module_factory(
    request: pytest.FixtureRequest, llmock_base_url: str
) -> ModuleFactory:
    return _build_module_factory(request.param, llmock_base_url)


@pytest.fixture(params=_AGENTIC_ONLY_PARAMS)
def agentic_factory(
    request: pytest.FixtureRequest, llmock_base_url: str
) -> ModuleFactory:
    return _build_module_factory(request.param, llmock_base_url)


@pytest.fixture(params=_NON_AGENTIC_ONLY_PARAMS)
def non_agentic_factory(
    request: pytest.FixtureRequest, llmock_base_url: str
) -> ModuleFactory:
    return _build_module_factory(request.param, llmock_base_url)


@pytest.fixture(params=_LLMOCK_ONLY_PARAMS)
def llmock_only_factory(
    request: pytest.FixtureRequest, llmock_base_url: str
) -> ModuleFactory:
    """All module classes, llmock backend only (no OpenAI key required)."""
    return _build_module_factory(request.param, llmock_base_url)


@pytest.fixture(params=_AGENTIC_LLMOCK_ONLY_PARAMS)
def agentic_llmock_factory(
    request: pytest.FixtureRequest, llmock_base_url: str
) -> ModuleFactory:
    """Agentic module with llmock only — tool call behaviour is deterministic."""
    return _build_module_factory(request.param, llmock_base_url)


@pytest.fixture(
    params=[
        pytest.param(StrandsAgentChatModule, id="agentic"),
        pytest.param(OpenAILLMChatModule, id="non_agentic"),
    ]
)
def any_module(request: pytest.FixtureRequest) -> Any:
    """Both module classes with a default mock provider — no LLM backend needed."""
    module_class = request.param
    return module_class(dependencies=_make_dependencies(), config={})


@pytest.fixture(
    params=[
        pytest.param(StrandsAgentChatModule, id="agentic"),
        pytest.param(OpenAILLMChatModule, id="non_agentic"),
    ]
)
def broken_module(request: pytest.FixtureRequest) -> Any:
    """Both module classes pointing at an unreachable LLM server."""
    module_class = request.param
    provider = _make_provider(base_url="http://localhost:1/", api_key="unused")
    return module_class(
        dependencies=_make_dependencies(
            provider_module=_make_provider_module([provider])
        ),
        config={},
    )


# ===================================================================
# 1) Non-streaming happy path  (all module/backend combinations)
# ===================================================================


class TestResponsesNonStreamingHappyPath:
    """``generate_response`` with ``stream=False`` returns a completed Response.

    Runs for every module/backend combination.
    """

    @pytest.mark.asyncio
    async def test_response_is_completed(self, module_factory: ModuleFactory):
        module = module_factory.create()
        result = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Hi"},
        )
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_response_contains_expected_text(self, module_factory: ModuleFactory):
        """Response text contains the requested word.

        llmock MirrorStrategy echoes the entire user message (which contains
        the word 'hello'); real LLMs respond with the requested word.
        """
        module = module_factory.create()
        result = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Just say the word 'hello'"},
        )
        assert result.status == "completed"
        assert "hello" in result.output[0].content[0].text.lower()

    @pytest.mark.asyncio
    async def test_response_reports_token_usage(self, module_factory: ModuleFactory):
        module = module_factory.create()
        result = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Hi"},
        )
        assert result.usage.input_tokens > 0
        assert result.usage.output_tokens > 0
        assert result.usage.total_tokens > 0

    @pytest.mark.asyncio
    async def test_multi_turn_conversation_succeeds(
        self, module_factory: ModuleFactory
    ):
        module = module_factory.create()
        result = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": [
                    {"role": "user", "content": "Hi"},
                    {"role": "assistant", "content": "Hello!"},
                    {"role": "user", "content": "How are you?"},
                ],
            },
        )
        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_system_prompt_in_instructions_field(
        self, module_factory: ModuleFactory
    ):
        module = module_factory.create()
        result = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": "Hi",
                "instructions": "You are a helpful assistant.",
            },
        )
        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_multi_turn_uses_previous_context(
        self, module_factory: ModuleFactory
    ):
        """Second turn with conversation history produces the expected response.

        First turn asks to echo 'hello'; second turn (with history) asks to echo
        'world'.  llmock MirrorStrategy echoes the last user message (which
        contains 'world'); real LLMs follow the instruction.
        """
        module = module_factory.create()

        first_result = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Just echo the word 'hello'"},
        )
        assert first_result.status == "completed"
        first_text = first_result.output[0].content[0].text

        second_result = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": [
                    {"role": "user", "content": "Just echo the word 'hello'"},
                    {"role": "assistant", "content": first_text},
                    {"role": "user", "content": "Now echo the word 'world'"},
                ],
            },
        )
        assert isinstance(second_result, openai.types.responses.Response)
        assert second_result.status == "completed"
        assert "world" in second_result.output[0].content[0].text.lower()


# ===================================================================
# 2) Streaming happy path  (all module/backend combinations)
# ===================================================================


class TestResponsesStreamingHappyPath:
    """``generate_response`` with ``stream=True`` returns an async generator.

    Runs for every module/backend combination.
    """

    @pytest.mark.asyncio
    async def test_stream_produces_multiple_events(self, module_factory: ModuleFactory):
        module = module_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Hi", "stream": True},
        )
        events = [e async for e in gen]
        assert len(events) > 2

    @pytest.mark.asyncio
    async def test_stream_text_contains_expected_word(
        self, module_factory: ModuleFactory
    ):
        """Assembled stream text contains the requested word.

        llmock MirrorStrategy echoes the entire user message (which contains
        the word 'hello'); real LLMs respond with the requested word.
        """
        module = module_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": "Just say the word 'hello'",
                "stream": True,
            },
        )
        events = [e async for e in gen]
        full_text = "".join(
            e.delta
            for e in events
            if getattr(e, "type", None) == "response.output_text.delta"
        )
        assert "hello" in full_text.lower()

    @pytest.mark.asyncio
    async def test_stream_last_event_is_completed(self, module_factory: ModuleFactory):
        module = module_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Hi", "stream": True},
        )
        events = [e async for e in gen]
        assert events[-1].type == "response.completed"

    @pytest.mark.asyncio
    async def test_stream_completed_event_has_valid_response(
        self, module_factory: ModuleFactory
    ):
        module = module_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Hi", "stream": True},
        )
        events = [e async for e in gen]
        completed = events[-1]
        assert isinstance(completed.response, openai.types.responses.Response)
        assert completed.response.status == "completed"

    @pytest.mark.asyncio
    async def test_multi_turn_streaming_succeeds(self, module_factory: ModuleFactory):
        module = module_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": [
                    {"role": "user", "content": "Hi"},
                    {"role": "assistant", "content": "Hello!"},
                    {"role": "user", "content": "How are you?"},
                ],
                "stream": True,
            },
        )
        events = [e async for e in gen]
        assert events[-1].type == "response.completed"

    @pytest.mark.asyncio
    async def test_multi_turn_streaming_uses_previous_context(
        self, module_factory: ModuleFactory
    ):
        """Multi-turn: first turn non-streaming, second turn streaming with history.

        Second turn asks to echo 'world'; assembled delta text must contain 'world'.
        llmock MirrorStrategy echoes the last user message (which contains 'world');
        real LLMs follow the instruction.
        """
        module = module_factory.create()

        first_result = await module.generate_response(
            _make_request(),
            {"model": module_factory.model, "input": "Just echo the word 'hello'"},
        )
        assert first_result.status == "completed"
        first_text = first_result.output[0].content[0].text

        gen = await module.generate_response(
            _make_request(),
            {
                "model": module_factory.model,
                "input": [
                    {"role": "user", "content": "Just echo the word 'hello'"},
                    {"role": "assistant", "content": first_text},
                    {"role": "user", "content": "Now echo the word 'world'"},
                ],
                "stream": True,
            },
        )
        events = [e async for e in gen]
        full_text = "".join(
            e.delta
            for e in events
            if getattr(e, "type", None) == "response.output_text.delta"
        )
        assert "world" in full_text.lower()
        assert events[-1].type == "response.completed"


# ===================================================================
# 3) Raw tool calling  (OpenAILLMChatModule only)
# ===================================================================

# Tools in OpenAI Responses API format (flat, not nested under a "function" key).
# OpenAILLMChatModule forwards body_json directly to client.responses.create().
_RESPONSES_API_CALCULATE_TOOL: dict[str, Any] = {
    "type": "function",
    "name": "calculate",
    "description": "Evaluate a math expression",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {"type": "string", "description": "Math expression"}
        },
        "required": ["expression"],
    },
}


class TestRawToolCalling:
    """Tool calls are returned in the response output without being executed.

    Only applicable to ``OpenAILLMChatModule``, which forwards the raw
    Responses API response without running an agentic tool-execution loop.
    """

    @pytest.mark.asyncio
    async def test_tool_call_appears_in_non_streaming_response(
        self, non_agentic_factory: ModuleFactory
    ):
        module = non_agentic_factory.create()
        result = await module.generate_response(
            _make_request(),
            {
                "model": non_agentic_factory.model,
                "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
                "tools": [_RESPONSES_API_CALCULATE_TOOL],
            },
        )
        function_calls = [
            item for item in result.output if item.type == "function_call"
        ]
        assert len(function_calls) >= 1
        assert function_calls[0].name == "calculate"

    @pytest.mark.asyncio
    async def test_tool_call_arguments_are_parseable(
        self, non_agentic_factory: ModuleFactory
    ):
        module = non_agentic_factory.create()
        result = await module.generate_response(
            _make_request(),
            {
                "model": non_agentic_factory.model,
                "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
                "tools": [_RESPONSES_API_CALCULATE_TOOL],
            },
        )
        function_calls = [
            item for item in result.output if item.type == "function_call"
        ]
        assert len(function_calls) >= 1
        args = json.loads(function_calls[0].arguments)
        assert "expression" in args

    @pytest.mark.asyncio
    async def test_streaming_tool_call_arguments_done_event_present(
        self, non_agentic_factory: ModuleFactory
    ):
        module = non_agentic_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {
                "model": non_agentic_factory.model,
                "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
                "tools": [_RESPONSES_API_CALCULATE_TOOL],
                "stream": True,
            },
        )
        events = [e async for e in gen]
        tool_done_events = [
            e
            for e in events
            if getattr(e, "type", None) == "response.function_call_arguments.done"
        ]
        assert len(tool_done_events) >= 1


# ===================================================================
# 4) Agentic loop  (StrandsAgentChatModule only)
# ===================================================================

# Tools in Responses API format ({type, name}).
# The client is responsible for the full spec; description and parameters
# may be omitted, in which case the LLM sees empty values.
_AGENTIC_CALCULATE_TOOL: dict[str, Any] = {
    "type": "function",
    "name": "calculate",
}


class TestAgenticLoop:
    """The agentic loop executes tool calls autonomously and runs to completion.

    Only applicable to ``StrandsAgentChatModule``, which drives a Strands
    Agent that invokes tool microservices and feeds results back into the
    conversation until a final text response is produced.
    """

    @pytest.mark.asyncio
    async def test_tool_is_executed_during_non_streaming_loop(
        self, agentic_llmock_factory: ModuleFactory
    ):
        captured_calls: list[dict] = []

        async def _run_tool(request: Any, params: dict[str, Any]) -> str:
            captured_calls.append(dict(params))
            return "42"

        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=_run_tool)

        module = agentic_llmock_factory.create(tool_registry=registry)
        result = await module.generate_response(
            _make_request(),
            {
                "model": agentic_llmock_factory.model,
                "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
                "tools": [_AGENTIC_CALCULATE_TOOL],
            },
        )

        assert result.status == "completed"
        assert len(captured_calls) >= 1

    @pytest.mark.asyncio
    async def test_tool_is_executed_during_streaming_loop(
        self, agentic_llmock_factory: ModuleFactory
    ):
        captured_calls: list[dict] = []

        async def _run_tool(request: Any, params: dict[str, Any]) -> str:
            captured_calls.append(dict(params))
            return "42"

        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=_run_tool)

        module = agentic_llmock_factory.create(tool_registry=registry)
        gen = await module.generate_response(
            _make_request(),
            {
                "model": agentic_llmock_factory.model,
                "input": "call tool 'calculate' with '{\"expression\": \"6*7\"}'",
                "tools": [_AGENTIC_CALCULATE_TOOL],
                "stream": True,
            },
        )
        events = [e async for e in gen]

        assert events[-1].type == "response.completed"
        assert len(captured_calls) >= 1


# ===================================================================
# 5) Model and provider errors  (all module/backend combinations)
# ===================================================================


class TestModelAndProviderErrors:
    """Errors when the model string is malformed or the provider is unknown.

    Runs for every module class; no LLM backend is needed because errors
    are raised before any network call.
    """

    @pytest.mark.asyncio
    async def test_invalid_model_format_no_slash(self, any_module: Any):
        with pytest.raises(ValueError, match="Invalid model format"):
            await any_module.generate_response(
                _make_request(),
                {"model": "gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_invalid_model_format_empty_provider(self, any_module: Any):
        with pytest.raises(ValueError, match="Invalid model format"):
            await any_module.generate_response(
                _make_request(),
                {"model": "/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_invalid_model_format_empty_model(self, any_module: Any):
        with pytest.raises(ValueError, match="Invalid model format"):
            await any_module.generate_response(
                _make_request(),
                {"model": "provider/", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_provider_not_found(self, any_module: Any):
        with pytest.raises(ValueError, match="Provider 'unknown' not found"):
            await any_module.generate_response(
                _make_request(),
                {"model": "unknown/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "module_class",
        [
            pytest.param(StrandsAgentChatModule, id="agentic"),
            pytest.param(OpenAILLMChatModule, id="non_agentic"),
        ],
    )
    async def test_provider_module_raises_propagates(self, module_class: type):
        """If the provider module itself raises, the error propagates."""
        provider_module = Mock()
        provider_module.get_providers = AsyncMock(
            side_effect=RuntimeError("DB connection lost")
        )
        module = module_class(
            dependencies=_make_dependencies(provider_module=provider_module), config={}
        )
        with pytest.raises(RuntimeError, match="DB connection lost"):
            await module.generate_response(
                _make_request(),
                {"model": "myprovider/gpt-4o", "input": "Hi"},
            )


# ===================================================================
# 6) LLM errors  (all module/backend combinations)
# ===================================================================


class TestLLMErrors:
    """Errors during the actual LLM call.

    Error trigger tests use llmock's ErrorStrategy; connection error tests use
    an unreachable server.  Both streaming and non-streaming paths are covered.
    """

    @pytest.mark.asyncio
    async def test_non_streaming_error_429(self, llmock_only_factory: ModuleFactory):
        """llmock ErrorStrategy returns 429 when message matches trigger phrase."""
        module = llmock_only_factory.create()
        with pytest.raises(Exception):
            await module.generate_response(
                _make_request(),
                {
                    "model": llmock_only_factory.model,
                    "input": 'raise error {"code": 429, "message": "Rate limit exceeded"}',
                },
            )

    @pytest.mark.asyncio
    async def test_non_streaming_error_500(self, llmock_only_factory: ModuleFactory):
        """llmock ErrorStrategy returns 500 when message matches trigger phrase."""
        module = llmock_only_factory.create()
        with pytest.raises(Exception):
            await module.generate_response(
                _make_request(),
                {
                    "model": llmock_only_factory.model,
                    "input": 'raise error {"code": 500, "message": "Internal server error"}',
                },
            )

    @pytest.mark.asyncio
    async def test_non_streaming_connection_error(self, broken_module: Any):
        """Connection error when the LLM is unreachable."""
        with pytest.raises(Exception):
            await broken_module.generate_response(
                _make_request(),
                {"model": "myprovider/gpt-4o", "input": "Hi"},
            )

    @pytest.mark.asyncio
    async def test_streaming_error_trigger(self, llmock_only_factory: ModuleFactory):
        """Error during streaming when llmock ErrorStrategy is triggered."""
        module = llmock_only_factory.create()
        gen = await module.generate_response(
            _make_request(),
            {
                "model": llmock_only_factory.model,
                "input": 'raise error {"code": 500, "message": "Internal server error"}',
                "stream": True,
            },
        )
        with pytest.raises(Exception):
            async for _ in gen:
                pass

    @pytest.mark.asyncio
    async def test_streaming_connection_error(self, broken_module: Any):
        """Connection error during streaming when LLM is unreachable."""
        gen = await broken_module.generate_response(
            _make_request(),
            {"model": "myprovider/gpt-4o", "input": "Hi", "stream": True},
        )
        with pytest.raises(Exception):
            async for _ in gen:
                pass


# ===================================================================
# 7) Tool errors  (agentic module only)
# ===================================================================


class TestToolErrors:
    """Errors during tool resolution and tool invocation (agentic loop only).

    Only ``StrandsAgentChatModule`` executes tools; ``OpenAILLMChatModule``
    returns raw tool calls without executing them.
    """

    @pytest.mark.asyncio
    async def test_unknown_tool_is_silently_skipped(
        self, agentic_factory: ModuleFactory
    ):
        """A tool unavailable in the registry returns an error result; agent still completes.

        The tool spec from the client is registered with Strands regardless of
        registry availability.  When the LLM calls the tool and the registry
        cannot find it, the handler returns a graceful error result and the
        agent continues to a final text response.
        """
        registry = Mock()
        registry.run_tool = AsyncMock(
            side_effect=ValueError("Tool 'nonexistent_tool' not found")
        )
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "Hi",
            "tools": [
                {"type": "function", "name": "nonexistent_tool"},
            ],
        }
        result = await module.generate_response(_make_request(), body)
        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_run_error_is_handled_gracefully(
        self, agentic_factory: ModuleFactory
    ):
        """A tool whose run() raises an error does not crash the agent."""

        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=RuntimeError("tool exploded"))
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "Hi",
            "tools": [
                {"type": "function", "name": "broken_tool"},
            ],
        }
        result = await module.generate_response(_make_request(), body)
        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_registry_error_handled_gracefully(
        self, agentic_factory: ModuleFactory
    ):
        """A registry error during tool execution is handled gracefully; agent completes.

        The registry is only queried lazily when the LLM actually invokes a
        tool.  Strands catches handler exceptions and returns a tool error
        result so the agent can continue to a final text response.
        """
        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=RuntimeError("Registry unavailable"))
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "call tool 'calculate' with '{\"expression\": \"1+1\"}'",
            "tools": [
                {"type": "function", "name": "calculate"},
            ],
        }
        result = await module.generate_response(_make_request(), body)
        assert isinstance(result, openai.types.responses.Response)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_invocation_http_error_handled_gracefully(
        self, agentic_factory: ModuleFactory
    ):
        """When a tool URL is unreachable the agent receives a tool error and completes."""
        registry = Mock()
        registry.run_tool = AsyncMock(
            side_effect=httpx_lib.ConnectError("Connection refused")
        )
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "call tool 'calculate' with '{}'",
            "tools": [{"type": "function", "name": "calculate"}],
        }
        result = await module.generate_response(_make_request(), body)
        assert result.status == "completed"

    @pytest.mark.asyncio
    async def test_tool_invocation_success_request_sent_to_tool(
        self, agentic_factory: ModuleFactory, httpserver
    ):
        """The tool HTTP endpoint receives the call forwarded by the agent."""
        httpserver.expect_oneshot_request("/calculate").respond_with_json({"result": 4})

        async def _run_tool_http(request: Any, params: dict[str, Any]) -> str:
            async with httpx_lib.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    httpserver.url_for("/calculate"),
                    json=params.get("arguments", {}),
                )
                resp.raise_for_status()
                return resp.text

        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=_run_tool_http)
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "call tool 'calculate' with '{\"expression\": \"2+2\"}'",
            "tools": [{"type": "function", "name": "calculate"}],
        }
        result = await module.generate_response(_make_request(), body)
        assert result.status == "completed"
        httpserver.check_assertions()

    @pytest.mark.asyncio
    async def test_partial_tools_resolved_when_some_missing(
        self, agentic_factory: ModuleFactory
    ):
        """All client tool specs are registered with Strands; missing registry tools
        return an error result at execution time without preventing other tools."""

        async def _run_tool_partial(request: Any, params: dict[str, Any]) -> Any:
            name = params.get("name")
            if name == "calculate":
                return "42"
            raise ValueError(f"Tool '{name}' not found")

        registry = Mock()
        registry.run_tool = AsyncMock(side_effect=_run_tool_partial)
        module = agentic_factory.create(tool_registry=registry)
        body = {
            "model": agentic_factory.model,
            "input": "Do stuff",
            "tools": [
                {"type": "function", "name": "calculate"},
                {"type": "function", "name": "missing_tool"},
            ],
        }
        result = await module.generate_response(_make_request(), body)
        assert isinstance(result, openai.types.responses.Response)


# ===================================================================
# 8) Tool spec pass-through  (StrandsAgentChatModule only)
# ===================================================================


class TestToolSpecPassThrough:
    """The tool spec from the client request is forwarded to the LLM unchanged.

    Only ``StrandsAgentChatModule`` assembles a tool spec for the Strands
    agent loop.  The ``description`` and ``parameters`` provided by the
    client in the request ``tools`` array MUST reach the LLM verbatim; the
    registry definition is only used for execution (``run``), not for
    defining the tool's interface that the LLM sees.

    Uses the llmock ``/history`` endpoint to inspect the exact request body
    that was forwarded to the LLM, without any additional HTTP mocking.
    """

    @pytest.fixture(autouse=True)
    def clear_history(self, llmock_base_url: str) -> None:
        httpx_lib.delete(f"{llmock_base_url}history")

    @pytest.mark.asyncio
    async def test_client_description_forwarded_to_llm(self, llmock_base_url: str):
        """Tool description from client spec reaches LLM instead of registry's."""

        registry = Mock()
        registry.run_tool = AsyncMock(return_value="42")

        provider = _make_provider(base_url=llmock_base_url, api_key=LLMOCK_API_KEY)
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(
                provider_module=_make_provider_module([provider]),
                tool_registry=registry,
            ),
            config={},
        )

        result = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Hi",
                "tools": [
                    {
                        "type": "function",
                        "name": "calculate",
                        "description": "CLIENT description — must reach LLM unchanged",
                        "parameters": {
                            "type": "object",
                            "properties": {"expression": {"type": "string"}},
                            "required": ["expression"],
                        },
                    }
                ],
            },
        )

        assert result.status == "completed"
        history = httpx_lib.get(f"{llmock_base_url}history").json()["requests"]
        chat_requests = [r for r in history if r["path"] == "/chat/completions"]
        assert chat_requests[0]["body"]["tools"] == [
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "CLIENT description — must reach LLM unchanged",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                # Strands adds a default description for properties
                                # that don't have one ("Property {name}").
                                "description": "Property expression",
                            }
                        },
                        "required": ["expression"],
                    },
                },
            }
        ]

    @pytest.mark.asyncio
    async def test_client_parameters_forwarded_to_llm(self, llmock_base_url: str):
        """Tool parameters schema from client spec reaches LLM instead of registry's."""

        registry = Mock()
        registry.run_tool = AsyncMock(return_value="42")

        provider = _make_provider(base_url=llmock_base_url, api_key=LLMOCK_API_KEY)
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(
                provider_module=_make_provider_module([provider]),
                tool_registry=registry,
            ),
            config={},
        )

        result = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Hi",
                "tools": [
                    {
                        "type": "function",
                        "name": "calculate",
                        "description": "Do math",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "expression": {
                                    "type": "string",
                                    "description": "Math expr",
                                }
                            },
                            "required": ["expression"],
                        },
                    }
                ],
            },
        )

        assert result.status == "completed"
        history = httpx_lib.get(f"{llmock_base_url}history").json()["requests"]
        chat_requests = [r for r in history if r["path"] == "/chat/completions"]
        assert chat_requests[0]["body"]["tools"] == [
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "Do math",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "Math expr",
                            }
                        },
                        "required": ["expression"],
                    },
                },
            }
        ]

    @pytest.mark.asyncio
    async def test_client_only_name_sends_empty_description_to_llm(
        self, llmock_base_url: str
    ):
        """When client sends only a tool name (no description/parameters), the
        LLM receives a tool with empty description — the registry is never
        consulted for spec information."""

        registry = Mock()
        registry.run_tool = AsyncMock(return_value="42")

        provider = _make_provider(base_url=llmock_base_url, api_key=LLMOCK_API_KEY)
        module = StrandsAgentChatModule(
            dependencies=_make_dependencies(
                provider_module=_make_provider_module([provider]),
                tool_registry=registry,
            ),
            config={},
        )

        result = await module.generate_response(
            _make_request(),
            {
                "model": "myprovider/gpt-4o",
                "input": "Hi",
                # Client sends only the tool name — no description or parameters
                "tools": [{"type": "function", "name": "calculate"}],
            },
        )

        assert result.status == "completed"
        history = httpx_lib.get(f"{llmock_base_url}history").json()["requests"]
        chat_requests = [r for r in history if r["path"] == "/chat/completions"]
        assert chat_requests[0]["body"]["tools"] == [
            {
                "type": "function",
                "function": {
                    "name": "calculate",
                    "description": "",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        # Strands adds "required": [] when the field is absent.
                        "required": [],
                    },
                },
            }
        ]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _build_module_factory(param_id: str, llmock_base_url: str) -> ModuleFactory:
    if param_id == _AGENTIC_LLMOCK:
        return ModuleFactory(
            module_class=StrandsAgentChatModule,
            provider_module=_make_provider_module(
                [_make_provider(base_url=llmock_base_url, api_key=LLMOCK_API_KEY)]
            ),
            model="myprovider/gpt-4o",
        )
    if param_id == _NON_AGENTIC_LLMOCK:
        return ModuleFactory(
            module_class=OpenAILLMChatModule,
            provider_module=_make_provider_module(
                [_make_provider(base_url=llmock_base_url, api_key=LLMOCK_API_KEY)]
            ),
            model="myprovider/gpt-4o",
        )
    if param_id == _AGENTIC_OPENAI:
        return ModuleFactory(
            module_class=StrandsAgentChatModule,
            provider_module=_make_provider_module([_real_provider()]),
            model=_real_model(),
        )
    if param_id == _NON_AGENTIC_OPENAI:
        return ModuleFactory(
            module_class=OpenAILLMChatModule,
            provider_module=_make_provider_module([_real_provider()]),
            model=_real_model(),
        )
    raise ValueError(f"Unknown param_id: {param_id}")


def _make_dependencies(
    provider_module: Any = None,
    tool_registry: Any = None,
) -> ModuleDependencies:
    modules: dict[str, Any] = {
        "llm_provider_module": provider_module or _make_provider_module(),
    }
    if tool_registry is not None:
        modules["tool_registry"] = tool_registry
    return ModuleDependencies(modules)


def _make_request(authorization: str | None = None) -> Request:
    mock = Mock(spec=Request)
    mock.headers.get.side_effect = lambda name, default="": (
        authorization if name == "Authorization" and authorization else default
    )
    return mock


def _make_provider_module(providers: list[ModelProviderResponse] | None = None) -> Any:
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


def _real_provider() -> ModelProviderResponse:
    return ModelProviderResponse(
        id="real_provider",
        type="openai",
        name="myopenai",
        base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        properties={},
        created_at=None,
        updated_at=None,
    )


def _real_model() -> str:
    model = os.environ.get("OPENAI_MODEL", "gpt-4o")
    return f"myopenai/{model}"


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
