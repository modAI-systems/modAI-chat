"""
Model Provider Store Module: Provides model provider configuration management.
- Model provider CRUD operations
- Provider configuration management
- Provider metadata and properties handling
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, List
from datetime import datetime

from modai.module import ModaiModule, ModuleDependencies


@dataclass
class ModelProvider:
    """Model Provider data model"""

    id: str
    name: str
    url: str
    properties: dict[str, Any]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ModelProviderStore(ModaiModule, ABC):
    """
    Module Declaration for: ModelProviderStore (Plain Module)
    Provides model provider configuration management operations.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    async def get_providers(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[ModelProvider]:
        """
        Retrieves all model providers with optional pagination.

        Args:
            limit: Maximum number of providers to return
            offset: Number of providers to skip

        Returns:
            List of ModelProvider objects
        """
        pass

    @abstractmethod
    async def get_provider(self, provider_id: str) -> ModelProvider | None:
        """
        Retrieves a specific model provider by ID.

        Args:
            provider_id: Unique identifier for the provider

        Returns:
            ModelProvider object if found, None otherwise
        """
        pass

    @abstractmethod
    async def add_provider(
        self, name: str, url: str, properties: dict[str, Any]
    ) -> ModelProvider:
        """
        Adds a new model provider configuration.
        Args:
            name: Human-readable name for the provider
            url: API endpoint URL for the provider
            properties: Configuration properties specific to the provider

        Returns:
            Created ModelProvider object

        Raises:
            ValueError: If name already exists or required fields are invalid
        """
        pass

    @abstractmethod
    async def update_provider(
        self,
        provider_id: str,
        name: str,
        url: str,
        properties: dict[str, Any],
    ) -> ModelProvider | None:
        """
        Updates an existing model provider configuration.

        Args:
            provider_id: ID of the provider to update
            name: New name for the provider (optional)
            url: New URL for the provider (optional)
            properties: New properties for the provider (optional)

        Returns:
            Updated ModelProvider object if found, None otherwise
        Raises:
            ValueError: If name conflicts with existing provider or fields are invalid
        """
        pass

    @abstractmethod
    async def delete_provider(self, provider_id: str) -> None:
        """
        Deletes a model provider. Idempotent operation - no error if provider doesn't exist.
        Args:
            provider_id: ID of the provider to delete

        Raises:
            For unexpected system errors
        """
        pass
