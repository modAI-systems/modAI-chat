"""
Default implementation of the Authentication module.
Provides session-based authentication with user store integration.
"""

from typing import Any
import hashlib
from fastapi import Request, Body, HTTPException, Response, status

from modai.module import ModuleDependencies
from modai.modules.authentication.module import (
    AuthenticationModule,
    LoginRequest,
)
from modai.modules.session.module import SessionModule
from modai.modules.user_store.module import UserStore


class PasswordAuthenticationModule(AuthenticationModule):
    """Default implementation of the Authentication module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        if not dependencies.modules.get("session"):
            raise ValueError(
                "Missing module dependency: 'session' module is required for authentication"
            )

        if not dependencies.modules.get("user_store"):
            raise ValueError(
                "Missing module dependency: 'user_store' module is required for authentication"
            )

        self.session_module: SessionModule = dependencies.modules.get("session")
        self.user_store: UserStore = dependencies.modules.get("user_store")

    def _hash_password(self, password: str) -> str:
        """Simple password hashing using SHA-256. In production, use proper password hashing like bcrypt."""
        return hashlib.sha256(password.encode()).hexdigest()

    async def login(
        self,
        request: Request,
        response: Response,
        login_data: LoginRequest = Body(...),
    ) -> dict[str, str]:
        """
        Authenticates user and returns session token.
        Validates email/password against user store.
        """

        # Get user by email from user store
        user = await self.user_store.get_user_by_email(login_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user credentials
        credentials = await self.user_store.get_user_credentials(user.id)
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        password_hash = self._hash_password(login_data.password)
        if credentials.password_hash != password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create session token using session module
        self.session_module.start_new_session(
            request, response, user.id, email=user.email
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
