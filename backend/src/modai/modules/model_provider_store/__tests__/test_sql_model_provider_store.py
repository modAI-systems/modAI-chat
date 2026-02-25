import pytest

from modai.module import ModuleDependencies
from modai.modules.model_provider_store.sql_model_provider_store import (
    SQLAlchemyModelProviderStore,
)
from modai.modules.model_provider_store.__tests__.abstract_model_provider_store_test import (
    AbstractModelProviderStoreTestBase,
)

# Force anyio to use asyncio backend only
anyio_backend = pytest.fixture(scope="session")(lambda: "asyncio")


class TestSQLAlchemyModelProviderStore(AbstractModelProviderStoreTestBase):
    """Test class for SQLAlchemyModelProviderStore using the abstract test base"""

    def create_model_provider_store(self):
        """Create and return a SQLAlchemyModelProviderStore instance for testing"""
        # Use in-memory SQLite database for testing
        return SQLAlchemyModelProviderStore(
            ModuleDependencies(),
            {"database_url": "sqlite:///:memory:", "echo": False},
        )

    def test_sqlalchemy_requires_database_url(self):
        """Test that SQLAlchemyModelProviderStore requires database_url in config"""

        # Test with missing database_url
        with pytest.raises(
            ValueError,
            match="SQLAlchemyModelProviderStore requires 'database_url' to be specified in config",
        ):
            SQLAlchemyModelProviderStore(ModuleDependencies(), {})

        # Test with None database_url
        with pytest.raises(
            ValueError,
            match="SQLAlchemyModelProviderStore requires 'database_url' to be specified in config",
        ):
            SQLAlchemyModelProviderStore(ModuleDependencies(), {"database_url": None})

        # Test with empty string database_url
        with pytest.raises(
            ValueError,
            match="SQLAlchemyModelProviderStore requires 'database_url' to be specified in config",
        ):
            SQLAlchemyModelProviderStore(ModuleDependencies(), {"database_url": ""})

        # Test that valid database_url works
        provider_store = SQLAlchemyModelProviderStore(
            ModuleDependencies(), {"database_url": "sqlite:///:memory:"}
        )
        assert provider_store is not None

    @pytest.mark.anyio
    async def test_add_provider_rejects_non_json_serializable_properties(self):
        """Test that adding a provider with non-JSON serializable properties raises an exception"""
        provider_store = self.create_model_provider_store()

        class BadObject:
            def __str__(self):
                raise RuntimeError("Cannot convert to string")

            def __repr__(self):
                raise RuntimeError("Cannot convert to repr")

        bad_obj = BadObject()

        with pytest.raises(Exception):
            await provider_store.add_provider(
                name="BadProps",
                url="https://api.test.com",
                properties={"bad_object": bad_obj},
            )

    @pytest.mark.anyio
    async def test_add_provider_safely_handles_sql_injection_in_name(self):
        """Test that SQL injection attempts in provider name are safely handled"""
        provider_store = self.create_model_provider_store()

        malicious_name = "Test'; DROP TABLE model_providers; --"
        provider = await provider_store.add_provider(
            name=malicious_name,
            url="https://api.test.com",
            properties={"safe": "value"},
        )

        # The malicious SQL should be treated as literal text, not executed
        assert provider.name == malicious_name

        # Verify table still exists by retrieving the provider
        retrieved = await provider_store.get_provider(provider.id)
        assert retrieved is not None
        assert retrieved.name == malicious_name

    @pytest.mark.anyio
    async def test_add_provider_safely_handles_sql_injection_in_properties(self):
        """Test that SQL injection attempts in properties are safely handled"""
        provider_store = self.create_model_provider_store()

        malicious_props = {
            "key": "'; DROP TABLE model_providers; --",
            "another_key": "normal_value",
        }

        provider = await provider_store.add_provider(
            name="SafeProvider",
            url="https://api.safe.com",
            properties=malicious_props,
        )

        # Properties should be safely stored
        assert provider.properties["key"] == "'; DROP TABLE model_providers; --"
        assert provider.properties["another_key"] == "normal_value"
