"""
LLM Provider Store Module: Provides LLM provider configuration management.
- LLM provider CRUD operations
- Provider configuration management
- Provider metadata and properties handling
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, List
from datetime import datetime

from modai.module import ModaiModule, ModuleDependencies


@dataclass
class LLMProvider:
    """LLM Provider data model"""

    id: str
    name: str
    url: str
    properties: dict[str, Any]
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LLMProviderStore(ModaiModule, ABC):
    """
    Module Declaration for: LLMProviderStore (Plain Module)
    Provides LLM provider configuration management operations.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    async def get_providers(
        self,
        limit: int | None = None,
        offset: int | None = None,
    ) -> List[LLMProvider]:
        """
        Retrieves all LLM providers with optional pagination.

        Args:
            limit: Maximum number of providers to return
            offset: Number of providers to skip

        Returns:
            List of LLMProvider objects
        """
        pass

    @abstractmethod
    async def get_provider(self, provider_id: str) -> LLMProvider | None:
        """
        Retrieves a specific LLM provider by ID.

        Args:
            provider_id: Unique identifier for the provider

        Returns:
            LLMProvider object if found, None otherwise
        """
        pass

    @abstractmethod
    async def add_provider(
        self, name: str, url: str, properties: dict[str, Any]
    ) -> LLMProvider:
        """
        Adds a new LLM provider configuration.

        Args:
            name: Human-readable name for the provider
            url: API endpoint URL for the provider
            properties: Configuration properties specific to the provider

        Returns:
            Created LLMProvider object

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
    ) -> LLMProvider | None:
        """
        Updates an existing LLM provider configuration.

        Args:
            provider_id: ID of the provider to update
            name: New name for the provider (optional)
            url: New URL for the provider (optional)
            properties: New properties for the provider (optional)

        Returns:
            Updated LLMProvider object if found, None otherwise

        Raises:
            ValueError: If name conflicts with existing provider or fields are invalid
        """
        pass

    @abstractmethod
    async def delete_provider(self, provider_id: str) -> None:
        """
        Deletes an LLM provider. Idempotent operation - no error if provider doesn't exist.

        Args:
            provider_id: ID of the provider to delete

        Raises:
            For unexpected system errors
        """
        pass
