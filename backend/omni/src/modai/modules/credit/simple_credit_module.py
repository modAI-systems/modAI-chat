"""
Simple Credit module implementation with business logic.
Handles consumption priority (tier → topup), lazy period renewal,
tier changes, tier cancellation, and EUR cost tracking.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, Request

from modai.module import ModuleDependencies
from modai.modules.credit.module import (
    AddTopupRequest,
    ChangeTierRequest,
    ConsumeCreditsRequest,
    ConsumeCreditsResponse,
    CreditAccountResponse,
    CreditModule,
)
from modai.modules.credit_store.module import CreditAccount, CreditStore
from modai.modules.session.module import SessionModule

logger = logging.getLogger(__name__)

DEFAULT_TIERS: dict[str, int] = {
    "free": 50,
    "pro": 500,
}

RENEWAL_PERIOD_DAYS = 30
DEFAULT_CREDIT_TO_EUR = 0.02


class SimpleCreditModule(CreditModule):
    """
    Implementation of the Credit module.

    Tier allowances and credit-to-EUR ratio are read from config with
    fallback defaults. Period renewal is lazy — checked on every
    read/consume operation. A cancelled tier drops to free on renewal.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        self.session_module: SessionModule = dependencies.modules.get("session")
        self.credit_store: CreditStore = dependencies.modules.get("credit_store")

        if not self.session_module:
            raise ValueError("Credit module requires a session module dependency")
        if not self.credit_store:
            raise ValueError("Credit module requires a credit_store module dependency")

        tiers_config = config.get("tiers", {})
        self.tier_allowances: dict[str, int] = {}
        for tier_name, tier_data in tiers_config.items():
            if isinstance(tier_data, dict):
                self.tier_allowances[tier_name] = tier_data.get(
                    "monthly_allowance", DEFAULT_TIERS.get(tier_name, 0)
                )
            else:
                self.tier_allowances[tier_name] = tier_data
        for tier_name, default_allowance in DEFAULT_TIERS.items():
            if tier_name not in self.tier_allowances:
                self.tier_allowances[tier_name] = default_allowance

        self.renewal_period_days = config.get(
            "renewal_period_days", RENEWAL_PERIOD_DAYS
        )
        self.credit_to_eur = config.get("credit_to_eur", DEFAULT_CREDIT_TO_EUR)

    async def get_credits(self, request: Request) -> CreditAccountResponse:
        session = self.session_module.validate_session_for_http(request)
        account = await self._get_or_create_account(session.user_id)
        account = await self._maybe_renew(account)
        return self._to_response(account)

    async def consume_credits(
        self, body: ConsumeCreditsRequest, request: Request
    ) -> ConsumeCreditsResponse:
        if body.amount <= 0:
            raise HTTPException(status_code=422, detail="Amount must be positive")

        session = self.session_module.validate_session_for_http(request)
        account = await self._get_or_create_account(session.user_id)
        account = await self._maybe_renew(account)

        success = await self._consume_internal(account, body.amount)
        if not success:
            raise HTTPException(status_code=402, detail="Insufficient credits")

        account = await self.credit_store.get_credit_account(session.user_id)
        return ConsumeCreditsResponse(
            success=True,
            tier_credits_available=account.tier_credits_available,
            topup_credits_available=account.topup_credits_available,
        )

    async def add_topup(
        self, body: AddTopupRequest, request: Request
    ) -> CreditAccountResponse:
        if body.amount <= 0:
            raise HTTPException(status_code=422, detail="Amount must be positive")

        session = self.session_module.validate_session_for_http(request)
        account = await self._get_or_create_account(session.user_id)

        account.topup_credits_available += body.amount
        account = await self.credit_store.update_credit_account(account)
        return self._to_response(account)

    async def change_tier(
        self, body: ChangeTierRequest, request: Request
    ) -> CreditAccountResponse:
        if body.tier not in self.tier_allowances:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid tier. Allowed: {', '.join(self.tier_allowances.keys())}",
            )

        session = self.session_module.validate_session_for_http(request)
        account = await self._get_or_create_account(session.user_id)

        if account.tier == body.tier and account.tier_status == "active":
            return self._to_response(account)

        account.tier = body.tier
        account.tier_status = "active"
        account.tier_credits_available = self.tier_allowances[body.tier]
        account.tier_cost_eur = 0.0
        account.period_start = datetime.now()
        # topup credits carry over

        account = await self.credit_store.update_credit_account(account)
        return self._to_response(account)

    async def cancel_tier(self, request: Request) -> CreditAccountResponse:
        session = self.session_module.validate_session_for_http(request)
        account = await self._get_or_create_account(session.user_id)

        if account.tier == "free":
            raise HTTPException(status_code=409, detail="Cannot cancel the free tier")
        if account.tier_status == "cancelled":
            raise HTTPException(status_code=409, detail="Tier is already cancelled")

        account.tier_status = "cancelled"
        account = await self.credit_store.update_credit_account(account)
        return self._to_response(account)

    async def consume(self, user_id: str, amount: int) -> bool:
        if amount <= 0:
            return False

        account = await self._get_or_create_account(user_id)
        account = await self._maybe_renew(account)
        return await self._consume_internal(account, amount)

    async def _get_or_create_account(self, user_id: str) -> CreditAccount:
        account = await self.credit_store.get_credit_account(user_id)
        if account is not None:
            return account

        now = datetime.now()
        default_tier = "free"
        account = CreditAccount(
            user_id=user_id,
            tier=default_tier,
            tier_status="active",
            tier_credits_available=self.tier_allowances.get(default_tier, 0),
            tier_cost_eur=0.0,
            topup_credits_available=0,
            topup_cost_eur=0.0,
            period_start=now,
            created_at=now,
            updated_at=now,
        )
        return await self.credit_store.create_credit_account(account)

    async def _maybe_renew(self, account: CreditAccount) -> CreditAccount:
        now = datetime.now()
        period_end = account.period_start + timedelta(days=self.renewal_period_days)
        if now < period_end:
            return account

        # Cancelled tier → drop to free on renewal
        if account.tier_status == "cancelled":
            account.tier = "free"
            account.tier_status = "active"

        account.tier_credits_available = self.tier_allowances.get(account.tier, 0)
        account.tier_cost_eur = 0.0
        account.period_start = now
        # topup credits and topup_cost_eur are NOT reset
        return await self.credit_store.update_credit_account(account)

    async def _consume_internal(self, account: CreditAccount, amount: int) -> bool:
        remaining = amount

        # First: consume tier credits
        tier_can_use = account.tier_credits_available
        if tier_can_use >= remaining:
            account.tier_credits_available -= remaining
            account.tier_cost_eur += remaining * self.credit_to_eur
            remaining = 0
        elif tier_can_use > 0:
            remaining -= tier_can_use
            account.tier_cost_eur += tier_can_use * self.credit_to_eur
            account.tier_credits_available = 0

        # Second: consume topup credits
        if remaining > 0:
            topup_can_use = account.topup_credits_available
            if topup_can_use >= remaining:
                account.topup_credits_available -= remaining
                account.topup_cost_eur += remaining * self.credit_to_eur
                remaining = 0
            else:
                # Not enough credits — rollback and fail
                return False

        await self.credit_store.update_credit_account(account)
        return True

    def _to_response(self, account: CreditAccount) -> CreditAccountResponse:
        tier_credit_limit = self.tier_allowances.get(account.tier, 0)
        topup_consumed = (
            round(account.topup_cost_eur / self.credit_to_eur)
            if self.credit_to_eur > 0
            else 0
        )
        topup_credit_limit = account.topup_credits_available + topup_consumed
        euro_to_credit_ratio = (
            1 / self.credit_to_eur if self.credit_to_eur > 0 else 0.0
        )
        return CreditAccountResponse(
            user_id=account.user_id,
            tier=account.tier,
            tier_status=account.tier_status,
            tier_credit_limit=tier_credit_limit,
            tier_cost_eur=account.tier_cost_eur,
            topup_credit_limit=topup_credit_limit,
            topup_cost_eur=account.topup_cost_eur,
            euro_to_credit_ratio=euro_to_credit_ratio,
            period_start=account.period_start.isoformat(),
        )
