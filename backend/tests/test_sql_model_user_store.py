import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.user_store.sql_model_user_store import SQLModelUserStore
from tests.abstract_user_store_test import AbstractUserStoreTestBase

# Force anyio to use asyncio backend only
anyio_backend = pytest.fixture(scope="session")(lambda: "asyncio")


class TestSQLModelUserStore(AbstractUserStoreTestBase):
    """Test class for SQLModelUserStore using the abstract test base"""

    def create_user_store(self):
        """Create and return a SQLModelUserStore instance for testing"""
        # Use in-memory SQLite database for testing
        return SQLModelUserStore(
            ModuleDependencies(), {"database_url": "sqlite:///:memory:", "echo": False}
        )

    @pytest.mark.anyio
    async def test_sqlmodel_persistence_interface(self):
        """Test that SQLModelUserStore properly implements PersistenceModule interface"""
        user_store = self.create_user_store()

        # Test migrate_data method exists and can be called
        user_store.migrate_data("1.0.0", None)  # Should not raise
        user_store.migrate_data("1.1.0", "1.0.0")  # Should not raise

    def test_sqlmodel_requires_database_url(self):
        """Test that SQLModelUserStore requires database_url in config"""

        # Test with missing database_url
        with pytest.raises(
            ValueError,
            match="SQLModelUserStore requires 'database_url' to be specified in config",
        ):
            SQLModelUserStore(ModuleDependencies(), {})

        # Test with None database_url
        with pytest.raises(
            ValueError,
            match="SQLModelUserStore requires 'database_url' to be specified in config",
        ):
            SQLModelUserStore(ModuleDependencies(), {"database_url": None})

        # Test with empty string database_url
        with pytest.raises(
            ValueError,
            match="SQLModelUserStore requires 'database_url' to be specified in config",
        ):
            SQLModelUserStore(ModuleDependencies(), {"database_url": ""})

        # Test that valid database_url works
        user_store = SQLModelUserStore(
            ModuleDependencies(), {"database_url": "sqlite:///:memory:"}
        )
        assert user_store is not None
