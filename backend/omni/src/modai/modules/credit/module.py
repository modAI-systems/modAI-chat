"""
Credit Module: Provides credit account management API endpoints and business logic.

This web module provides endpoints to manage user credit accounts via REST.
It handles consumption priority (tier → topup), lazy period renewal,
and tier upgrades.
"""

from abc import ABC, abstractmethod
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from modai.module import ModaiModule, ModuleDependencies


class CreditAccountResponse(BaseModel):
    """Response model for a credit account."""

    user_id: str
    tier: str
    tier_status: str
    tier_credit_limit: int
    tier_cost_eur: float
    topup_credit_limit: int
    topup_cost_eur: float
    euro_to_credit_ratio: float
    period_start: str


class ConsumeCreditsRequest(BaseModel):
    """Request model for consuming credits."""

    amount: int


class ConsumeCreditsResponse(BaseModel):
    """Response model after consuming credits."""

    success: bool
    tier_credits_available: int
    topup_credits_available: int


class AddTopupRequest(BaseModel):
    """Request model for adding topup credits."""

    amount: int


class ChangeTierRequest(BaseModel):
    """Request model for changing the user's tier."""

    tier: str


class CreditModule(ModaiModule, ABC):
    """
    Module Declaration for: Credit (Web Module)

    Manages user credit accounts including tier credit allowances,
    topup credits, and billing period renewal.

    Also exposes a programmatic API for other modules to consume credits.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()

        self.router.add_api_route("/api/credits", self.get_credits, methods=["GET"])
        self.router.add_api_route(
            "/api/credits/consume", self.consume_credits, methods=["POST"]
        )
        self.router.add_api_route(
            "/api/credits/topup", self.add_topup, methods=["POST"]
        )
        self.router.add_api_route(
            "/api/credits/tier", self.change_tier, methods=["PUT"]
        )
        self.router.add_api_route(
            "/api/credits/tier/cancel", self.cancel_tier, methods=["POST"]
        )

    @abstractmethod
    async def get_credits(self, request: Request) -> CreditAccountResponse:
        """
        Returns the current user's credit account.
        Creates a default free-tier account if none exists.

        Raises:
            HTTPException: 401 if not authenticated
        """
        pass

    @abstractmethod
    async def consume_credits(
        self, body: ConsumeCreditsRequest, request: Request
    ) -> ConsumeCreditsResponse:
        """
        Deducts credits using priority: tier → topup.

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 402 if insufficient credits
            HTTPException: 422 if amount is invalid
        """
        pass

    @abstractmethod
    async def add_topup(
        self, body: AddTopupRequest, request: Request
    ) -> CreditAccountResponse:
        """
        Adds topup credits to the user's account.

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 422 if amount is invalid
        """
        pass

    @abstractmethod
    async def change_tier(
        self, body: ChangeTierRequest, request: Request
    ) -> CreditAccountResponse:
        """
        Changes the user's tier and resets billing period.

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 422 if tier is invalid
        """
        pass

    @abstractmethod
    async def cancel_tier(self, request: Request) -> CreditAccountResponse:
        """
        Cancels the current tier. Credits remain until period ends,
        then the user drops to free tier on next renewal.

        Raises:
            HTTPException: 401 if not authenticated
            HTTPException: 409 if tier is already cancelled or user is on free tier
        """
        pass

    @abstractmethod
    async def consume(self, user_id: str, amount: int) -> bool:
        """
        Programmatic API for other modules to consume credits.

        Args:
            user_id: The user whose credits to consume
            amount: Number of credits to consume

        Returns:
            True if credits were successfully consumed, False if insufficient
        """
        pass
