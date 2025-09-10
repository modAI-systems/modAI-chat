"""
Default JWT-based implementation of the Session module.
Provides JWT token creation, validation, and session management.
"""

from fastapi import Request, Response
import jwt
from datetime import datetime, timedelta, timezone
from typing import Any
from modai.module import ModuleDependencies
from modai.modules.session.module import SessionModule, Session


class JwtSessionModule(SessionModule):
    """Default JWT-based implementation of the Session module."""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        # JWT configuration
        self.jwt_secret = self.config.get("jwt_secret")
        self.jwt_algorithm = self.config.get("jwt_algorithm", "HS256")
        self.jwt_expiration_hours = self.config.get("jwt_expiration_hours", 24)
        self.cookie_secure = self.config.get("cookie_secure", True)

    def start_new_session(
        self, request: Request, response: Response, user_id: str, **kwargs
    ):
        """
        Creates a session token for the given user and applies it to the response.

        Args:
            request: FastAPI request object
            response: FastAPI response object
            user_id: Unique identifier for the user
            **kwargs: Additional data to include in the session (e.g., email)

        Does not return anything - operates on response object by setting cookie.
        """
        expiration = datetime.now(timezone.utc) + timedelta(
            hours=self.jwt_expiration_hours
        )
        payload = {
            "user_id": user_id,
            "exp": expiration,
            "iat": datetime.now(timezone.utc),
            **kwargs,  # Include any additional session data
        }

        token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

        # Apply token to cookie
        response.set_cookie(
            key="session_token",
            value=token,
            max_age=self.jwt_expiration_hours * 3600,  # Convert hours to seconds
            httponly=True,  # Prevent access via JavaScript for security
            secure=self.cookie_secure,
            samesite="lax",  # CSRF protection
        )

    def validate_session(
        self,
        request: Request,
    ) -> Session:
        """
        Validates and decodes JWT token.

        Args:
            request: FastAPI request object

        Returns:
            The active valid session

        Raises:
            If session is invalid or expired
        """
        # Get token from cookies
        token = request.cookies.get("session_token")

        if not token:
            raise ValueError("No session token found in cookies")

        # Decode and validate JWT
        payload = jwt.decode(
            token,
            self.jwt_secret,
            algorithms=[self.jwt_algorithm],
        )

        # Extract user_id and all other data as additional
        user_id = payload.pop("user_id")
        # Remove JWT standard fields from additional data
        payload.pop("exp", None)
        payload.pop("iat", None)

        return Session(user_id=user_id, additional=payload)

    def end_session(
        self,
        request: Request,
        response: Response,
    ):
        """
        Ends the session by invalidating the session token.

        Args:
            request: FastAPI request object
            response: FastAPI response object
        """
        # Clear the session cookie
        response.delete_cookie(key="session_token")
