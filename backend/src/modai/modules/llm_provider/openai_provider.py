"""
Default implementation of the LLM Provider module.
This implementation provides web-based LLM provider management using an LLMProviderStore.
"""

from typing import Any, Optional
from fastapi import HTTPException, Query
from openai import OpenAI

from modai.module import ModuleDependencies
from modai.modules.llm_provider.module import (
    LLMProviderModule,
    LLMProviderResponse,
    LLMProviderCreateRequest,
    LLMProvidersListResponse,
    LargeLanguageModel,
    LargeLanguageModelResponse,
)
from modai.modules.llm_provider_store.module import LLMProviderStore, LLMProvider

OPENAI_PROVIDER_TYPE = "openai"


class OpenAIProviderModule(LLMProviderModule):
    """Default implementation of the LLM Provider module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config, OPENAI_PROVIDER_TYPE)

        # Get the LLM provider store dependency
        provider_store_name = config.get(
            "llm_provider_store_module", "llm_provider_store"
        )
        self.provider_store: LLMProviderStore = dependencies.get_module(
            provider_store_name
        )

        if not self.provider_store:
            raise ValueError(
                f"DefaultLLMProviderModule requires '{provider_store_name}' module dependency"
            )

    async def get_providers(
        self,
        limit: Optional[int] = Query(
            None, ge=1, le=1000, description="Maximum number of providers to return"
        ),
        offset: Optional[int] = Query(
            None, ge=0, description="Number of providers to skip"
        ),
    ) -> LLMProvidersListResponse:
        """Get all LLM providers with optional pagination"""
        providers = await self.provider_store.get_providers(limit=limit, offset=offset)

        # Convert to response models
        provider_responses = [self._create_provider_response(p) for p in providers]

        return LLMProvidersListResponse(
            providers=provider_responses,
            total=len(provider_responses),
            limit=limit,
            offset=offset,
        )

    async def get_provider(self, provider_id: str) -> LLMProviderResponse:
        """Get a specific LLM provider by ID"""
        provider = await self.provider_store.get_provider(provider_id)
        if not provider:
            raise HTTPException(
                status_code=404,
                detail=f"Provider with ID '{provider_id}' not found",
            )

        return self._create_provider_response(provider)

    async def create_provider(
        self, request: LLMProviderCreateRequest
    ) -> LLMProviderResponse:
        """Create a new LLM provider"""
        try:
            # Merge api_key into properties for storage
            properties = (request.properties or {}).copy()
            properties["api_key"] = request.api_key

            # Create new provider
            provider = await self.provider_store.add_provider(
                name=request.name, url=request.base_url, properties=properties
            )

            return self._create_provider_response(provider)
        except ValueError as e:
            # Handle validation errors (like duplicate names) as 400 Bad Request
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            # Re-raise HTTPExceptions as-is
            raise

    async def update_provider(
        self, provider_id: str, request: LLMProviderCreateRequest
    ) -> LLMProviderResponse:
        """Update an existing LLM provider"""
        try:
            # Merge api_key into properties for storage
            properties = (request.properties or {}).copy()
            properties["api_key"] = request.api_key

            # Update existing provider
            provider = await self.provider_store.update_provider(
                provider_id=provider_id,
                name=request.name,
                url=request.base_url,
                properties=properties,
            )
            if not provider:
                raise HTTPException(
                    status_code=404,
                    detail=f"Provider with ID '{provider_id}' not found",
                )

            return self._create_provider_response(provider)
        except ValueError as e:
            # Handle validation errors (like duplicate names) as 400 Bad Request
            raise HTTPException(status_code=400, detail=str(e))
        except HTTPException:
            # Re-raise HTTPExceptions as-is
            raise

    async def get_models(self, provider_id: str) -> LargeLanguageModelResponse:
        """Get available models from a specific provider"""
        # Check if provider exists
        provider = await self.provider_store.get_provider(provider_id)
        if not provider:
            raise HTTPException(
                status_code=404,
                detail=f"Provider with ID '{provider_id}' not found",
            )

        # Extract API key from provider properties
        api_key = provider.properties.get("api_key") if provider.properties else None
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail=f"Provider '{provider_id}' does not have an API key configured",
            )

        try:
            # Create OpenAI client with the provider's API key and URL
            client = OpenAI(
                api_key=api_key, base_url=provider.url if provider.url else None
            )

            # Query available models from OpenAI API
            models_response = client.models.list()

            # Convert OpenAI models to our internal format
            models = []
            for model in models_response.data:
                # Extract context length and other capabilities from model ID patterns
                context_length = self._get_context_length_for_model(model.id)
                supports_streaming = True  # Most OpenAI models support streaming
                supports_functions = (
                    "gpt" in model.id.lower()
                )  # GPT models typically support functions

                models.append(
                    LargeLanguageModel(
                        id=model.id,
                        name=model.id,  # Use model ID as name since OpenAI doesn't provide separate names
                        description=f"Model: {model.id}",
                        context_length=context_length,
                        supports_streaming=supports_streaming,
                        supports_functions=supports_functions,
                    )
                )

            return LargeLanguageModelResponse(
                provider_id=provider_id,
                models=models,
            )

        except Exception as e:
            # Handle API errors and authentication failures
            if "authentication" in str(e).lower() or "unauthorized" in str(e).lower():
                raise HTTPException(
                    status_code=401,
                    detail=f"Authentication failed for provider '{provider_id}': Invalid API key",
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to fetch models from provider '{provider_id}': {str(e)}",
                )

    def _get_context_length_for_model(self, model_id: str) -> int:
        """Helper method to determine context length based on model ID"""
        # Common OpenAI model context lengths
        if "gpt-4" in model_id.lower():
            if "32k" in model_id.lower():
                return 32768
            elif "turbo" in model_id.lower():
                return 128000  # GPT-4 Turbo has 128k context
            else:
                return 8192
        elif "gpt-3.5" in model_id.lower():
            if "16k" in model_id.lower():
                return 16384
            else:
                return 4096
        elif "text-embedding" in model_id.lower():
            return 8191  # Embedding models
        elif (
            "davinci" in model_id.lower()
            or "curie" in model_id.lower()
            or "babbage" in model_id.lower()
            or "ada" in model_id.lower()
        ):
            return 4000  # Legacy completion models
        else:
            return 4096  # Default fallback

    async def delete_provider(self, provider_id: str) -> None:
        """Delete an LLM provider"""
        await self.provider_store.delete_provider(provider_id)
        # Return 204 No Content for successful deletion (idempotent)
        return None

    def _create_provider_response(self, provider: LLMProvider) -> LLMProviderResponse:
        """Create a LLMProviderResponse from a provider object"""
        # Extract api_key from properties for the response
        api_key = provider.properties.get("api_key", "") if provider.properties else ""
        # Create a copy of properties without api_key for response
        properties = provider.properties.copy() if provider.properties else {}
        properties.pop("api_key", None)

        return LLMProviderResponse(
            id=provider.id,
            type=OPENAI_PROVIDER_TYPE,
            name=provider.name,
            base_url=provider.url,
            api_key=api_key,
            properties=properties,
            created_at=provider.created_at.isoformat() if provider.created_at else None,
            updated_at=provider.updated_at.isoformat() if provider.updated_at else None,
        )
