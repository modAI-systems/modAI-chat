"""Shared JWT session-cookie utilities for OIDC auth and session modules.

The session cookie is a signed JWT (HS256) that carries all user-identity
claims. No server-side session state is required; every piece of information
needed to validate and identify a request is embedded directly in the cookie.

JWT payload structure:
    sub              - OIDC sub claim (user identity)
    email            - User email address
    iat              - Issued-at timestamp
    exp              - Expiry timestamp (= iat + session_duration)
    name             - (optional) Full name
    email_verified   - (optional) Whether the email was verified at the IDP
"""

import time
from typing import Any

import jwt

COOKIE_NAME = "modai_session"
DEFAULT_SESSION_DURATION = 86400  # 24 hours


def encode_session_cookie(
    *,
    sub: str,
    email: str,
    name: str | None,
    email_verified: bool | None,
    session_secret: str,
    session_duration: int = DEFAULT_SESSION_DURATION,
) -> str:
    """Return a signed JWT to be stored as the session cookie."""
    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": sub,
        "email": email,
        "iat": now,
        "exp": now + session_duration,
    }
    if name is not None:
        payload["name"] = name
    if email_verified is not None:
        payload["email_verified"] = email_verified
    return jwt.encode(payload, session_secret, algorithm="HS256")


def decode_session_cookie(cookie_value: str, session_secret: str) -> dict[str, Any]:
    """Decode and verify a signed JWT session cookie.

    Raises:
        ValueError: if the cookie is missing, has been tampered with, or
                    has expired.
    """
    try:
        return jwt.decode(cookie_value, session_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as e:
        raise ValueError("Session cookie expired") from e
    except jwt.InvalidTokenError as e:
        raise ValueError("Invalid session cookie") from e
