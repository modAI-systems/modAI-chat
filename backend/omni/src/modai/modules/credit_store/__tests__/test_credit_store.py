"""
Unit tests for the CreditStore module.
Tests both the in-memory and SQLAlchemy implementations.
"""

from abc import ABC, abstractmethod
from datetime import datetime

import pytest

from modai.module import ModuleDependencies
from modai.modules.credit_store.inmemory_credit_store import InMemoryCreditStore
from modai.modules.credit_store.module import CreditAccount
from modai.modules.credit_store.sqlalchemy_credit_store import SQLAlchemyCreditStore


def _make_account(
    user_id: str = "test-user-123",
    tier: str = "free",
    tier_status: str = "active",
    tier_credits_available: int = 50,
    tier_cost_eur: float = 0.0,
    topup_credits_available: int = 0,
    topup_cost_eur: float = 0.0,
) -> CreditAccount:
    now = datetime.now()
    return CreditAccount(
        user_id=user_id,
        tier=tier,
        tier_status=tier_status,
        tier_credits_available=tier_credits_available,
        tier_cost_eur=tier_cost_eur,
        topup_credits_available=topup_credits_available,
        topup_cost_eur=topup_cost_eur,
        period_start=now,
        created_at=now,
        updated_at=now,
    )


class AbstractCreditStoreTests(ABC):
    """Shared tests for all CreditStore implementations."""

    @pytest.fixture
    def dependencies(self):
        return ModuleDependencies(modules={})

    @pytest.fixture
    @abstractmethod
    def store(self, dependencies):
        pass

    @pytest.mark.asyncio
    async def test_get_credit_account_nonexistent(self, store):
        result = await store.get_credit_account("nonexistent-user")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_credit_account_invalid_user_id(self, store):
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.get_credit_account("")

    @pytest.mark.asyncio
    async def test_create_credit_account(self, store):
        account = _make_account()
        result = await store.create_credit_account(account)

        assert result.user_id == "test-user-123"
        assert result.tier == "free"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 50
        assert result.tier_cost_eur == 0.0
        assert result.topup_credits_available == 0
        assert result.topup_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_create_credit_account_duplicate(self, store):
        account = _make_account()
        await store.create_credit_account(account)

        with pytest.raises(ValueError, match="already exists"):
            await store.create_credit_account(account)

    @pytest.mark.asyncio
    async def test_get_credit_account_after_create(self, store):
        account = _make_account()
        await store.create_credit_account(account)

        result = await store.get_credit_account("test-user-123")
        assert result is not None
        assert result.user_id == "test-user-123"
        assert result.tier == "free"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 50

    @pytest.mark.asyncio
    async def test_update_credit_account(self, store):
        account = _make_account()
        created = await store.create_credit_account(account)

        created.tier_credits_available = 30
        created.tier_cost_eur = 0.40
        result = await store.update_credit_account(created)

        assert result.tier_credits_available == 30
        assert result.tier_cost_eur == pytest.approx(0.40)

    @pytest.mark.asyncio
    async def test_update_credit_account_nonexistent(self, store):
        account = _make_account(user_id="nonexistent-user")
        with pytest.raises(ValueError, match="does not exist"):
            await store.update_credit_account(account)

    @pytest.mark.asyncio
    async def test_update_credit_account_tier_change(self, store):
        account = _make_account()
        created = await store.create_credit_account(account)

        created.tier = "pro"
        created.tier_credits_available = 500
        created.tier_cost_eur = 0.0
        result = await store.update_credit_account(created)

        assert result.tier == "pro"
        assert result.tier_credits_available == 500

    @pytest.mark.asyncio
    async def test_update_credit_account_tier_status(self, store):
        account = _make_account(tier="pro")
        created = await store.create_credit_account(account)

        created.tier_status = "cancelled"
        result = await store.update_credit_account(created)

        assert result.tier_status == "cancelled"

    @pytest.mark.asyncio
    async def test_update_credit_account_topup(self, store):
        account = _make_account()
        created = await store.create_credit_account(account)

        created.topup_credits_available = 100
        result = await store.update_credit_account(created)

        assert result.topup_credits_available == 100
        assert result.topup_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_update_credit_account_cost_tracking(self, store):
        account = _make_account()
        created = await store.create_credit_account(account)

        created.tier_cost_eur = 0.60
        created.topup_cost_eur = 1.20
        result = await store.update_credit_account(created)

        assert result.tier_cost_eur == pytest.approx(0.60)
        assert result.topup_cost_eur == pytest.approx(1.20)

    @pytest.mark.asyncio
    async def test_multiple_users(self, store):
        account1 = _make_account(user_id="user-1", tier_credits_available=10)
        account2 = _make_account(user_id="user-2", tier_credits_available=20)

        await store.create_credit_account(account1)
        await store.create_credit_account(account2)

        result1 = await store.get_credit_account("user-1")
        result2 = await store.get_credit_account("user-2")

        assert result1.tier_credits_available == 10
        assert result2.tier_credits_available == 20


class TestInMemoryCreditStore(AbstractCreditStoreTests):
    @pytest.fixture
    def store(self, dependencies):
        return InMemoryCreditStore(dependencies, {})


class TestSQLAlchemyCreditStore(AbstractCreditStoreTests):
    @pytest.fixture
    def store(self, dependencies):
        config = {"database_url": "sqlite:///:memory:", "echo": False}
        return SQLAlchemyCreditStore(dependencies, config)

    def test_store_initialization_missing_database_url(self, dependencies):
        with pytest.raises(
            ValueError,
            match="SQLAlchemyCreditStore requires 'database_url' to be specified in config",
        ):
            SQLAlchemyCreditStore(dependencies, {})

    def test_migrate_data(self, dependencies):
        config = {"database_url": "sqlite:///:memory:"}
        store = SQLAlchemyCreditStore(dependencies, config)
        store.migrate_data("1.0.0", None)
        store.migrate_data("1.1.0", "1.0.0")
        store.migrate_data("1.0.0", None)
        store.migrate_data("1.1.0", "1.0.0")
