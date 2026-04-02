"""
OIDC Session Module: Validates stateless JWT session cookies.

Implements the SessionModule web contract and provides cookie-based
authentication plus user info retrieval with optional JIT provisioning.

All session state is encoded directly in the signed JWT cookie -
no server-side session store is required. See _cookie.py for the
cookie payload structure.

Endpoints:
  GET  /api/auth/session  - Returns current session information
  GET  /api/auth/userinfo - Returns current user info (with JIT provisioning)
"""

import logging
from typing import Any

from fastapi import HTTPException, Request
from pydantic import BaseModel

from modai.module import ModuleDependencies
from modai.modules.authentication._cookie import (
    COOKIE_NAME,
    decode_session_cookie,
)
from modai.modules.session.module import Session, SessionModule
from modai.modules.user_store.module import UserStore


class UserInfoResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None


class OIDCSessionModule(SessionModule):
    """
    Session module that validates stateless JWT session cookies produced
    by OIDCAuthModule.

    Use this as the 'session' dependency for all other modules that need
    to authenticate incoming requests.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)

        # Required config
        self.session_secret = self._require_config("session_secret")

        # Optional dependency
        user_store = dependencies.modules.get("user_store")
        self.user_store: UserStore | None = user_store  # type: ignore[assignment]

        # Additional route
        self.router.add_api_route("/api/auth/userinfo", self.userinfo, methods=["GET"])

    def validate_session(self, request: Request) -> Session:
        """Validate the JWT session cookie and return the current session.

        Raises:
            HTTPException: 401 when no cookie is present, cookie is invalid,
                or the JWT has expired.
        """
        raw_cookie = request.cookies.get(COOKIE_NAME)
        if not raw_cookie:
            raise HTTPException(
                status_code=401,
                detail="Missing, invalid or expired session",
            )

        try:
            payload = decode_session_cookie(raw_cookie, self.session_secret)
        except ValueError as e:
            raise HTTPException(
                status_code=401,
                detail="Missing, invalid or expired session",
            ) from e

        user_id = payload.get("sub", "")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Missing, invalid or expired session",
            )

        additional = {
            k: v
            for k, v in {
                "email": payload.get("email"),
                "name": payload.get("name"),
                "email_verified": payload.get("email_verified"),
            }.items()
            if v is not None
        }

        return Session(user_id=str(user_id), additional=additional)

    async def userinfo(self, request: Request) -> UserInfoResponse:
        """Return user info from the cookie claims with optional JIT provisioning."""
        session = self.validate_session(request)

        if not self.user_store:
            return UserInfoResponse(
                id=session.user_id,
                email=session.additional.get("email", ""),
                full_name=session.additional.get("name"),
            )

        # JIT provisioning
        user = await self.user_store.get_user_by_id(session.user_id)

        if not user:
            email = session.additional.get("email")
            if email:
                user = await self.user_store.get_user_by_email(email)

            if not user and email:
                try:
                    user = await self.user_store.create_user(
                        email=email,
                        full_name=session.additional.get("name"),
                        id=session.user_id,
                    )
                    self.logger.info(
                        "JIT provisioned user %s (%s)",
                        session.user_id,
                        email,
                    )
                except Exception as e:
                    self.logger.error(
                        "Failed to JIT provision user %s: %s",
                        session.user_id,
                        e,
                    )
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to provision user account",
                    ) from e

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found and could not be provisioned",
            )

        return UserInfoResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
        )

    def _require_config(self, key: str) -> str:
        value = self.config.get(key)
        if not value:
            raise ValueError(f"oidc_session module requires '{key}' config")
        return value
