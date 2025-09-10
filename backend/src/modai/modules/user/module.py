"""
User Module: Provides user-related API endpoints.

This web module provides endpoints to manage the users via REST.
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter, Request
from typing import Any
from pydantic import BaseModel
from modai.module import ModaiModule, ModuleDependencies


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None


class UserModule(ModaiModule, ABC):
    """
    Module Declaration for: User (Web Module)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()  # This makes it a web module

        # Add user routes
        self.router.add_api_route(
            "/api/v1/user", self.get_current_user, methods=["GET"]
        )

    @abstractmethod
    async def get_current_user(self, request: Request) -> UserResponse:
        """
        Retrieves the current logged-in user.

        Returns:
            UserResponse: Current user information

        Raises:
            HTTPException: 401 if not authenticated or session invalid
            HTTPException: 404 if user not found in user store
        """
        pass
