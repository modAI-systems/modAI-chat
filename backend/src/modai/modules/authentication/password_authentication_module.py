"""
Default implementation of the Authentication module.
Provides session-based authentication with simple user validation.
"""

from typing import Any
from fastapi import Request, Body, HTTPException, Response, status

from modai.module import ModuleDependencies
from modai.modules.authentication.module import (
    AuthenticationModule,
    LoginRequest,
)
from modai.modules.session.module import SessionModule


class PasswordAuthenticationModule(AuthenticationModule):
    """Default implementation of the Authentication module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        if not dependencies.modules.get("session"):
            raise ValueError(
                "Missing module dependency: 'session' module is required for authentication"
            )

        self.session_module: SessionModule = dependencies.modules.get("session")

        # Simple user database (in production, use real database)
        self.users_db = {
            "admin@example.com": {
                "id": "1",
                "email": "admin@example.com",
                "password": "admin",
                "full_name": "Administrator",
            },
            "user@example.com": {
                "id": "2",
                "email": "user@example.com",
                "password": "user",
                "full_name": "User",
            },
        }

    async def login(
        self,
        request: Request,
        response: Response,
        login_data: LoginRequest = Body(...),
    ) -> dict[str, str]:
        """
        Authenticates user and returns session token.
        Simple validation - checks email/password against configured users.
        """

        # Check if user exists and password matches
        user_data = self.users_db.get(login_data.email)
        if not user_data or user_data["password"] != login_data.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create session token using session module
        self.session_module.start_new_session(
            request, response, user_data["id"], email=user_data["email"]
        )

        return {"message": "Successfully logged in"}

    async def logout(
        self,
        request: Request,
        response: Response,
    ) -> dict[str, str]:
        """
        Logs out user by ending the session.
        """
        try:
            # Simply forward to session module - let it handle the implementation details
            self.session_module.end_session(request, response)
            return {"message": "Successfully logged out"}
        except Exception:
            # For any other exception (like JWT errors), treat as invalid token
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
