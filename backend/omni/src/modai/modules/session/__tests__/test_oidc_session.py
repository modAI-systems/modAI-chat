import time

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import Mock

from modai.module import ModuleDependencies
from modai.modules.authentication._cookie import COOKIE_NAME
from modai.modules.session.oidc_session import OIDCSessionModule
from modai.modules.session.module import Session

SESSION_SECRET = "super-secret-test-key"

BASE_CONFIG = {"session_secret": SESSION_SECRET}


def _build_module(
    *,
    config: dict | None = None,
) -> OIDCSessionModule:
    return OIDCSessionModule(
        dependencies=ModuleDependencies({}),
        config=BASE_CONFIG if config is None else config,
    )


def _build_client(module: OIDCSessionModule) -> TestClient:
    app = FastAPI()
    app.include_router(module.router)
    return TestClient(app, follow_redirects=False)


def _make_cookie(
    *,
    sub: str = "user-1",
    email: str = "u@test.com",
    name: str = "Test",
    expires_delta: int = 3600,
    session_secret: str = SESSION_SECRET,
) -> str:
    """Create a signed JWT session cookie for test input."""
    now = int(time.time())
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "name": name,
            "iat": now,
            "exp": now + expires_delta,
        },
        session_secret,
        algorithm="HS256",
    )


# ── Construction ─────────────────────────────────────────────────────────────


class TestConstruction:
    def test_requires_session_secret(self):
        with pytest.raises(ValueError, match="session_secret"):
            _build_module(config={})

    def test_constructs_with_valid_config(self):
        module = _build_module()
        assert module.router is not None


# ── validate_session ─────────────────────────────────────────────────────────


class TestValidateSession:
    def test_valid_cookie_returns_session(self):
        module = _build_module()
        request = Mock()
        request.cookies = {COOKIE_NAME: _make_cookie()}

        session = module.validate_session(request)
        assert isinstance(session, Session)
        assert session.user_id == "user-1"
        assert session.additional["email"] == "u@test.com"
        assert session.additional["name"] == "Test"

    def test_no_cookie_returns_401(self):
        from fastapi import HTTPException

        module = _build_module()
        request = Mock()
        request.cookies = {}

        with pytest.raises(HTTPException) as exc_info:
            module.validate_session(request)
        assert exc_info.value.status_code == 401

    def test_tampered_cookie_returns_401(self):
        from fastapi import HTTPException

        module = _build_module()
        request = Mock()
        request.cookies = {COOKIE_NAME: "garbage.token.here"}

        with pytest.raises(HTTPException) as exc_info:
            module.validate_session(request)
        assert exc_info.value.status_code == 401

    def test_expired_cookie_returns_401(self):
        from fastapi import HTTPException

        module = _build_module()
        cookie = _make_cookie(expires_delta=-60)
        request = Mock()
        request.cookies = {COOKIE_NAME: cookie}

        with pytest.raises(HTTPException) as exc_info:
            module.validate_session(request)
        assert exc_info.value.status_code == 401

    def test_wrong_secret_returns_401(self):
        from fastapi import HTTPException

        module = _build_module()
        cookie = _make_cookie(session_secret="other-secret")
        request = Mock()
        request.cookies = {COOKIE_NAME: cookie}

        with pytest.raises(HTTPException) as exc_info:
            module.validate_session(request)
        assert exc_info.value.status_code == 401

    def test_optional_claims_included_when_present(self):
        module = _build_module()
        now = int(time.time())
        cookie = jwt.encode(
            {
                "sub": "u1",
                "email": "a@b.com",
                "name": "Alice",
                "email_verified": True,
                "iat": now,
                "exp": now + 3600,
            },
            SESSION_SECRET,
            algorithm="HS256",
        )
        request = Mock()
        request.cookies = {COOKIE_NAME: cookie}

        session = module.validate_session(request)
        assert session.additional["email_verified"] is True


# ── /api/auth/userinfo ───────────────────────────────────────────────────────


class TestSessionStatusEndpoint:
    def test_authenticated(self):
        module = _build_module()
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user-1"
        assert data["additional"]["email"] == "u@test.com"
        assert data["additional"]["name"] == "Test"

    def test_unauthenticated_returns_401(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 401

    def test_expired_cookie_returns_401(self):
        module = _build_module()
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie(expires_delta=-60))

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 401
