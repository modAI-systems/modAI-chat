"""
Default implementation of the Authentication module.
Provides session-based authentication with user store integration.
"""

from typing import Any
import hashlib
import logging
from fastapi import Request, Body, HTTPException, Response, status
from pydantic import BaseModel

from modai.module import ModuleDependencies
from modai.modules.authentication.module import (
    AuthenticationModule,
    LoginRequest,
)
from modai.modules.session.module import SessionModule
from modai.modules.user_store.module import UserStore


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str | None = None


class PasswordAuthenticationModule(AuthenticationModule):
    """Default implementation of the Authentication module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Set up logger
        self.logger = logging.getLogger(__name__)

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

        # Add password authentication specific routes
        self.router.add_api_route("/api/v1/auth/signup", self.signup, methods=["POST"])

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
            self.logger.info(f"Login attempt with unknown email: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user credentials
        credentials = await self.user_store.get_user_credentials(user.id)
        if not credentials:
            self.logger.info(
                f"Credentials for user id {user.id} ({login_data.email}) not found"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify password
        password_hash = self._hash_password(login_data.password)
        if credentials.password_hash != password_hash:
            self.logger.info(
                f"Invalid password attempt for user id {user.id} ({login_data.email})"
            )
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

    async def signup(
        self,
        request: Request,
        response: Response,
        signup_data: SignupRequest = Body(...),
    ) -> dict[str, str]:
        """
        Registers a new user with email and password.
        Creates user in user store and sets password credentials.
        """

        # Check if user already exists
        existing_user = await self.user_store.get_user_by_email(signup_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )

        # Create new user
        try:
            user = await self.user_store.create_user(
                email=signup_data.email,
                full_name=signup_data.full_name,
            )
        except ValueError as e:
            # Log the actual error for debugging but don't expose it to client
            self.logger.error(f"Failed to create user {signup_data.email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user data provided",
            )
        except Exception as e:
            # Log unexpected errors
            self.logger.error(
                f"Unexpected error creating user {signup_data.email}: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

        # Set user password
        password_hash = self._hash_password(signup_data.password)
        try:
            await self.user_store.set_user_password(user.id, password_hash)
        except Exception as e:
            # Log unexpected errors
            self.logger.error(
                f"Unexpected error setting password for user {user.id} ({signup_data.email}): {str(e)}"
            )
            # Clean up - delete the user if password setting failed
            try:
                await self.user_store.delete_user(user.id)
            except Exception as cleanup_error:
                self.logger.error(
                    f"Failed to cleanup user {user.id} after password creation failure: {str(cleanup_error)}"
                )

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user account",
            )

        return {"message": "User registered successfully", "user_id": user.id}

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
        except Exception as e:
            # Log the actual error for debugging but don't expose it to client
            self.logger.error(f"Error during logout: {str(e)}")
            # For any other exception (like JWT errors), treat as invalid token
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    def _hash_password(self, password: str) -> str:
        """Simple password hashing using SHA-256. In production, use proper password hashing like bcrypt."""
        return hashlib.sha256(password.encode()).hexdigest()
