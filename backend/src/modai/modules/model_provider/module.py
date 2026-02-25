"""
model provider Module: Web interface for model provider management.
This module provides REST API endpoints for managing model provider configurations.
"""

from abc import ABC, abstractmethod
from typing import Any, List, Optional
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from modai.module import ModaiModule, ModuleDependencies


class ModelProviderResponse(BaseModel):
    """Response model for model Provider data"""

    id: str
    type: str
    name: str
    base_url: str
    api_key: str
    properties: dict[str, Any]
    created_at: str | None
    updated_at: str | None


class ModelProviderCreateRequest(BaseModel):
    """Request model for creating or updating model Provider"""

    name: str
    base_url: str
    api_key: str
    properties: dict[str, Any] = {}


class ModelProvidersListResponse(BaseModel):
    """Response model for provider list"""

    providers: List[ModelProviderResponse]
    total: int
    limit: int | None
    offset: int | None


class Model(BaseModel):
    """Model data from a provider (OpenAI-compatible)"""

    id: str
    object: str = "model"
    created: int
    owned_by: str


class ModelResponse(BaseModel):
    """Response model for models from a provider (OpenAI-compatible)"""

    object: str = "list"
    data: List[Model]


class ModelProviderModule(ModaiModule, ABC):
    """
    Module Declaration for: Model Provider (Web Module)

    Web module for Model Provider management providing REST endpoints.
    This module provides HTTP API access to Model provider management operations.
    It depends on a ModelProviderStore module for actual data operations.
    """

    def __init__(
        self,
        dependencies: ModuleDependencies,
        config: dict[str, Any],
        provider_type_name: str,
    ):
        super().__init__(dependencies, config)
        self.provider_type_name = provider_type_name

        # Create router for web endpoints
        self.router = APIRouter()  # This makes it a web module

        # Add model provider routes
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}",
            self.get_providers,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}",
            self.create_provider,
            methods=["POST"],
            status_code=201,
        )
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}/{{provider_id}}",
            self.get_provider,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}/{{provider_id}}",
            self.update_provider,
            methods=["PUT"],
        )
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}/{{provider_id}}/models",
            self.get_models,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/models/providers/{provider_type_name}/{{provider_id}}",
            self.delete_provider,
            methods=["DELETE"],
            status_code=204,
        )

    @abstractmethod
    async def get_providers(
        self,
        request: Request,
        limit: Optional[int] = Query(
            None, ge=1, le=1000, description="Maximum number of providers to return"
        ),
        offset: Optional[int] = Query(
            None, ge=0, description="Number of providers to skip"
        ),
    ) -> ModelProvidersListResponse:
        """
        Get all model providers with optional pagination.

        Args:
            request: FastAPI request object
            limit: Maximum number of providers to return
            offset: Number of providers to skip

        Returns:
            ModelProvidersListResponse: List of providers with pagination info

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def get_provider(
        self, request: Request, provider_id: str
    ) -> ModelProviderResponse:
        """
        Get a specific model provider by ID.

        Args:
            request: FastAPI request object
            provider_id: Unique identifier for the provider

        Returns:
            ModelProviderResponse: Provider data

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 404 if provider not found, 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def create_provider(
        self, request: Request, provider_data: ModelProviderCreateRequest
    ) -> ModelProviderResponse:
        """
        Create a new model provider.

        Args:
            request: FastAPI request object
            provider_data: Provider data

        Returns:
            ModelProviderResponse: Created provider data

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 400 for validation errors, 409 for conflicts, 500 for other failures
        """
        pass

    @abstractmethod
    async def update_provider(
        self,
        request: Request,
        provider_id: str,
        provider_data: ModelProviderCreateRequest,
    ) -> ModelProviderResponse:
        """
        Update an existing model provider.

        Args:
            request: FastAPI request object
            provider_id: The ID of the provider to update
            provider_data: Provider data

        Returns:
            ModelProviderResponse: Updated provider data

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 400 for validation errors, 404 if provider not found, 409 for conflicts, 500 for other failures
        """
        pass

    @abstractmethod
    async def get_models(self, request: Request, provider_id: str) -> ModelResponse:
        """
        Get available models from a specific provider.

        Args:
            request: FastAPI request object
            provider_id: Unique identifier for the provider

        Returns:
            ModelResponse: Models data from the provider

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 404 if provider not found, 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def delete_provider(self, request: Request, provider_id: str) -> None:
        """
        Delete a model provider.

        Args:
            request: FastAPI request object
            provider_id: ID of the provider to delete

        Returns:
            None (204 No Content)

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 500 if deletion fails
        """
        pass
