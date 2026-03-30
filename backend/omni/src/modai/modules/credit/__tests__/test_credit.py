"""
Unit tests for the Credit module (web module with business logic).
Tests the SimpleCreditModule implementation through the public API.
"""

import pytest
from unittest.mock import MagicMock
from typing import Any

from fastapi import HTTPException, Request

from modai.module import ModuleDependencies
from modai.modules.credit.module import (
    AddTopupRequest,
    ChangeTierRequest,
    ConsumeCreditsRequest,
)
from modai.modules.credit.simple_credit_module import SimpleCreditModule
from modai.modules.credit_store.inmemory_credit_store import InMemoryCreditStore
from modai.modules.session.module import SessionModule


class MockSession:
    def __init__(self, user_id: str):
        self.user_id = user_id


class MockSessionModule(SessionModule):
    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.mock_session = None

    def set_mock_session(self, session: MockSession):
        self.mock_session = session

    def validate_session(self, request: Request) -> MockSession:
        if self.mock_session is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return self.mock_session

    def start_new_session(self, request, response, user_id: str, **kwargs):
        pass

    def end_session(self, request, response):
        pass


class TestSimpleCreditModule:
    @pytest.fixture
    def mock_session_module(self):
        return MockSessionModule(ModuleDependencies(modules={}), {})

    @pytest.fixture
    def credit_store(self):
        return InMemoryCreditStore(ModuleDependencies(modules={}), {})

    @pytest.fixture
    def dependencies(self, mock_session_module, credit_store):
        return ModuleDependencies(
            modules={
                "session": mock_session_module,
                "credit_store": credit_store,
            }
        )

    @pytest.fixture
    def config(self):
        return {
            "tiers": {
                "free": {"monthly_allowance": 50},
                "pro": {"monthly_allowance": 500},
            },
            "renewal_period_days": 30,
            "credit_to_eur": 0.02,
        }

    @pytest.fixture
    def module(self, dependencies, config):
        return SimpleCreditModule(dependencies, config)

    @pytest.fixture
    def mock_request(self):
        return MagicMock(spec=Request)

    # --- Initialization ---

    def test_initialization_missing_session(self):
        deps = ModuleDependencies(
            modules={"credit_store": InMemoryCreditStore(ModuleDependencies({}), {})}
        )
        with pytest.raises(ValueError, match="session module"):
            SimpleCreditModule(deps, {})

    def test_initialization_missing_store(self):
        deps = ModuleDependencies(
            modules={"session": MockSessionModule(ModuleDependencies({}), {})}
        )
        with pytest.raises(ValueError, match="credit_store module"):
            SimpleCreditModule(deps, {})

    # --- get_credits ---

    @pytest.mark.asyncio
    async def test_get_credits_creates_default_account(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))

        result = await module.get_credits(mock_request)

        assert result.user_id == "user-1"
        assert result.tier == "free"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 50
        assert result.tier_cost_eur == 0.0
        assert result.topup_credits_available == 0
        assert result.topup_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_get_credits_no_session(self, module, mock_request):
        with pytest.raises(HTTPException) as exc_info:
            await module.get_credits(mock_request)
        assert exc_info.value.status_code == 401

    # --- consume_credits ---

    @pytest.mark.asyncio
    async def test_consume_from_tier_credits(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        result = await module.consume_credits(
            ConsumeCreditsRequest(amount=10), mock_request
        )

        assert result.success is True
        assert result.tier_credits_available == 40
        assert result.topup_credits_available == 0

    @pytest.mark.asyncio
    async def test_consume_tracks_tier_cost_eur(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        await module.consume_credits(ConsumeCreditsRequest(amount=10), mock_request)
        result = await module.get_credits(mock_request)

        assert result.tier_cost_eur == pytest.approx(0.20)  # 10 * 0.02
        assert result.topup_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_consume_falls_through_to_topup(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        await module.add_topup(AddTopupRequest(amount=100), mock_request)
        result = await module.consume_credits(
            ConsumeCreditsRequest(amount=60), mock_request
        )

        assert result.success is True
        assert result.tier_credits_available == 0
        assert result.topup_credits_available == 90

    @pytest.mark.asyncio
    async def test_consume_tracks_split_cost_eur(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        await module.add_topup(AddTopupRequest(amount=100), mock_request)
        await module.consume_credits(ConsumeCreditsRequest(amount=60), mock_request)
        result = await module.get_credits(mock_request)

        # 50 tier credits + 10 topup credits consumed
        assert result.tier_cost_eur == pytest.approx(1.00)  # 50 * 0.02
        assert result.topup_cost_eur == pytest.approx(0.20)  # 10 * 0.02

    @pytest.mark.asyncio
    async def test_consume_insufficient_credits(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        with pytest.raises(HTTPException) as exc_info:
            await module.consume_credits(
                ConsumeCreditsRequest(amount=100), mock_request
            )
        assert exc_info.value.status_code == 402

    @pytest.mark.asyncio
    async def test_consume_invalid_amount(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))

        with pytest.raises(HTTPException) as exc_info:
            await module.consume_credits(ConsumeCreditsRequest(amount=0), mock_request)
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_consume_negative_amount(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))

        with pytest.raises(HTTPException) as exc_info:
            await module.consume_credits(ConsumeCreditsRequest(amount=-5), mock_request)
        assert exc_info.value.status_code == 422

    # --- add_topup ---

    @pytest.mark.asyncio
    async def test_add_topup(self, module, mock_session_module, mock_request):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        result = await module.add_topup(AddTopupRequest(amount=25), mock_request)

        assert result.topup_credits_available == 25
        assert result.topup_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_add_topup_stacks(self, module, mock_session_module, mock_request):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        await module.add_topup(AddTopupRequest(amount=25), mock_request)
        result = await module.add_topup(AddTopupRequest(amount=30), mock_request)

        assert result.topup_credits_available == 55

    @pytest.mark.asyncio
    async def test_add_topup_invalid_amount(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))

        with pytest.raises(HTTPException) as exc_info:
            await module.add_topup(AddTopupRequest(amount=0), mock_request)
        assert exc_info.value.status_code == 422

    # --- change_tier ---

    @pytest.mark.asyncio
    async def test_change_tier_free_to_pro(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        result = await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)

        assert result.tier == "pro"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 500
        assert result.tier_cost_eur == 0.0

    @pytest.mark.asyncio
    async def test_change_tier_preserves_topup(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.add_topup(AddTopupRequest(amount=75), mock_request)

        result = await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)

        assert result.tier == "pro"
        assert result.topup_credits_available == 75

    @pytest.mark.asyncio
    async def test_change_tier_same_tier_noop(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        await module.consume_credits(ConsumeCreditsRequest(amount=10), mock_request)

        result = await module.change_tier(ChangeTierRequest(tier="free"), mock_request)

        assert result.tier_credits_available == 40
        assert result.tier_cost_eur == pytest.approx(0.20)

    @pytest.mark.asyncio
    async def test_change_tier_reactivates_cancelled(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)
        await module.cancel_tier(mock_request)

        # Re-subscribe to pro
        result = await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)

        assert result.tier == "pro"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 500

    @pytest.mark.asyncio
    async def test_change_tier_invalid(self, module, mock_session_module, mock_request):
        mock_session_module.set_mock_session(MockSession("user-1"))

        with pytest.raises(HTTPException) as exc_info:
            await module.change_tier(ChangeTierRequest(tier="enterprise"), mock_request)
        assert exc_info.value.status_code == 422

    # --- cancel_tier ---

    @pytest.mark.asyncio
    async def test_cancel_tier_pro(self, module, mock_session_module, mock_request):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)

        result = await module.cancel_tier(mock_request)

        assert result.tier == "pro"
        assert result.tier_status == "cancelled"
        # Credits remain until period ends
        assert result.tier_credits_available == 500

    @pytest.mark.asyncio
    async def test_cancel_free_tier_fails(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        with pytest.raises(HTTPException) as exc_info:
            await module.cancel_tier(mock_request)
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_cancel_already_cancelled_fails(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)
        await module.cancel_tier(mock_request)

        with pytest.raises(HTTPException) as exc_info:
            await module.cancel_tier(mock_request)
        assert exc_info.value.status_code == 409

    # --- Lazy period renewal ---

    @pytest.mark.asyncio
    async def test_period_renewal_resets_tier_credits(
        self, module, mock_session_module, mock_request, credit_store
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.consume_credits(ConsumeCreditsRequest(amount=30), mock_request)

        account = await credit_store.get_credit_account("user-1")
        from datetime import timedelta

        account.period_start = account.period_start - timedelta(days=31)
        await credit_store.update_credit_account(account)

        result = await module.get_credits(mock_request)

        assert result.tier_credits_available == 50
        assert result.tier_cost_eur == 0.0  # cost reset on renewal

    @pytest.mark.asyncio
    async def test_period_renewal_preserves_topup(
        self, module, mock_session_module, mock_request, credit_store
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.add_topup(AddTopupRequest(amount=40), mock_request)

        account = await credit_store.get_credit_account("user-1")
        from datetime import timedelta

        account.period_start = account.period_start - timedelta(days=31)
        await credit_store.update_credit_account(account)

        result = await module.get_credits(mock_request)

        assert result.tier_credits_available == 50
        assert result.topup_credits_available == 40

    @pytest.mark.asyncio
    async def test_cancelled_tier_drops_to_free_on_renewal(
        self, module, mock_session_module, mock_request, credit_store
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)
        await module.change_tier(ChangeTierRequest(tier="pro"), mock_request)
        await module.cancel_tier(mock_request)

        # Fast-forward past renewal
        account = await credit_store.get_credit_account("user-1")
        from datetime import timedelta

        account.period_start = account.period_start - timedelta(days=31)
        await credit_store.update_credit_account(account)

        result = await module.get_credits(mock_request)

        assert result.tier == "free"
        assert result.tier_status == "active"
        assert result.tier_credits_available == 50

    # --- Programmatic consume API ---

    @pytest.mark.asyncio
    async def test_programmatic_consume_success(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        result = await module.consume("user-1", 5)
        assert result is True

    @pytest.mark.asyncio
    async def test_programmatic_consume_insufficient(
        self, module, mock_session_module, mock_request
    ):
        mock_session_module.set_mock_session(MockSession("user-1"))
        await module.get_credits(mock_request)

        result = await module.consume("user-1", 100)
        assert result is False

    @pytest.mark.asyncio
    async def test_programmatic_consume_invalid_amount(self, module):
        result = await module.consume("user-1", 0)
        assert result is False

    # --- Config fallback defaults ---

    def test_default_tier_allowances_without_config(self):
        deps = ModuleDependencies(
            modules={
                "session": MockSessionModule(ModuleDependencies({}), {}),
                "credit_store": InMemoryCreditStore(ModuleDependencies({}), {}),
            }
        )
        module = SimpleCreditModule(deps, {})
        assert module.tier_allowances["free"] == 50
        assert module.tier_allowances["pro"] == 500
        assert module.credit_to_eur == 0.02
