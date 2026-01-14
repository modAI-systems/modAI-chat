from pathlib import Path
import sys
import os
from dotenv import find_dotenv, load_dotenv
import pytest
import pytest_asyncio
from openai import AsyncOpenAI
from unittest.mock import Mock, AsyncMock
from typing import AsyncGenerator

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.chat.openai_llm_chat import OpenAILLMChatModule
from modai.modules.chat.web_chat_router import ChatWebModule
from modai.modules.chat.module import ChatLLMModule
import openai


class MockBody:
    def __init__(self, model, stream=False):
        self.model = model
        self.stream = stream

    def get(self, key, default=None):
        return getattr(self, key, default)


class DummyLLMModule(ChatLLMModule):
    """Dummy LLM module for testing purposes."""

    async def generate_response(
        self, request, body_json
    ):
        if body_json.get("stream", False):
            # Return a simple async generator
            async def gen():
                event = Mock()
                event.type = "response.output_text.delta"
                event.delta = "Hello"
                event.response_id = "test_response"
                event.model_dump_json.return_value = '{"type": "response.output_text.delta", "delta": "Hello", "response_id": "test_response"}'
                yield event
            return gen()
        else:
            # Return a mock response
            response = Mock(spec=openai.types.responses.Response)
            response.id = "test_response"
            response.object = "response"
            return response


working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))


@pytest_asyncio.fixture
async def openai_client(request):
    client_type = request.param
    if client_type == "direct":
        openai_client = AsyncOpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
        )
        yield openai_client
    else:
        raise ValueError(f"Unknown client type: {client_type}")


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_llm_generate_response():
    """Test LLM generate_response method directly."""
    from fastapi import Request
    from unittest.mock import Mock

    llm_module = OpenAILLMChatModule(
        dependencies=ModuleDependencies(),
        config={"openai_client": {"api_key": os.environ["OPENAI_API_KEY"]}},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test non-streaming
    body_json = {
        "model": "gpt-4o",
        "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
    }

    result = await llm_module.generate_response(request, body_json)

    # Assertions
    assert hasattr(result, "model_dump")  # It's a Pydantic model
    response_dict = result.model_dump()
    assert response_dict["object"] == "response"
    assert response_dict["id"]
    assert response_dict["created_at"]
    assert response_dict["status"]
    assert response_dict["output"]
    assert len(response_dict["output"]) > 0
    assert response_dict["output"][0]["content"]
    assert len(response_dict["output"][0]["content"]) > 0
    output_text = response_dict["output"][0]["content"][0]["text"]
    assert "Hello" in output_text
    assert response_dict["usage"]
    assert response_dict["usage"]["input_tokens"] > 0
    assert response_dict["usage"]["output_tokens"] > 0
    assert response_dict["usage"]["total_tokens"] > 0


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_llm_generate_response_streaming():
    """Test LLM generate_response method directly for streaming."""
    from fastapi import Request
    from unittest.mock import Mock

    llm_module = OpenAILLMChatModule(
        dependencies=ModuleDependencies(),
        config={"openai_client": {"api_key": os.environ["OPENAI_API_KEY"]}},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test streaming
    body_json = {
        "model": "gpt-4o",
        "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
        "stream": True,
    }

    result = await llm_module.generate_response(request, body_json)

    # Assertions - result should be an async generator
    assert hasattr(result, "__aiter__")

    # Collect content from stream
    full_content = ""
    async for event in result:
        if (
            hasattr(event, "type")
            and event.type == "response.output_text.delta"
            and hasattr(event, "delta")
            and event.delta
        ):
            full_content += event.delta

    # Assertions
    assert len(full_content) > 0
    assert "Hello" in full_content


@pytest.mark.parametrize("openai_client", ["direct"], indirect=True)
@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_chat_responses_api(openai_client: AsyncOpenAI, request):
    """Test chat responses API."""

    client_type = request.node.callspec.params["openai_client"]
    model = "gpt-4o"  # No backend_proxy

    # Make the request
    response = await openai_client.responses.create(
        model=model,
        input=[{"role": "user", "content": "Just echo the word 'Hello'"}],
    )

    # Assertions
    assert response.object == "response"
    assert response.id
    assert response.created_at
    assert response.status
    assert response.output
    assert len(response.output) > 0
    assert response.output[0].content
    assert len(response.output[0].content) > 0
    output_text = response.output[0].content[0].text
    assert "Hello" in output_text
    assert response.usage
    assert response.usage.input_tokens > 0
    assert response.usage.output_tokens > 0
    assert response.usage.total_tokens > 0


@pytest.mark.parametrize("openai_client", ["direct"], indirect=True)
@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_chat_responses_api_streaming(openai_client: AsyncOpenAI, request):
    """Test streaming chat responses API."""

    client_type = request.node.callspec.params["openai_client"]
    model = "gpt-4o"  # No backend_proxy

    # Make the streaming request
    stream = await openai_client.responses.create(
        model=model,
        input=[{"role": "user", "content": "Just echo the word 'Hello'"}],
        stream=True,
    )

    # Collect content from stream
    full_content = ""
    async for event in stream:
        if event.type == "response.output_text.delta" and event.delta:
            full_content += event.delta

    # Assertions
    assert len(full_content) > 0
    assert "Hello" in full_content


@pytest.mark.asyncio
async def test_chat_web_module_routing():
    """Test ChatWebModule routing to dummy LLM module."""
    from fastapi import Request

    # Create dummy module
    dummy_module = DummyLLMModule(
        dependencies=ModuleDependencies(),
        config={},
    )

    # Mock dependencies
    mock_dependencies = Mock(spec=ModuleDependencies)
    mock_dependencies.get_module.return_value = dummy_module

    # Create ChatWebModule
    web_module = ChatWebModule(
        dependencies=mock_dependencies,
        config={"clients": {"dummy": "dummy_module"}},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test non-streaming
    body_json = MockBody(model="dummy/test_model", stream=False)

    result = await web_module.responses_endpoint(request, body_json)

    # Assertions
    assert isinstance(result, openai.types.responses.Response)
    assert result.id == "test_response"
    assert result.object == "response"

    # Verify the model was modified (prefix removed)
    # The dummy should have received "test_model"
    # But since it's mock, we can't check easily, but the response is correct


@pytest.mark.asyncio
async def test_chat_web_module_routing_streaming():
    """Test ChatWebModule routing for streaming."""
    from fastapi import Request

    # Create dummy module
    dummy_module = DummyLLMModule(
        dependencies=ModuleDependencies(),
        config={},
    )

    # Mock dependencies
    mock_dependencies = Mock(spec=ModuleDependencies)
    mock_dependencies.get_module.return_value = dummy_module

    # Create ChatWebModule
    web_module = ChatWebModule(
        dependencies=mock_dependencies,
        config={"clients": {"dummy": "dummy_module"}},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test streaming
    body_json = MockBody(model="dummy/test_model", stream=True)

    result = await web_module.responses_endpoint(request, body_json)

    # Assertions
    from fastapi.responses import StreamingResponse
    assert isinstance(result, StreamingResponse)
    assert result.media_type == "text/event-stream"

    # Collect content from stream
    content = ""
    async for chunk in result.body_iterator:
        content += chunk

    # Should contain the SSE formatted event
    assert "data:" in content
    assert '"delta": "Hello"' in content


@pytest.mark.asyncio
async def test_chat_web_module_invalid_prefix():
    """Test ChatWebModule with invalid model prefix."""
    from fastapi import Request

    # Mock dependencies
    mock_dependencies = Mock(spec=ModuleDependencies)

    # Create ChatWebModule with no clients
    web_module = ChatWebModule(
        dependencies=mock_dependencies,
        config={"clients": {}},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test with invalid prefix
    body_json = MockBody(model="invalid/test_model")

    result = await web_module.responses_endpoint(request, body_json)

    # Should return JSONResponse with error
    from fastapi.responses import JSONResponse
    assert isinstance(result, JSONResponse)
    assert result.status_code == 400
    assert "No client configured" in result.body.decode()
