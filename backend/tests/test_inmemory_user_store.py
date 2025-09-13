import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.user_store.inmemory_user_store import InMemoryUserStore
from tests.abstract_user_store_test import AbstractUserStoreTestBase

# Force anyio to use asyncio backend only
anyio_backend = pytest.fixture(scope="session")(lambda: "asyncio")


class TestInMemoryUserStore(AbstractUserStoreTestBase):
    """Test class for InMemoryUserStore using the abstract test base"""

    def create_user_store(self):
        """Create and return an InMemoryUserStore instance for testing"""
        return InMemoryUserStore(ModuleDependencies(), {})
