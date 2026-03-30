"""
In-memory CreditStore implementation for testing and development usage.
"""

from datetime import datetime
from typing import Any

from modai.module import ModuleDependencies
from modai.modules.credit_store.module import CreditAccount, CreditStore


class InMemoryCreditStore(CreditStore):
    """
    In-memory implementation of the CreditStore module.

    Data is lost when the application restarts — suitable for
    testing and development scenarios.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.storage: dict[str, CreditAccount] = {}

    async def get_credit_account(self, user_id: str) -> CreditAccount | None:
        self._validate_user_id(user_id)
        return self.storage.get(user_id)

    async def create_credit_account(self, account: CreditAccount) -> CreditAccount:
        self._validate_user_id(account.user_id)
        if account.user_id in self.storage:
            raise ValueError(
                f"Credit account already exists for user {account.user_id}"
            )
        self.storage[account.user_id] = account
        return account

    async def update_credit_account(self, account: CreditAccount) -> CreditAccount:
        self._validate_user_id(account.user_id)
        if account.user_id not in self.storage:
            raise ValueError(
                f"Credit account does not exist for user {account.user_id}"
            )
        now = datetime.now()
        updated = CreditAccount(
            user_id=account.user_id,
            tier=account.tier,
            tier_status=account.tier_status,
            tier_credits_available=account.tier_credits_available,
            tier_cost_eur=account.tier_cost_eur,
            topup_credits_available=account.topup_credits_available,
            topup_cost_eur=account.topup_cost_eur,
            period_start=account.period_start,
            created_at=account.created_at,
            updated_at=now,
        )
        self.storage[account.user_id] = updated
        return updated
