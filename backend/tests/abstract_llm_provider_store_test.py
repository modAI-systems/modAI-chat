"""
Abstract test base for LLMProviderStore implementations.
This base class provides common test scenarios that can be reused
for different LLMProviderStore implementations.
"""

import pytest
from abc import ABC, abstractmethod

from modai.modules.llm_provider_store.module import LLMProviderStore


class AbstractLLMProviderStoreTestBase(ABC):
    """
    Abstract base class for testing LLMProviderStore implementations.

    Subclasses must implement the create_llm_provider_store() method to provide
    the specific LLMProviderStore implementation to be tested.
    """

    @abstractmethod
    def create_llm_provider_store(self) -> LLMProviderStore:
        """Create and return a LLMProviderStore instance for testing"""
        pass

    @pytest.fixture
    def llm_provider_store(self):
        """Fixture providing a LLMProviderStore instance"""
        return self.create_llm_provider_store()

    @pytest.mark.anyio
    async def test_add_provider_creates_provider_with_correct_attributes(
        self, llm_provider_store: LLMProviderStore
    ):
        """Test that add_provider creates a provider with all expected attributes"""
        provider = await llm_provider_store.add_provider(
            name="OpenAI",
            url="https://api.openai.com/v1",
            properties={
                "api_key": "sk-test123",
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 1000,
            },
        )

        assert provider.name == "OpenAI"
        assert provider.url == "https://api.openai.com/v1"
        assert provider.properties["api_key"] == "sk-test123"
        assert provider.properties["model"] == "gpt-4"
        assert provider.properties["temperature"] == 0.7
        assert provider.properties["max_tokens"] == 1000
        assert provider.id is not None
        assert provider.created_at is not None
        assert provider.updated_at is not None

    @pytest.mark.anyio
    async def test_get_providers_returns_all_added_providers(
        self, llm_provider_store: LLMProviderStore
    ):
        """Test that get_providers returns all providers that were added"""
        await llm_provider_store.add_provider(
            name="OpenAI", url="https://api.openai.com/v1", properties={}
        )
        await llm_provider_store.add_provider(
            name="Anthropic", url="https://api.anthropic.com/v1", properties={}
        )
        await llm_provider_store.add_provider(
            name="Local LLM", url="http://localhost:8080/v1", properties={}
        )

        all_providers = await llm_provider_store.get_providers()
        assert len(all_providers) == 3

        provider_names = {p.name for p in all_providers}
        assert provider_names == {"OpenAI", "Anthropic", "Local LLM"}

    @pytest.mark.anyio
    async def test_get_provider_by_id_returns_correct_provider(
        self, llm_provider_store: LLMProviderStore
    ):
        """Test that get_provider returns the correct provider by ID"""
        provider_a = await llm_provider_store.add_provider(
            name="OpenAI",
            url="https://api.openai.com/v1",
            properties={"temperature": 0.7},
        )

        provider_b = await llm_provider_store.add_provider(
            name="Anthropic", url="https://api.anthropic.com/v1", properties={}
        )

        retrieved_provider = await llm_provider_store.get_provider(provider_a.id)

        assert retrieved_provider is not None
        assert retrieved_provider.id == provider_a.id
        assert provider_a.id != provider_b.id
        assert retrieved_provider.name == "OpenAI"
        assert retrieved_provider.url == "https://api.openai.com/v1"
        assert retrieved_provider.properties["temperature"] == 0.7

    @pytest.mark.anyio
    async def test_update_provider_updates_all_fields(
        self, llm_provider_store: LLMProviderStore
    ):
        """Test that update_provider correctly updates all provider fields"""
        original_provider = await llm_provider_store.add_provider(
            name="OpenAI",
            url="https://api.openai.com/v1",
            properties={"api_key": "sk-test123", "model": "gpt-4"},
        )

        updated_provider = await llm_provider_store.update_provider(
            original_provider.id,
            name="OpenAI Updated",
            url="https://api.openai.com/v2/updated",
            properties={
                "api_key": "sk-updated123",
                "model": "gpt-4-turbo",
                "temperature": 0.8,
            },
        )

        assert updated_provider is not None
        assert updated_provider.id == original_provider.id
        assert updated_provider.name == "OpenAI Updated"
        assert updated_provider.url == "https://api.openai.com/v2/updated"
        assert updated_provider.properties["api_key"] == "sk-updated123"
        assert updated_provider.properties["model"] == "gpt-4-turbo"
        assert updated_provider.properties["temperature"] == 0.8
        assert updated_provider.updated_at != updated_provider.created_at

    @pytest.mark.anyio
    async def test_delete_provider_removes_provider(
        self, llm_provider_store: LLMProviderStore
    ):
        """Test that delete_provider removes the provider from the store"""
        provider = await llm_provider_store.add_provider(
            name="ToDelete", url="https://api.delete.com", properties={}
        )

        await llm_provider_store.delete_provider(provider.id)

        # Verify provider is gone
        deleted_provider = await llm_provider_store.get_provider(provider.id)
        assert deleted_provider is None

        # Verify it's not in the list
        all_providers = await llm_provider_store.get_providers()
        provider_ids = {p.id for p in all_providers}
        assert provider.id not in provider_ids

    @pytest.mark.anyio
    async def test_add_provider_with_duplicate_name_raises_exception(
        self, llm_provider_store
    ):
        """Test that adding a provider with duplicate name raises an exception"""
        await llm_provider_store.add_provider(
            name="TestProvider",
            url="https://api.test.com",
            properties={"key": "value"},
        )

        with pytest.raises(Exception):
            await llm_provider_store.add_provider(
                name="TestProvider",
                url="https://api.other.com",
                properties={"other": "value"},
            )

    @pytest.mark.anyio
    async def test_get_provider_with_nonexistent_id_returns_none(
        self, llm_provider_store
    ):
        """Test that getting a provider with non-existent ID returns None"""
        result = await llm_provider_store.get_provider("nonexistent-id")
        assert result is None

    @pytest.mark.anyio
    async def test_update_provider_with_nonexistent_id_returns_none(
        self, llm_provider_store
    ):
        """Test that updating a provider with non-existent ID returns None"""
        result = await llm_provider_store.update_provider(
            "nonexistent-id", name="NewName", url="https://api.new.com", properties={}
        )
        assert result is None

    @pytest.mark.anyio
    async def test_delete_provider_with_nonexistent_id_succeeds(
        self, llm_provider_store
    ):
        """Test that deleting a provider with non-existent ID doesn't raise exception (idempotent)"""
        # Should not raise any exception
        await llm_provider_store.delete_provider("nonexistent-id")

    @pytest.mark.anyio
    async def test_update_provider_with_duplicate_name_raises_exception(
        self, llm_provider_store
    ):
        """Test that updating a provider to use an existing name raises an exception"""
        provider1 = await llm_provider_store.add_provider(
            name="Provider1", url="https://api1.com", properties={}
        )
        provider2 = await llm_provider_store.add_provider(
            name="Provider2", url="https://api2.com", properties={}
        )

        with pytest.raises(Exception):
            await llm_provider_store.update_provider(
                provider2.id, name="Provider1", url="https://api2.com", properties={}
            )

    @pytest.mark.anyio
    async def test_add_provider_with_empty_properties(self, llm_provider_store):
        """Test that adding a provider with empty properties works correctly"""
        provider = await llm_provider_store.add_provider(
            name="EmptyProps", url="https://api.empty.com", properties={}
        )
        assert provider.properties == {}

    @pytest.mark.anyio
    async def test_add_provider_with_none_properties_defaults_to_empty_dict(
        self, llm_provider_store
    ):
        """Test that adding a provider with None properties defaults to empty dict"""
        provider = await llm_provider_store.add_provider(
            name="NoneProps", url="https://api.none.com", properties=None
        )
        assert provider.properties == {}

    @pytest.mark.anyio
    async def test_add_provider_with_complex_nested_properties(
        self, llm_provider_store
    ):
        """Test that complex nested properties are preserved correctly"""
        complex_props = {
            "authentication": {
                "type": "api_key",
                "header": "Authorization",
                "prefix": "Bearer",
            },
            "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo"],
            "rate_limits": {"requests_per_minute": 60, "tokens_per_minute": 90000},
            "features": {
                "streaming": True,
                "function_calling": True,
                "vision": False,
            },
            "metadata": {
                "provider_type": "external",
                "region": "us-east-1",
                "version": "2023-11-06",
            },
        }

        provider = await llm_provider_store.add_provider(
            name="ComplexProps", url="https://api.complex.com", properties=complex_props
        )

        # Verify complex properties are preserved
        assert provider.properties["authentication"]["type"] == "api_key"
        assert len(provider.properties["models"]) == 3
        assert provider.properties["rate_limits"]["requests_per_minute"] == 60
        assert provider.properties["features"]["streaming"] is True
        assert provider.properties["metadata"]["region"] == "us-east-1"

    @pytest.mark.anyio
    async def test_get_providers_without_pagination_returns_all(
        self, llm_provider_store
    ):
        """Test that calling get_providers without pagination returns all providers"""
        # Create 5 providers
        for i in range(5):
            await llm_provider_store.add_provider(
                name=f"Provider{i}", url=f"https://api{i}.com", properties={}
            )

        all_providers = await llm_provider_store.get_providers()
        assert len(all_providers) == 5

    @pytest.mark.anyio
    async def test_get_providers_pagination_beyond_available_records_returns_empty(
        self, llm_provider_store
    ):
        """Test that requesting pagination beyond available records returns empty list"""
        # Create 3 providers
        for i in range(3):
            await llm_provider_store.add_provider(
                name=f"Provider{i}", url=f"https://api{i}.com", properties={}
            )

        empty_page = await llm_provider_store.get_providers(limit=5, offset=10)
        assert len(empty_page) == 0

    @pytest.mark.anyio
    async def test_get_providers_pagination_covers_all_providers_without_overlap(
        self, llm_provider_store
    ):
        """Test that paginated results cover all providers without overlap or duplication"""
        # Create 7 providers
        for i in range(7):
            await llm_provider_store.add_provider(
                name=f"Provider{i:02d}", url=f"https://api{i}.com", properties={}
            )

        # Get all providers for comparison
        all_providers = await llm_provider_store.get_providers()
        all_provider_ids = {p.id for p in all_providers}

        # Get paginated results
        page1 = await llm_provider_store.get_providers(limit=3, offset=0)
        page2 = await llm_provider_store.get_providers(limit=3, offset=3)
        page3 = await llm_provider_store.get_providers(limit=3, offset=6)

        # Collect all paginated IDs
        all_paginated_ids = set()
        for provider in page1 + page2 + page3:
            all_paginated_ids.add(provider.id)

        # Ensure no overlap and all providers are covered
        assert all_paginated_ids == all_provider_ids
        assert len(all_paginated_ids) == 7

    @pytest.mark.anyio
    async def test_add_provider_trims_whitespace_from_name_and_url(
        self, llm_provider_store
    ):
        """Test that whitespace is trimmed from name and URL when adding a provider"""
        provider = await llm_provider_store.add_provider(
            name="  SpacedName  ",
            url="  https://api.spaced.com  ",
            properties={"test": "value"},
        )
        assert provider.name == "SpacedName"
        assert provider.url == "https://api.spaced.com"

    @pytest.mark.anyio
    async def test_multiple_updates_to_same_provider_work_correctly(
        self, llm_provider_store
    ):
        """Test that multiple successive updates to the same provider work correctly"""
        provider = await llm_provider_store.add_provider(
            name="MultiUpdate", url="https://api.multi.com", properties={}
        )

        # Perform multiple updates
        for i in range(3):
            updated_provider = await llm_provider_store.update_provider(
                provider.id,
                name="MultiUpdate",
                url="https://api.multi.com",
                properties={"iteration": i},
            )
            assert updated_provider.properties["iteration"] == i

    @pytest.mark.anyio
    async def test_update_provider_updates_timestamp_but_preserves_created_at(
        self, llm_provider_store
    ):
        """Test that updating a provider updates the updated_at timestamp but preserves created_at"""
        import asyncio

        original_provider = await llm_provider_store.add_provider(
            name="TimestampTest", url="https://api.timestamp.com", properties={}
        )

        original_created = original_provider.created_at
        original_updated = original_provider.updated_at

        # Small delay to ensure timestamp difference
        await asyncio.sleep(0.01)

        updated_provider = await llm_provider_store.update_provider(
            original_provider.id,
            name="TimestampTestUpdated",
            url="https://api.timestamp.com",
            properties={},
        )

        assert updated_provider.created_at == original_created  # Should not change
        assert updated_provider.updated_at > original_updated  # Should be newer

    @pytest.mark.anyio
    async def test_add_provider_with_large_properties_succeeds(self):
        """Test that adding a provider with large properties object works correctly"""
        provider_store = self.create_llm_provider_store()

        # Create a large properties object
        large_properties = {
            "models": [f"model-{i}" for i in range(100)],
            "configurations": {
                f"config_{i}": {
                    "setting_1": f"value_{i}_1",
                    "setting_2": f"value_{i}_2",
                    "nested": {"deep": {"value": f"deep_value_{i}"}},
                }
                for i in range(50)
            },
            "large_text": "Lorem ipsum " * 1000,  # Large text content
        }

        provider = await provider_store.add_provider(
            name="LargeProps",
            url="https://api.large.com",
            properties=large_properties,
        )

        # Verify data integrity
        assert len(provider.properties["models"]) == 100
        assert len(provider.properties["configurations"]) == 50
        assert provider.properties["models"][0] == "model-0"
        assert (
            provider.properties["configurations"]["config_0"]["setting_1"]
            == "value_0_1"
        )

    @pytest.mark.anyio
    async def test_get_provider_retrieves_large_properties_correctly(self):
        """Test that retrieving a provider with large properties maintains data integrity"""
        provider_store = self.create_llm_provider_store()

        large_properties = {
            "models": [f"model-{i}" for i in range(50)],
            "large_text": "Lorem ipsum " * 500,
        }

        created_provider = await provider_store.add_provider(
            name="LargePropsRetrieve",
            url="https://api.large.com",
            properties=large_properties,
        )

        retrieved = await provider_store.get_provider(created_provider.id)

        assert retrieved is not None
        assert len(retrieved.properties["models"]) == 50
        assert retrieved.properties["large_text"] == large_properties["large_text"]

    @pytest.mark.anyio
    async def test_concurrent_providers_are_persisted_in_database(self):
        """Test that concurrently created providers are all persisted in the database"""
        import asyncio

        provider_store = self.create_llm_provider_store()

        # Create providers concurrently
        async def create_provider(index):
            return await provider_store.add_provider(
                name=f"PersistTest{index}",
                url=f"https://api{index}.persist.com",
                properties={"index": index},
            )

        await asyncio.gather(*[create_provider(i) for i in range(5)])

        # Verify they're all in the database
        all_providers = await provider_store.get_providers()
        persist_providers = [p for p in all_providers if "PersistTest" in p.name]
        assert len(persist_providers) == 5

    @pytest.mark.anyio
    async def test_add_provider_preserves_unicode_characters(self):
        """Test that Unicode characters in name, URL, and properties are preserved correctly"""
        provider_store = self.create_llm_provider_store()

        unicode_provider = await provider_store.add_provider(
            name="Тест Provider 测试 🤖",
            url="https://api.unicode.com/测试",
            properties={
                "description": "Unicode test with émojis 🚀 and спецсимволы",
                "languages": ["English", "Русский", "中文", "Español"],
                "special_chars": "!@#$%^&*()_+[]{}|;':\",./<>?`~",
            },
        )

        # Verify Unicode is preserved
        assert unicode_provider.name == "Тест Provider 测试 🤖"
        assert unicode_provider.url == "https://api.unicode.com/测试"
        assert "🚀" in unicode_provider.properties["description"]
        assert "Русский" in unicode_provider.properties["languages"]
        assert (
            unicode_provider.properties["special_chars"]
            == "!@#$%^&*()_+[]{}|;':\",./<>?`~"
        )

    @pytest.mark.anyio
    async def test_get_provider_retrieves_unicode_characters_correctly(self):
        """Test that retrieving a provider with Unicode characters maintains data integrity"""
        provider_store = self.create_llm_provider_store()

        created_provider = await provider_store.add_provider(
            name="Unicode测试",
            url="https://api.unicode.com/тест",
            properties={"emoji": "🎉", "text": "Спасибо"},
        )

        retrieved = await provider_store.get_provider(created_provider.id)

        assert retrieved is not None
        assert retrieved.name == "Unicode测试"
        assert retrieved.url == "https://api.unicode.com/тест"
        assert retrieved.properties["emoji"] == "🎉"
        assert retrieved.properties["text"] == "Спасибо"
