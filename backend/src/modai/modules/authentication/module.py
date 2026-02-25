"""
Authentication Module: Core security module providing user authentication.

This web module handles user authentication flows.
It integrates with session management modules to maintain user state across requests.

Features:
- Login endpoint with credential validation and session token generation
- Logout endpoint for secure session termination
- Integration with session modules for token management
- Abstract interface allowing multiple authentication strategies (password, OIDC, etc.)

The module follows the modular architecture pattern, allowing different authentication implementations
to be plugged in based on configuration requirements.
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter, Request, Response, Body
from fastapi.security import HTTPBearer
from typing import Any
from pydantic import BaseModel
from modai.module import ModaiModule, ModuleDependencies


class LoginRequest(BaseModel):
    email: str
    password: str


class User(BaseModel):
    id: str
    email: str
    full_name: str | None = None


class AuthenticationModule(ModaiModule, ABC):
    """
    Module Declaration for: Authentication (Web Module)
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()
        self.security = HTTPBearer()

        # Add authentication routes
        self.router.add_api_route("/api/auth/login", self.login, methods=["POST"])
        self.router.add_api_route("/api/auth/logout", self.logout, methods=["POST"])

    @abstractmethod
    async def login(
        self,
        request: Request,
        response: Response,
        login_data: LoginRequest = Body(...),
    ) -> dict[str, str]:
        """
        Authenticates user and returns session token.

        Args:
            request: FastAPI request object
            login_data: User credentials

        Returns:
            200 if successful, 401 if invalid credentials
        """
        pass

    @abstractmethod
    async def logout(
        self,
        request: Request,
        response: Response,
    ) -> dict[str, str]:
        """
        Logs out user by invalidating token.

        Args:
            request: FastAPI request object
            credentials: Bearer token from header

        Returns:
            Success message
        """
        pass
