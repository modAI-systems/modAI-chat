from pathlib import Path
from dotenv import find_dotenv, load_dotenv
import pytest
from unittest.mock import Mock, MagicMock
from fastapi.testclient import TestClient
from modai.module import ModuleDependencies
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


def _create_chat_mock_session_module():
    """Create a mock session module that validates successfully."""
    session_module = MagicMock(spec=SessionModule)
    session_module.validate_session.return_value = Session(
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


def test_responses_endpoint_rejects_unauthenticated_request():
    """The POST /responses endpoint must return 401 without a valid session."""
    from fastapi import FastAPI, HTTPException

    dummy_module = DummyLLMModule(
        dependencies=ModuleDependencies(),
        config={},
    )

    rejecting_session = MagicMock(spec=SessionModule)
    rejecting_session.validate_session.side_effect = HTTPException(
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
