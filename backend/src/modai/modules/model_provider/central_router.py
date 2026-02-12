"""
Central Model Provider Router: Aggregates providers from all provider types.
This module provides the GET /models/providers endpoint that returns all providers.
"""

from typing import Any, List, Optional
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel

from modai.module import ModaiModule, ModuleDependencies
from modai.modules.model_provider.module import (
    ModelProviderResponse,
    ModelProviderModule,
    Model,
)
from modai.modules.session.module import SessionModule


class ModelsListResponse(BaseModel):
    """Response model for the /models endpoint (OpenAI-compatible)"""

    object: str = "list"
    data: List[Model]


class ModelProvidersAllResponse(BaseModel):
    """Response model for all providers from all types"""

    providers: List[ModelProviderResponse]
    total: int
    limit: int | None
    offset: int | None


class CentralModelProviderRouter(ModaiModule):
    """
    Central router for model provider endpoints that aggregate across all provider types.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()

        self.session_module: SessionModule = dependencies.modules.get("session")
        if not self.session_module:
            raise ValueError(
                "CentralModelProviderRouter requires a 'session' module dependency"
            )

        # Add the central route for getting all providers
        self.router.add_api_route(
            "/api/v1/models/providers",
            self.get_all_providers,
            methods=["GET"],
        )

        # Add the central route for getting all models
        self.router.add_api_route(
            "/api/v1/models",
            self.get_all_models,
            methods=["GET"],
        )

    async def get_all_providers(
        self,
        request: Request,
        limit: Optional[int] = Query(
            None, ge=1, le=1000, description="Maximum number of providers to return"
        ),
        offset: Optional[int] = Query(
            None, ge=0, description="Number of providers to skip"
        ),
    ) -> ModelProvidersAllResponse:
        """
        Get all model providers from all types with optional pagination.

        Args:
            limit: Maximum number of providers to return
            offset: Number of providers to skip

        Returns:
            ModelProvidersAllResponse with providers list and pagination info
        """
        self.session_module.validate_session_for_http(request)

        all_providers = []

        # Get all provider modules from dependencies
        # We need to find all modules that inherit from ModelProviderModule
        provider_modules = []
        for module_name, module in self.dependencies.modules.items():
            if isinstance(module, ModelProviderModule):
                provider_modules.append(module)

        for provider_module in provider_modules:
            try:
                # Call the get_providers method on each provider module
                # But we need to modify it to not apply pagination per module
                providers_response = await provider_module.get_providers(
                    request, limit=None, offset=None
                )
                all_providers.extend(providers_response.providers)
            except Exception as e:
                # Log error but continue with other providers
                print(
                    f"Error getting providers from {provider_module.__class__.__name__}: {e}"
                )
                continue

        # Apply pagination to the combined results
        total_providers = len(all_providers)
        if offset:
            all_providers = all_providers[offset:]
        if limit:
            all_providers = all_providers[:limit]

        return ModelProvidersAllResponse(
            providers=all_providers,
            total=total_providers,
            limit=limit,
            offset=offset,
        )

    async def get_all_models(self, request: Request) -> ModelsListResponse:
        """
        Get all models from all providers across all provider types.
        Returns in OpenAI-compatible format.

        Returns:
            ModelsListResponse with all available models
        """
        self.session_module.validate_session_for_http(request)

        all_models = []

        # Get all provider modules from dependencies
        provider_modules = []
        for module_name, module in self.dependencies.modules.items():
            if isinstance(module, ModelProviderModule):
                provider_modules.append(module)

        for provider_module in provider_modules:
            try:
                # Get all providers for this module type
                providers_response = await provider_module.get_providers(
                    request, limit=None, offset=None
                )

                # For each provider, get its models
                for provider in providers_response.providers:
                    try:
                        models_response = await provider_module.get_models(
                            request, provider.id
                        )

                        # Add models with prefixed IDs to avoid conflicts
                        for model_data in models_response.data:
                            prefixed_model = model_data.model_copy()
                            prefixed_model.id = f"{provider_module.provider_type_name}/{provider.name}/{model_data.id}"
                            all_models.append(prefixed_model)

                    except Exception as e:
                        # Log error but continue with other providers
                        print(f"Error getting models for provider {provider.id}: {e}")
                        continue

            except Exception as e:
                # Log error but continue with other provider types
                print(
                    f"Error getting providers from {provider_module.__class__.__name__}: {e}"
                )
                continue

        return ModelsListResponse(data=all_models)
