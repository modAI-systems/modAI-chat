from pathlib import Path
import sys
import os
import json
from dotenv import find_dotenv, load_dotenv
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from fastapi import FastAPI
from openai import AsyncOpenAI
import httpx

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.chat.opean_ai_chat_module import OpenAIChatModule

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))


@pytest_asyncio.fixture
async def openai_client(request):
    client_type = request.param
    if client_type == "backend_proxy":
        app = FastAPI()
        module = OpenAIChatModule(
            dependencies=ModuleDependencies(),
            config={"openai_client": {"api_key": os.environ["OPENAI_API_KEY"]}},
        )
        app.include_router(module.router)
        async_client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        )
        openai_client = AsyncOpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
            http_client=async_client,
            base_url="http://testserver/api/v1",
        )
        yield openai_client
        await async_client.aclose()
    elif client_type == "direct":
        openai_client = AsyncOpenAI(
            api_key=os.environ["OPENAI_API_KEY"],
        )
        yield openai_client
    else:
        raise ValueError(f"Unknown client type: {client_type}")


@pytest.mark.parametrize("openai_client", ["backend_proxy", "direct"], indirect=True)
@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_chat_responses_api(openai_client: AsyncOpenAI):
    """Test chat responses API."""

    # Make the request
    response = await openai_client.responses.create(
        model="gpt-4o",
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


@pytest.mark.parametrize("openai_client", ["backend_proxy", "direct"], indirect=True)
@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
@pytest.mark.asyncio
async def test_chat_responses_api_streaming(openai_client: AsyncOpenAI):
    """Test streaming chat responses API against the openai endpoint."""

    # Make the streaming request
    stream = await openai_client.responses.create(
        model="gpt-4o",
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
