"""
OIDC Session Module: Validates stateless JWT session cookies.

Implements the SessionModule web contract and provides cookie-based
authentication.

All session state is encoded directly in the signed JWT cookie -
no server-side session store is required. See _cookie.py for the
cookie payload structure.

Endpoints:
  GET  /api/auth/userinfo  - Returns current session information
"""

import logging
from typing import Any

from fastapi import HTTPException, Request

from modai.module import ModuleDependencies
from modai.modules.authentication._cookie import (
    COOKIE_NAME,
    decode_session_cookie,
)
from modai.modules.session.module import Session, SessionModule


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

    def _require_config(self, key: str) -> str:
        value = self.config.get(key)
        if not value:
            raise ValueError(f"oidc_session module requires '{key}' config")
        return value
