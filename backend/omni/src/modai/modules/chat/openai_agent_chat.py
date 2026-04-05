"""
Strands Agent Chat Module: ChatLLMModule implementation using Strands Agents SDK.

Routes OpenAI-compatible requests through the Strands Agent framework with
OpenAI model provider. Supports external tool microservices via the Tool
Registry — requested tools are resolved, wrapped as Strands agent tools,
and invoked over HTTP during the agent's reasoning loop.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import Request
from openai.types.responses import (
    Response as OpenAIResponse,
    ResponseCompletedEvent,
    ResponseCreatedEvent,
    ResponseStreamEvent as OpenAIResponseStreamEvent,
    ResponseTextDeltaEvent,
    ResponseTextDoneEvent,
)
from strands import Agent
from strands.models import OpenAIModel
from strands.tools.tools import PythonAgentTool
from strands.types.tools import ToolResult, ToolSpec, ToolUse

from modai.module import ModuleDependencies
from modai.modules.chat.module import ChatLLMModule
from modai.modules.model_provider.module import (
    ModelProviderModule,
    ModelProviderResponse,
)
from modai.modules.tools.module import ToolRegistryModule

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant."


class StrandsAgentChatModule(ChatLLMModule):
    """Strands Agent LLM Provider for Chat Responses.

    Implements the ChatLLMModule interface using the Strands Agents SDK
    with OpenAI model provider.  Supports external tool microservices
    via an optional Tool Registry dependency.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        self.provider_module: ModelProviderModule = dependencies.get_module(
            "llm_provider_module"
        )
        if not self.provider_module:
            raise ValueError(
                "StrandsAgentChatModule requires 'llm_provider_module' module dependency"
            )

        self.tool_registry: ToolRegistryModule | None = dependencies.get_module(
            "tool_registry"
        )

    async def generate_response(
        self, request: Request, body_json: dict[str, Any]
    ) -> OpenAIResponse | AsyncGenerator[OpenAIResponseStreamEvent, None]:
        provider_name, actual_model = _parse_model(body_json.get("model", ""))
        provider = await self._resolve_provider(request, provider_name)
        additional_tool_properties = _extract_additional_tool_properties(request)
        tools = await _resolve_request_tools(
            body_json,
            self.tool_registry,
            additional_tool_properties=additional_tool_properties,
        )
        agent = _create_agent(provider, actual_model, body_json, tools)
        user_message = _extract_last_user_message(body_json)

        if body_json.get("stream", False):
            return _generate_streaming_response(agent, user_message, actual_model)
        else:
            return await _generate_non_streaming_response(
                agent, user_message, actual_model
            )

    async def _resolve_provider(
        self, request: Request, provider_name: str
    ) -> ModelProviderResponse:
        """Look up the provider by name from the provider module."""
        providers_response = await self.provider_module.get_providers(
            request=request, limit=None, offset=None
        )
        for p in providers_response.providers:
            if p.name == provider_name:
                return p
        raise ValueError(f"Provider '{provider_name}' not found")


# ---------------------------------------------------------------------------
# Pure helper functions (module-private)
# ---------------------------------------------------------------------------


def _parse_model(model: str) -> tuple[str, str]:
    """Parse ``provider_name/model_name`` into its components."""
    parts = model.split("/", maxsplit=1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(
            f"Invalid model format: {model}. Expected 'provider_name/model_name'"
        )
    return parts[0], parts[1]


def _extract_additional_tool_properties(request: Request) -> dict[str, Any]:
    """Extract caller-supplied metadata from the request to inject into tool calls.

    Returns a dict of ``_``-prefixed keys that are merged into every tool
    invocation's ``params`` dict.  Tool implementations consume these reserved
    keys (e.g. for HTTP headers) without forwarding them to the payload.

    Currently extracted properties:
    - ``_bearer_token``: raw token from the ``Authorization: Bearer`` header.
    """
    properties: dict[str, Any] = {}
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        properties["_bearer_token"] = auth_header[len("Bearer ") :]
    return properties


def _create_agent(
    provider: ModelProviderResponse,
    model_id: str,
    body_json: dict[str, Any],
    tools: list[PythonAgentTool] | None = None,
) -> Agent:
    """Build a fresh Strands ``Agent`` for this request."""
    client_args: dict[str, Any] = {"api_key": provider.api_key}
    if provider.base_url:
        client_args["base_url"] = provider.base_url

    model = OpenAIModel(model_id=model_id, client_args=client_args)

    system_prompt = body_json.get("instructions") or DEFAULT_SYSTEM_PROMPT
    prior_messages = _build_conversation_history(body_json)

    return Agent(
        model=model,
        system_prompt=system_prompt,
        messages=prior_messages or None,
        tools=tools or [],
        retry_strategy=None,  # For now, now retry handling. Could be added in the future if needed.
        callback_handler=None,  # suppress default stdout printing
    )


def _build_conversation_history(
    body_json: dict[str, Any],
) -> list[dict[str, Any]]:
    """Convert the ``input`` field into Strands-style messages.

    All messages *except* the last user message are returned as prior
    history — the last user message is passed as the ``prompt`` argument
    when invoking the agent.
    """
    input_data = body_json.get("input", "")
    if isinstance(input_data, str) or not isinstance(input_data, list):
        return []
    if len(input_data) <= 1:
        return []
    return [
        _to_strands_message(msg) for msg in input_data[:-1] if isinstance(msg, dict)
    ]


def _extract_last_user_message(body_json: dict[str, Any]) -> str:
    """Return the text of the last user message from ``input``."""
    input_data = body_json.get("input", "")
    if isinstance(input_data, str):
        return input_data
    if isinstance(input_data, list) and input_data:
        return _message_text(input_data[-1])
    return ""


def _to_strands_message(msg: dict[str, Any]) -> dict[str, Any]:
    """Convert a single OpenAI Responses API message to Strands format."""
    role = msg.get("role", "user")
    text = _message_text(msg)
    return {"role": role, "content": [{"text": text}]}


def _message_text(msg: Any) -> str:
    """Extract plain text from a message dict."""
    if isinstance(msg, str):
        return msg
    if isinstance(msg, dict):
        content = msg.get("content", "")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            texts = [
                c.get("text", "")
                for c in content
                if isinstance(c, dict)
                and c.get("type") in ("input_text", "text", "output_text")
            ]
            return " ".join(texts)
    return ""


# ---------------------------------------------------------------------------
# Tool resolution helpers
# ---------------------------------------------------------------------------


def _extract_tools(body_json: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract tool specs from the OpenAI Responses API request body.

    Expects the flat Responses API format: {type: "function", name: "..."}
    Returns the full spec dicts so callers can forward description and parameters
    to the LLM unchanged.
    """
    tools = body_json.get("tools", [])
    return [
        tool
        for tool in tools
        if isinstance(tool, dict)
        and tool.get("type") == "function"
        and tool.get("name")
    ]


async def _resolve_request_tools(
    body_json: dict[str, Any],
    tool_registry: ToolRegistryModule | None,
    additional_tool_properties: dict[str, Any] | None = None,
) -> list[PythonAgentTool]:
    """Resolve requested tools from the request body into Strands agent tools.

    For each tool name in the request, the corresponding ``ToolDefinition``
    is looked up in the registry and wrapped as a ``PythonAgentTool`` that
    invokes the tool microservice over HTTP.

    ``additional_tool_properties`` is a dict of ``_``-prefixed keys extracted
    from the request (see ``_extract_additional_tool_properties``) that are
    merged into every tool invocation's params dict.

    Returns an empty list when no registry is configured or no tools are
    requested.
    """
    if not tool_registry:
        return []

    tool_specs = _extract_tools(body_json)
    if not tool_specs:
        return []

    return [
        _create_strands_tool(
            client_spec=client_spec,
            tool_registry=tool_registry,
            additional_tool_properties=additional_tool_properties,
        )
        for client_spec in tool_specs
    ]


def _create_strands_tool(
    client_spec: dict[str, Any],
    tool_registry: ToolRegistryModule,
    additional_tool_properties: dict[str, Any] | None = None,
) -> PythonAgentTool:
    """Wrap a client-provided tool spec as a Strands ``PythonAgentTool``.

    The tool spec (name, description, input schema) is taken entirely from
    ``client_spec`` — whatever the API client sent is forwarded to the LLM
    verbatim.  Execution is handled lazily: when Strands invokes the tool,
    the registry is queried by name and ``tool.run`` is called.

    ``additional_tool_properties`` (a dict of ``_``-prefixed keys) is merged
    into every invocation's params dict so that tool implementations can pick
    up transport-level concerns (auth, tracing, etc.) without the interface
    carrying extra args.
    """
    name: str = client_spec.get("name", "")

    tool_spec: ToolSpec = {
        "name": name,
        "description": client_spec.get("description", ""),
        "inputSchema": {
            "json": client_spec.get("parameters", {"type": "object", "properties": {}})
        },
    }

    async def _handler(tool_use: ToolUse, **kwargs: Any) -> ToolResult:
        """Invoke the tool and wrap the result for Strands."""
        tool = await tool_registry.get_tool_by_name(
            name, predefined_params=additional_tool_properties
        )
        if tool is None:
            logger.warning("Tool '%s' not found in registry at execution time", name)
            return {
                "toolUseId": tool_use["toolUseId"],
                "status": "error",
                "content": [{"text": f"Tool '{name}' is not available"}],
            }
        params: dict[str, Any] = dict(tool_use["input"])
        if additional_tool_properties:
            params.update(additional_tool_properties)
        try:
            result = await tool.run(params)
            return {
                "toolUseId": tool_use["toolUseId"],
                "status": "success",
                "content": [{"text": str(result)}],
            }
        except Exception as exc:
            logger.error("Tool '%s' invocation failed: %s", name, exc)
            return {
                "toolUseId": tool_use["toolUseId"],
                "status": "error",
                "content": [{"text": f"Tool invocation failed: {exc}"}],
            }

    return PythonAgentTool(
        tool_name=name,
        tool_spec=tool_spec,
        tool_func=_handler,
    )


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------


def _response_id() -> str:
    return f"resp_{uuid.uuid4().hex[:24]}"


def _item_id() -> str:
    return f"msg_{uuid.uuid4().hex[:24]}"


def _build_openai_response(
    text: str,
    model: str,
    response_id: str,
    msg_id: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
) -> OpenAIResponse:
    """Construct a fully-formed ``openai.types.responses.Response``."""
    return OpenAIResponse.model_validate(
        {
            "id": response_id,
            "object": "response",
            "created_at": datetime.now(timezone.utc).timestamp(),
            "model": model,
            "status": "completed",
            "parallel_tool_calls": True,
            "tool_choice": "auto",
            "tools": [],
            "output": [
                {
                    "type": "message",
                    "id": msg_id,
                    "role": "assistant",
                    "content": [
                        {
                            "type": "output_text",
                            "text": text,
                            "annotations": [],
                        }
                    ],
                    "status": "completed",
                }
            ],
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "input_tokens_details": {"cached_tokens": 0},
                "output_tokens_details": {"reasoning_tokens": 0},
            },
        }
    )


# ---------------------------------------------------------------------------
# Non-streaming
# ---------------------------------------------------------------------------


async def _generate_non_streaming_response(
    agent: Agent, user_message: str, model: str
) -> OpenAIResponse:
    """Run the agent synchronously (in a thread) and return an OpenAI Response."""
    result = await asyncio.to_thread(agent, user_message)

    text_output = str(result).strip()

    input_tokens = 0
    output_tokens = 0
    if hasattr(result, "metrics") and hasattr(result.metrics, "accumulated_usage"):
        usage = result.metrics.accumulated_usage
        input_tokens = usage.get("inputTokens", 0)
        output_tokens = usage.get("outputTokens", 0)

    return _build_openai_response(
        text=text_output,
        model=model,
        response_id=_response_id(),
        msg_id=_item_id(),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )


# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------


async def _generate_streaming_response(
    agent: Agent, user_message: str, model: str
) -> AsyncGenerator[OpenAIResponseStreamEvent, None]:
    """Stream text-delta events from the agent, book-ended by created/completed."""
    resp_id = _response_id()
    msg_id = _item_id()
    seq = 0

    # --- response.created ---------------------------------------------------
    stub_response = OpenAIResponse(
        id=resp_id,
        created_at=datetime.now(timezone.utc).timestamp(),
        model=model,
        object="response",
        output=[],
        parallel_tool_calls=True,
        tool_choice="auto",
        tools=[],
        status="in_progress",
    )
    yield ResponseCreatedEvent(
        response=stub_response, sequence_number=seq, type="response.created"
    )
    seq += 1

    # --- text deltas ---------------------------------------------------------
    full_text = ""

    async for event in agent.stream_async(user_message):
        chunk = event.get("data", "") if isinstance(event, dict) else ""
        if not chunk:
            continue
        full_text += chunk
        yield ResponseTextDeltaEvent(
            content_index=0,
            delta=chunk,
            item_id=msg_id,
            logprobs=[],
            output_index=0,
            sequence_number=seq,
            type="response.output_text.delta",
        )
        seq += 1

    # --- response.output_text.done ------------------------------------------
    yield ResponseTextDoneEvent(
        content_index=0,
        item_id=msg_id,
        logprobs=[],
        output_index=0,
        sequence_number=seq,
        text=full_text,
        type="response.output_text.done",
    )
    seq += 1

    # --- response.completed --------------------------------------------------
    completed_response = _build_openai_response(
        text=full_text,
        model=model,
        response_id=resp_id,
        msg_id=msg_id,
    )
    yield ResponseCompletedEvent(
        response=completed_response,
        sequence_number=seq,
        type="response.completed",
    )
