"""
Tests for Central Model Provider Router.
"""

import sys
import os
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from modai.modules.model_provider.central_router import CentralModelProviderRouter
from modai.modules.model_provider.module import (
    ModelProviderModule,
    ModelProviderResponse,
    ModelProvidersListResponse,
    ModelResponse,
)
from modai.modules.session.module import SessionModule, Session
from modai.module import ModuleDependencies


class DummyModelProviderModule(ModelProviderModule):
    """Dummy implementation of ModelProviderModule for testing"""

    def __init__(self, provider_type: str, providers_data: list, models_data: dict):
        # Mock dependencies and config
        dependencies = ModuleDependencies({})
        config = {}
        super().__init__(dependencies, config, provider_type)
        self.providers_data = providers_data
        self.models_data = models_data

    async def get_providers(self, request=None, limit=None, offset=None):
        return ModelProvidersListResponse(
            providers=self.providers_data,
            total=len(self.providers_data),
            limit=limit,
            offset=offset,
        )

    async def get_provider(self, request=None, provider_id: str = ""):
        for provider in self.providers_data:
            if provider.id == provider_id:
                return provider
        raise Exception("Provider not found")

    async def create_provider(self, request=None, provider_data=None):
        raise NotImplementedError()

    async def update_provider(
        self, request=None, provider_id: str = "", provider_data=None
    ):
        raise NotImplementedError()

    async def get_models(self, request=None, provider_id: str = ""):
        if provider_id in self.models_data:
            return self.models_data[provider_id]
        raise Exception("Models not found")

    async def delete_provider(self, request=None, provider_id: str = ""):
        raise NotImplementedError()


class TestCentralModelProviderRouter:
    """Test class for Central Model Provider Router"""

    @pytest.fixture
    def mock_provider_modules(self):
        """Create mock provider modules"""
        # Create dummy OpenAI provider module
        openai_provider = ModelProviderResponse(
            id="openai-prod",
            type="openai",
            name="OpenAI Production",
            base_url="https://api.openai.com/v1",
            api_key="sk-...",
            properties={},
            created_at="2024-01-15T10:30:00Z",
            updated_at="2024-01-15T10:30:00Z",
        )

        openai_models = ModelResponse(
            data=[
                {
                    "id": "gpt-4",
                    "object": "model",
                    "created": 1686935002,
                    "owned_by": "openai",
                },
                {
                    "id": "gpt-3.5-turbo",
                    "object": "model",
                    "created": 1686935002,
                    "owned_by": "openai",
                },
            ]
        )

        openai_module = DummyModelProviderModule(
            "openai", [openai_provider], {"openai-prod": openai_models}
        )

        # Create dummy Ollama provider module
        ollama_provider = ModelProviderResponse(
            id="ollama-local",
            type="ollama",
            name="Local Ollama",
            base_url="http://localhost:11434",
            api_key="",
            properties={},
            created_at="2024-01-16T14:20:00Z",
            updated_at="2024-01-16T14:20:00Z",
        )

        ollama_models = ModelResponse(
            data=[
                {
                    "id": "llama2",
                    "object": "model",
                    "created": 0,  # No creation timestamp
                    "owned_by": "ollama",
                },
            ]
        )

        ollama_module = DummyModelProviderModule(
            "ollama", [ollama_provider], {"ollama-local": ollama_models}
        )

        return [openai_module, ollama_module]

    @pytest.fixture
    def mock_session_module(self):
        """Create a mock session module that always validates successfully."""
        session_module = MagicMock(spec=SessionModule)
        session_module.validate_session_for_http.return_value = Session(
            user_id="test-user", additional={}
        )
        return session_module

    @pytest.fixture
    def central_router(self, mock_provider_modules, mock_session_module):
        """Create central router instance"""
        dependencies = ModuleDependencies(
            {
                "openai_provider": mock_provider_modules[0],
                "ollama_provider": mock_provider_modules[1],
                "session": mock_session_module,
            }
        )
        config = {}
        return CentralModelProviderRouter(dependencies, config)

    @pytest.fixture
    def test_client(self, central_router):
        """Create FastAPI test client"""
        app = FastAPI()
        app.include_router(central_router.router)
        return TestClient(app)

    def test_get_all_providers_endpoint(self, test_client):
        """Test GET /models/providers endpoint"""
        response = test_client.get("/api/v1/models/providers")

        assert response.status_code == 200
        data = response.json()

        assert "providers" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

        assert len(data["providers"]) == 2  # One from each provider type

        # Check that providers have the expected structure
        provider_types = {p["type"] for p in data["providers"]}
        assert provider_types == {"openai", "ollama"}

    def test_get_all_models_endpoint(self, test_client):
        """Test GET /models endpoint"""
        response = test_client.get("/api/v1/models")

        assert response.status_code == 200
        data = response.json()

        assert "object" in data
        assert data["object"] == "list"
        assert "data" in data

        models = data["data"]
        assert len(models) == 3  # 2 from OpenAI + 1 from Ollama

        # Check model ID format
        model_ids = [m["id"] for m in models]
        assert "openai/OpenAI Production/gpt-4" in model_ids
        assert "openai/OpenAI Production/gpt-3.5-turbo" in model_ids
        assert "ollama/Local Ollama/llama2" in model_ids

        # Check OpenAI-compatible structure
        for model in models:
            assert "id" in model
            assert "object" in model
            assert model["object"] == "model"
            assert "created" in model
            assert "owned_by" in model

    def test_get_all_providers_with_pagination(self, test_client):
        """Test GET /api/v1/models/providers with pagination"""
        response = test_client.get("/api/v1/models/providers?limit=1&offset=0")

        assert response.status_code == 200
        data = response.json()

        assert len(data["providers"]) == 1
        assert data["total"] == 2
        assert data["limit"] == 1
        assert data["offset"] == 0

    def test_get_all_providers_empty(self, mock_session_module):
        """Test GET /models/providers with no provider modules"""
        dependencies = ModuleDependencies({"session": mock_session_module})
        config = {}
        router = CentralModelProviderRouter(dependencies, config)

        app = FastAPI()
        app.include_router(router.router)
        client = TestClient(app)

        response = client.get("/api/v1/models/providers")

        assert response.status_code == 200
        data = response.json()

        assert data["providers"] == []
        assert data["total"] == 0

    def test_get_all_models_empty(self, mock_session_module):
        """Test GET /models with no provider modules"""
        dependencies = ModuleDependencies({"session": mock_session_module})
        config = {}
        router = CentralModelProviderRouter(dependencies, config)

        app = FastAPI()
        app.include_router(router.router)
        client = TestClient(app)

        response = client.get("/api/v1/models")

        assert response.status_code == 200
        data = response.json()

        assert data["object"] == "list"
        assert data["data"] == []

    def test_all_endpoints_reject_unauthenticated_requests(self):
        """All central model provider endpoints must return 401 without a valid session."""
        from fastapi import HTTPException

        rejecting_session = MagicMock(spec=SessionModule)
        rejecting_session.validate_session_for_http.side_effect = HTTPException(
            status_code=401, detail="Missing, invalid or expired session"
        )

        dependencies = ModuleDependencies({"session": rejecting_session})
        router = CentralModelProviderRouter(dependencies, config={})

        app = FastAPI()
        app.include_router(router.router)
        client = TestClient(app)

        endpoints = [
            ("GET", "/api/v1/models/providers"),
            ("GET", "/api/v1/models"),
        ]

        for method, path in endpoints:
            response = client.request(method, path)
            assert response.status_code == 401, (
                f"{method} {path} returned {response.status_code}, expected 401"
            )
