"""
LLM Provider Module: Web interface for LLM provider management.
This module provides REST API endpoints for managing LLM provider configurations.
"""

from abc import ABC, abstractmethod
from typing import Any, List, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel

from modai.module import ModaiModule, ModuleDependencies


class LLMProviderResponse(BaseModel):
    """Response model for LLM Provider data"""

    id: str
    name: str
    base_url: str
    api_key: str
    properties: dict[str, Any]
    created_at: str | None
    updated_at: str | None


class LLMProviderCreateRequest(BaseModel):
    """Request model for creating or updating LLM Provider"""

    name: str
    base_url: str
    api_key: str
    properties: dict[str, Any] = {}


class LLMProvidersListResponse(BaseModel):
    """Response model for provider list"""

    providers: List[LLMProviderResponse]
    total: int
    limit: int | None
    offset: int | None


class LargeLanguageModel(BaseModel):
    """Response model for an individual LLM model"""

    id: str
    name: str
    description: str
    context_length: int
    supports_streaming: bool
    supports_functions: bool


class LargeLanguageModelResponse(BaseModel):
    """Response model for LLM models from a provider"""

    provider_id: str
    models: List[LargeLanguageModel]


class LLMProviderModule(ModaiModule, ABC):
    """
    Module Declaration for: LLM Provider (Web Module)

    Web module for LLM Provider management providing REST endpoints.
    This module provides HTTP API access to LLM provider management operations.
    It depends on an LLMProviderStore module for actual data operations.
    """

    def __init__(
        self,
        dependencies: ModuleDependencies,
        config: dict[str, Any],
        provider_type_name: str,
    ):
        super().__init__(dependencies, config)

        # Create router for web endpoints
        self.router = APIRouter()  # This makes it a web module

        # Add LLM provider routes
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}",
            self.get_providers,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}",
            self.create_provider,
            methods=["POST"],
            status_code=201,
        )
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}/{{provider_id}}",
            self.get_provider,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}/{{provider_id}}",
            self.update_provider,
            methods=["PUT"],
        )
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}/{{provider_id}}/models",
            self.get_models,
            methods=["GET"],
        )
        self.router.add_api_route(
            f"/api/v1/llm-provider/{provider_type_name}/{{provider_id}}",
            self.delete_provider,
            methods=["DELETE"],
            status_code=204,
        )

    @abstractmethod
    async def get_providers(
        self,
        limit: Optional[int] = Query(
            None, ge=1, le=1000, description="Maximum number of providers to return"
        ),
        offset: Optional[int] = Query(
            None, ge=0, description="Number of providers to skip"
        ),
    ) -> LLMProvidersListResponse:
        """
        Get all LLM providers with optional pagination.

        Args:
            limit: Maximum number of providers to return
            offset: Number of providers to skip

        Returns:
            LLMProvidersListResponse: List of providers with pagination info

        Raises:
            HTTPException: 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def get_provider(self, provider_id: str) -> LLMProviderResponse:
        """
        Get a specific LLM provider by ID.

        Args:
            provider_id: Unique identifier for the provider

        Returns:
            LLMProviderResponse: Provider data

        Raises:
            HTTPException: 404 if provider not found, 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def create_provider(
        self, request: LLMProviderCreateRequest
    ) -> LLMProviderResponse:
        """
        Create a new LLM provider.

        Args:
            request: Provider data

        Returns:
            LLMProviderResponse: Created provider data

        Raises:
            HTTPException: 400 for validation errors, 409 for conflicts, 500 for other failures
        """
        pass

    @abstractmethod
    async def update_provider(
        self, provider_id: str, request: LLMProviderCreateRequest
    ) -> LLMProviderResponse:
        """
        Update an existing LLM provider.

        Args:
            provider_id: The ID of the provider to update
            request: Provider data

        Returns:
            LLMProviderResponse: Updated provider data

        Raises:
            HTTPException: 400 for validation errors, 404 if provider not found, 409 for conflicts, 500 for other failures
        """
        pass

    @abstractmethod
    async def get_models(self, provider_id: str) -> LargeLanguageModelResponse:
        """
        Get available models from a specific provider.

        Args:
            provider_id: Unique identifier for the provider

        Returns:
            LLMModelsResponse: Models data from the provider

        Raises:
            HTTPException: 404 if provider not found, 500 if retrieval fails
        """
        pass

    @abstractmethod
    async def delete_provider(self, provider_id: str) -> None:
        """
        Delete an LLM provider.

        Args:
            provider_id: ID of the provider to delete

        Returns:
            None (204 No Content)

        Raises:
            HTTPException: 500 if deletion fails
        """
        pass
