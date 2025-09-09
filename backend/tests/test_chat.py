from pathlib import Path
import sys
import os
from dotenv import find_dotenv, load_dotenv
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.chat.opean_ai_chat_module import OpenAIChatModule

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))


@pytest.fixture
def client():
    app = FastAPI()
    module = OpenAIChatModule(
        dependencies=ModuleDependencies(),
        config={"openai_client": {"api_key": os.environ["OPENAI_API_KEY"]}},
    )
    app.include_router(module.router)
    return TestClient(app)


@pytest.mark.skipif("OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set")
def test_post_chat_success(client):
    payload = {
        "provider": "open-ai",
        "model": "gpt-4o-2024-08-06",
        "input": [{"role": "user", "content": "Just echo the word 'Hello'"}],
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    expected = {
        "output": [{"text": "Hello", "type": "text"}],
        "id": "1",
        "model": "gpt-4o-2024-08-06",
        "role": "assistant",
        "usage": {"input_tokens": 14, "output_tokens": 1},
    }
    assert response.json() == expected
