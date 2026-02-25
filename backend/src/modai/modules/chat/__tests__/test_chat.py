from pathlib import Path
import os
from dotenv import find_dotenv, load_dotenv
import pytest
import pytest_asyncio
from openai import AsyncOpenAI
from unittest.mock import Mock, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from modai.module import ModuleDependencies
from modai.modules.chat.openai_raw_chat import OpenAILLMChatModule
from modai.modules.chat.web_chat_router import ChatWebModule
from modai.modules.chat.module import ChatLLMModule
from modai.modules.session.module import SessionModule, Session
import openai


class MockBody(dict):
    def __init__(self, model, stream=False):
        super().__init__()
        self["model"] = model
        self["stream"] = stream

    def get(self, key, default=None):
        return super().get(key, default)


class DummyLLMModule(ChatLLMModule):
    """Dummy LLM module for testing purposes."""

    async def generate_response(self, request, body_json):
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
    from modai.modules.model_provider.module import (
        ModelProvidersListResponse,
        ModelProviderResponse,
    )

    # Mock provider module
    mock_provider_module = Mock()
    mock_provider = ModelProviderResponse(
        id="test_provider",
        type="openai",
        name="myopenai",
        base_url="https://api.openai.com/v1",
        api_key=os.environ["OPENAI_API_KEY"],
        properties={},
        created_at=None,
        updated_at=None,
    )
    mock_provider_module.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=[mock_provider],
            total=1,
            limit=None,
            offset=None,
        )
    )

    dependencies = ModuleDependencies({"llm_provider_module": mock_provider_module})

    llm_module = OpenAILLMChatModule(
        dependencies=dependencies,
        config={},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test non-streaming
    body_json = {
        "model": "myopenai/gpt-4o",
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
    from modai.modules.model_provider.module import (
        ModelProvidersListResponse,
        ModelProviderResponse,
    )

    # Mock provider module
    mock_provider_module = Mock()
    mock_provider = ModelProviderResponse(
        id="test_provider",
        type="openai",
        name="myopenai",
        base_url="https://api.openai.com/v1",
        api_key=os.environ["OPENAI_API_KEY"],
        properties={},
        created_at=None,
        updated_at=None,
    )
    mock_provider_module.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=[mock_provider],
            total=1,
            limit=None,
            offset=None,
        )
    )

    dependencies = ModuleDependencies({"llm_provider_module": mock_provider_module})

    llm_module = OpenAILLMChatModule(
        dependencies=dependencies,
        config={},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test streaming
    body_json = {
        "model": "myopenai/gpt-4o",
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

    request.node.callspec.params["openai_client"]
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

    request.node.callspec.params["openai_client"]
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


def _create_chat_mock_session_module():
    """Create a mock session module that validates successfully."""
    session_module = MagicMock(spec=SessionModule)
    session_module.validate_session_for_http.return_value = Session(
        user_id="test-user", additional={}
    )
    return session_module


@pytest.mark.asyncio
async def test_chat_web_module_routing():
    """Test ChatWebModule routing to dummy LLM module."""
    from fastapi import Request

    # Create dummy module
    dummy_module = DummyLLMModule(
        dependencies=ModuleDependencies(),
        config={},
    )

    session_module = _create_chat_mock_session_module()

    # Mock dependencies - include session in modules dict
    mock_dependencies = Mock(spec=ModuleDependencies)
    mock_dependencies.get_module.return_value = dummy_module
    mock_dependencies.modules = {"session": session_module}

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

    session_module = _create_chat_mock_session_module()

    # Mock dependencies - include session in modules dict
    mock_dependencies = Mock(spec=ModuleDependencies)
    mock_dependencies.get_module.return_value = dummy_module
    mock_dependencies.modules = {"session": session_module}

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
async def test_openai_llm_invalid_model_format():
    """Test OpenAILLMChatModule with invalid model format."""
    from fastapi import Request
    from unittest.mock import Mock
    from modai.modules.model_provider.module import (
        ModelProvidersListResponse,
        ModelProviderResponse,
    )

    # Mock provider module
    mock_provider_module = Mock()
    mock_provider = ModelProviderResponse(
        id="test_provider",
        type="openai",
        name="myopenai",
        base_url="https://api.openai.com",
        api_key="test_key",
        properties={},
        created_at=None,
        updated_at=None,
    )
    mock_provider_module.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=[mock_provider],
            total=1,
            limit=None,
            offset=None,
        )
    )

    dependencies = ModuleDependencies()
    dependencies.get_module = Mock(return_value=mock_provider_module)

    llm_module = OpenAILLMChatModule(
        dependencies=dependencies,
        config={"llm_provider_module": "openai_llm_provider"},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test invalid model format (no slash)
    body_json = {
        "model": "invalidmodel",
        "input": [{"role": "user", "content": "Hello"}],
    }

    with pytest.raises(ValueError, match="Invalid model format"):
        await llm_module.generate_response(request, body_json)


@pytest.mark.asyncio
async def test_openai_llm_provider_not_found():
    """Test OpenAILLMChatModule when provider is not found."""
    from fastapi import Request
    from unittest.mock import Mock
    from modai.modules.model_provider.module import ModelProvidersListResponse

    # Mock provider module with no providers
    mock_provider_module = Mock()
    mock_provider_module.get_providers = AsyncMock(
        return_value=ModelProvidersListResponse(
            providers=[],
            total=0,
            limit=None,
            offset=None,
        )
    )

    dependencies = ModuleDependencies()
    dependencies.get_module = Mock(return_value=mock_provider_module)

    llm_module = OpenAILLMChatModule(
        dependencies=dependencies,
        config={"llm_provider_module": "openai_llm_provider"},
    )

    # Mock request
    request = Mock(spec=Request)

    # Test with non-existent provider
    body_json = {
        "model": "nonexistent/gpt-4",
        "input": [{"role": "user", "content": "Hello"}],
    }

    with pytest.raises(ValueError, match="Provider 'nonexistent' not found"):
        await llm_module.generate_response(request, body_json)


def test_responses_endpoint_rejects_unauthenticated_request():
    """The POST /responses endpoint must return 401 without a valid session."""
    from fastapi import FastAPI, HTTPException

    dummy_module = DummyLLMModule(
        dependencies=ModuleDependencies(),
        config={},
    )

    rejecting_session = MagicMock(spec=SessionModule)
    rejecting_session.validate_session_for_http.side_effect = HTTPException(
        status_code=401, detail="Missing, invalid or expired session"
    )

    mock_dependencies = Mock(spec=ModuleDependencies)
    mock_dependencies.get_module.return_value = dummy_module
    mock_dependencies.modules = {"session": rejecting_session}

    web_module = ChatWebModule(
        dependencies=mock_dependencies,
        config={"clients": {"dummy": "dummy_module"}},
    )

    app = FastAPI()
    app.include_router(web_module.router)
    client = TestClient(app)

    response = client.post(
        "/api/responses",
        json={"model": "dummy/test_model", "input": "hello"},
    )
    assert response.status_code == 401
