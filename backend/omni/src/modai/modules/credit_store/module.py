"""
CreditStore Module: Provides credit account persistence capabilities.
- Credit account CRUD operations
- Tier and topup credit tracking
- Billing period management
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from modai.module import ModaiModule, ModuleDependencies


@dataclass
class CreditAccount:
    """Represents a user's credit account."""

    user_id: str
    tier: str
    tier_status: str  # "active" or "cancelled"
    tier_credits_available: int
    tier_cost_eur: float
    topup_credits_available: int
    topup_cost_eur: float
    period_start: datetime
    created_at: datetime
    updated_at: datetime


class CreditStore(ModaiModule, ABC):
    """
    This module provides persistence capabilities for user credit accounts.
    It manages the storage and retrieval of credit balances, tiers,
    and billing period information.

    The store is responsible only for data persistence — no business logic
    such as consumption priority or renewal should live here.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    async def get_credit_account(self, user_id: str) -> CreditAccount | None:
        """
        Retrieve the credit account for a specific user.

        Args:
            user_id: The unique identifier of the user

        Returns:
            CreditAccount if found, None otherwise

        Raises:
            ValueError: If user_id is invalid
        """
        pass

    @abstractmethod
    async def create_credit_account(self, account: CreditAccount) -> CreditAccount:
        """
        Create a new credit account.

        Args:
            account: The credit account to create

        Returns:
            The created CreditAccount

        Raises:
            ValueError: If account data is invalid or account already exists
        """
        pass

    @abstractmethod
    async def update_credit_account(self, account: CreditAccount) -> CreditAccount:
        """
        Update an existing credit account.

        Args:
            account: The credit account with updated fields

        Returns:
            The updated CreditAccount

        Raises:
            ValueError: If account data is invalid or account does not exist
        """
        pass

    def _validate_user_id(self, user_id: str) -> None:
        if not user_id or not user_id.strip():
            raise ValueError("user_id cannot be empty")
