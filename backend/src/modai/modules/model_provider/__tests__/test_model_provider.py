"""
Tests for LLM Provider Module REST API endpoints.
"""

import os
import pytest
from pathlib import Path
from dotenv import find_dotenv, load_dotenv
from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from modai.modules.model_provider.openai_provider import OpenAIProviderModule
from modai.modules.model_provider_store.module import ModelProvider, ModelProviderStore
from modai.modules.session.module import SessionModule, Session
from modai.module import ModuleDependencies
from unittest.mock import MagicMock
from datetime import datetime

working_dir = Path.cwd()
load_dotenv(find_dotenv(str(working_dir / ".env")))

# Force anyio to use asyncio backend only
anyio_backend = pytest.fixture(scope="session")(lambda: "asyncio")


class TestModelProviderModule:
    """Test class for Model Provider Module"""

    @pytest.fixture
    def mock_provider_store(self) -> ModelProviderStore:
        """Create a mock Model provider store"""
        mock_store = AsyncMock()

        # Include API key in properties when testing models
        properties = {"key": "value", "model": "test-model"}
        if "OPENAI_API_KEY" in os.environ:
            properties["api_key"] = os.environ["OPENAI_API_KEY"]

        # Sample provider data with OpenAI URL and API key
        sample_provider = ModelProvider(
            id="test-id-123",
            name="TestProvider",
            url="https://api.openai.com/v1",
            properties=properties,
            created_at=datetime(2024, 1, 1, 12, 0, 0),
            updated_at=datetime(2024, 1, 1, 12, 0, 0),
        )

        # Configure mock methods
        mock_store.get_providers.return_value = [sample_provider]
        mock_store.get_provider.return_value = sample_provider
        mock_store.add_provider.return_value = sample_provider
        mock_store.update_provider.return_value = sample_provider
        mock_store.delete_provider.return_value = None

        return mock_store

    @pytest.fixture
    def mock_session_module(self) -> SessionModule:
        """Create a mock session module that always validates successfully."""
        session_module = MagicMock(spec=SessionModule)
        session_module.validate_session_for_http.return_value = Session(
            user_id="test-user", additional={}
        )
        return session_module

    @pytest.fixture
    def web_module(
        self,
        mock_provider_store: ModelProviderStore,
        mock_session_module: SessionModule,
    ) -> OpenAIProviderModule:
        """Create web module instance"""
        dependencies = ModuleDependencies(
            {"llm_provider_store": mock_provider_store, "session": mock_session_module}
        )
        config = {"llm_provider_store_module": "llm_provider_store"}
        return OpenAIProviderModule(dependencies, config)

    @pytest.fixture
    def test_client(self, web_module: OpenAIProviderModule) -> TestClient:
        """Create FastAPI test client"""
        app = FastAPI()
        app.include_router(web_module.router)
        return TestClient(app)

    def test_web_module_missing_dependency(self) -> None:
        """Test web module with missing dependency"""
        deps = ModuleDependencies({})

        with pytest.raises(
            ValueError,
            match="DefaultModelProviderModule requires 'llm_provider_store' module dependency",
        ):
            OpenAIProviderModule(deps, {})

    def test_get_providers_endpoint(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /api/models/providers/openai endpoint"""
        response = test_client.get("/api/models/providers/openai")

        assert response.status_code == 200
        data = response.json()

        assert "providers" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

        assert len(data["providers"]) == 1
        provider = data["providers"][0]
        assert provider["id"] == "test-id-123"
        assert provider["name"] == "TestProvider"
        assert provider["base_url"] == "https://api.openai.com/v1"
        assert provider["properties"]["key"] == "value"
        # Verify that api_key is available as a direct field
        assert "api_key" in provider
        # Verify that api_key is not in properties
        assert "api_key" not in provider["properties"]

        # Verify the mock was called correctly
        mock_provider_store.get_providers.assert_called_once_with(
            limit=None, offset=None
        )

    def test_get_providers_with_pagination(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /models/providers/openai with pagination parameters"""
        response = test_client.get("/api/models/providers/openai?limit=10&offset=5")

        assert response.status_code == 200
        data = response.json()

        assert data["limit"] == 10
        assert data["offset"] == 5

        # Verify pagination parameters were passed to the store
        mock_provider_store.get_providers.assert_called_once_with(limit=10, offset=5)

    def test_get_providers_invalid_pagination(self, test_client):
        """Test GET /models/providers/openai with invalid pagination parameters"""
        # Test negative offset
        response = test_client.get("/api/models/providers/openai?offset=-1")
        assert response.status_code == 422

        # Test limit too large
        response = test_client.get("/api/models/providers/openai?limit=2000")
        assert response.status_code == 422

        # Test limit too small
        response = test_client.get("/api/models/providers/openai?limit=0")
        assert response.status_code == 422

    def test_get_provider_by_id(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /models/providers/openai/{id} endpoint"""
        response = test_client.get("/api/models/providers/openai/test-id-123")

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == "test-id-123"
        assert data["name"] == "TestProvider"
        assert data["base_url"] == "https://api.openai.com/v1"
        assert data["properties"]["key"] == "value"
        # Verify that api_key is available as a direct field
        assert "api_key" in data
        # Verify that api_key is not in properties
        assert "api_key" not in data["properties"]
        assert data["created_at"] == "2024-01-01T12:00:00"
        assert data["updated_at"] == "2024-01-01T12:00:00"

        mock_provider_store.get_provider.assert_called_once_with("test-id-123")

    def test_get_provider_not_found(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /models/providers/openai/{id} for non-existent provider"""
        mock_provider_store.get_provider.return_value = None

        response = test_client.get("/api/models/providers/openai/nonexistent")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_create_provider(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test POST /models/providers/openai endpoint for creating new provider"""
        request_data = {
            "name": "NewProvider",
            "base_url": "https://api.new.com",
            "api_key": "test-api-key-123",
            "properties": {"model": "new-model", "temperature": 0.8},
        }

        response = test_client.post("/api/models/providers/openai", json=request_data)

        assert response.status_code == 201
        data = response.json()

        assert data["id"] == "test-id-123"  # From mock
        assert data["name"] == "TestProvider"  # From mock

        # Verify that api_key is available as a direct field
        assert "api_key" in data
        # Verify that api_key is not in properties
        assert "api_key" not in data["properties"]

        # Verify the store was called with correct parameters (including api_key in properties)
        expected_properties = {
            "model": "new-model",
            "temperature": 0.8,
            "api_key": "test-api-key-123",
        }
        mock_provider_store.add_provider.assert_called_once_with(
            name="NewProvider",
            url="https://api.new.com",
            properties=expected_properties,
        )

    def test_create_provider_validation_error(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test POST /models/providers/openai with validation error"""
        mock_provider_store.add_provider.side_effect = ValueError(
            "Provider name already exists"
        )

        request_data = {
            "name": "DuplicateName",
            "base_url": "https://api.test.com",
            "api_key": "test-api-key",
            "properties": {},
        }

        response = test_client.post("/api/models/providers/openai", json=request_data)

        assert response.status_code == 400
        data = response.json()
        assert "already exists" in data["detail"]

    def test_create_provider_missing_fields(self, test_client: TestClient) -> None:
        """Test POST /models/providers/openai with missing required fields"""
        # Missing name
        response = test_client.post(
            "/api/models/providers/openai",
            json={"base_url": "https://api.test.com", "api_key": "test-key"},
        )
        assert response.status_code == 422

        # Missing base_url
        response = test_client.post(
            "/api/models/providers/openai",
            json={"name": "TestProvider", "api_key": "test-key"},
        )
        assert response.status_code == 422

        # Missing api_key
        response = test_client.post(
            "/api/models/providers/openai",
            json={"name": "TestProvider", "base_url": "https://api.test.com"},
        )
        assert response.status_code == 422

    def test_update_provider(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test PUT /models/providers/openai/{provider_id} endpoint for updating existing provider"""
        request_data = {
            "name": "UpdatedProvider",
            "base_url": "https://api.updated.com",
            "api_key": "updated-api-key",
            "properties": {"model": "updated-model"},
        }

        response = test_client.put(
            "/api/models/providers/openai/existing-id", json=request_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == "test-id-123"  # From mock return

        # Verify that api_key is available as a direct field
        assert "api_key" in data
        # Verify that api_key is not in properties
        assert "api_key" not in data["properties"]

        # Verify the store was called with correct parameters (including api_key in properties)
        expected_properties = {"model": "updated-model", "api_key": "updated-api-key"}
        mock_provider_store.update_provider.assert_called_once_with(
            provider_id="existing-id",
            name="UpdatedProvider",
            url="https://api.updated.com",
            properties=expected_properties,
        )

    def test_update_provider_not_found(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test PUT /models/providers/openai/{provider_id} when provider doesn't exist"""
        mock_provider_store.update_provider.return_value = None

        request_data = {
            "name": "UpdatedName",
            "base_url": "https://api.updated.com",
            "api_key": "updated-api-key",
            "properties": {},
        }
        response = test_client.put(
            "/api/models/providers/openai/nonexistent-id", json=request_data
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_delete_provider(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test DELETE /models/providers/openai/{id} endpoint"""
        response = test_client.delete("/api/models/providers/openai/test-id-123")

        assert response.status_code == 204
        assert response.content == b""  # No content for 204

        # Verify the store was called with correct ID
        mock_provider_store.delete_provider.assert_called_once_with("test-id-123")

    def test_delete_provider_idempotent(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test DELETE /models/providers/openai/{id} is idempotent"""
        # Even if provider doesn't exist, should return 204
        response = test_client.delete("/api/models/providers/openai/nonexistent")

        assert response.status_code == 204
        mock_provider_store.delete_provider.assert_called_once_with("nonexistent")

    def test_endpoint_error_handling(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test error handling for unexpected exceptions - now raises Exception"""
        mock_provider_store.get_providers.side_effect = Exception(
            "Database connection failed"
        )

        # Since we removed try-catch, exceptions now bubble up and get raised by test client
        with pytest.raises(Exception, match="Database connection failed"):
            test_client.get("/api/models/providers/openai")

    def test_complex_properties_handling(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test handling of complex properties in requests and responses"""
        complex_properties = {
            "authentication": {"type": "oauth2", "scopes": ["read", "write"]},
            "models": ["model1", "model2"],
            "config": {"temperature": 0.7, "max_tokens": 2000},
        }

        request_data = {
            "name": "ComplexProvider",
            "base_url": "https://api.complex.com",
            "api_key": "complex-api-key",
            "properties": complex_properties,
        }

        response = test_client.post("/api/models/providers/openai", json=request_data)

        assert response.status_code == 201

        # Verify complex properties and api_key were passed correctly
        expected_properties = complex_properties.copy()
        expected_properties["api_key"] = "complex-api-key"
        mock_provider_store.add_provider.assert_called_once_with(
            name="ComplexProvider",
            url="https://api.complex.com",
            properties=expected_properties,
        )

    @pytest.mark.skipif(
        "OPENAI_API_KEY" not in os.environ, reason="OPENAI_API_KEY not set"
    )
    def test_get_models_endpoint(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /models/providers/openai/{provider_id}/models endpoint"""
        response = test_client.get("/api/models/providers/openai/test-id-123/models")

        assert response.status_code == 200
        data = response.json()

        assert "object" in data
        assert "data" in data
        assert data["object"] == "list"
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1

        # Check model structure (OpenAI-compatible)
        model = data["data"][0]
        assert "id" in model
        assert "object" in model
        assert "created" in model
        assert "owned_by" in model
        assert model["object"] == "model"

        # Verify the provider store was called to check provider exists
        mock_provider_store.get_provider.assert_called_with("test-id-123")

    def test_get_models_provider_not_found(
        self, test_client: TestClient, mock_provider_store: ModelProviderStore
    ) -> None:
        """Test GET /models/providers/openai/{provider_id}/models for non-existent provider"""
        mock_provider_store.get_provider.return_value = None

        response = test_client.get("/api/models/providers/openai/nonexistent/models")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_all_endpoints_reject_unauthenticated_requests(
        self, mock_provider_store: ModelProviderStore
    ) -> None:
        """All model provider endpoints must return 401 without a valid session."""
        from fastapi import HTTPException

        # Create a session module that always rejects
        rejecting_session = MagicMock(spec=SessionModule)
        rejecting_session.validate_session_for_http.side_effect = HTTPException(
            status_code=401, detail="Missing, invalid or expired session"
        )

        dependencies = ModuleDependencies(
            {"llm_provider_store": mock_provider_store, "session": rejecting_session}
        )
        module = OpenAIProviderModule(
            dependencies, {"llm_provider_store_module": "llm_provider_store"}
        )

        app = FastAPI()
        app.include_router(module.router)
        client = TestClient(app)

        provider_body = {
            "name": "Test",
            "base_url": "https://api.test.com",
            "api_key": "key",
        }

        endpoints = [
            ("GET", "/api/models/providers/openai"),
            ("POST", "/api/models/providers/openai", provider_body),
            ("GET", "/api/models/providers/openai/some-id"),
            ("PUT", "/api/models/providers/openai/some-id", provider_body),
            ("DELETE", "/api/models/providers/openai/some-id"),
            ("GET", "/api/models/providers/openai/some-id/models"),
        ]

        for entry in endpoints:
            method, path = entry[0], entry[1]
            json_body = entry[2] if len(entry) > 2 else None
            response = client.request(method, path, json=json_body)
            assert response.status_code == 401, (
                f"{method} {path} returned {response.status_code}, expected 401"
            )
