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
    User,
)
from modai.modules.session.module import SessionModule


class UsernamePasswordAuthenticationModule(AuthenticationModule):
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
            "admin": {
                "id": "1",
                "username": "admin",
                "password": "admin",
                "email": "admin@example.com",
            },
            "user": {
                "id": "2",
                "username": "user",
                "password": "user",
                "email": "user@example.com",
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
        Simple validation - checks username/password against configured users.
        """

        # Check if user exists and password matches
        user_data = self.users_db.get(login_data.username)
        if not user_data or user_data["password"] != login_data.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create session token using session module
        self.session_module.start_new_session(
            request, response, user_data["id"], user_data["username"]
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

    async def get_current_user(
        self,
        request: Request,
        response: Response,
    ) -> User:
        """
        Dependency function to extract user from session token.
        Used with FastAPI Depends() to protect endpoints.
        """
        try:
            # Get user information from session module
            user_info = self.session_module.validate_session(request)

            if not user_info:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            user_id = user_info.get("user_id")
            username = user_info.get("username")

            if not user_id or not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Find user in database to get additional info
            user_data = None
            for user in self.users_db.values():
                if user["id"] == user_id and user["username"] == username:
                    user_data = user
                    break

            if not user_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            return User(
                id=user_data["id"],
                username=user_data["username"],
                email=user_data.get("email"),
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"},
            )
