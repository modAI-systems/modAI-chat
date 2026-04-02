import time

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock

from modai.module import ModuleDependencies
from modai.modules.authentication._cookie import COOKIE_NAME
from modai.modules.session.oidc_session import OIDCSessionModule
from modai.modules.session.module import Session
from modai.modules.user_store.module import User, UserStore

SESSION_SECRET = "super-secret-test-key"

BASE_CONFIG = {"session_secret": SESSION_SECRET}


def _build_module(
    *,
    config: dict | None = None,
    user_store: UserStore | None = None,
) -> OIDCSessionModule:
    deps: dict = {}
    if user_store:
        deps["user_store"] = user_store
    return OIDCSessionModule(
        dependencies=ModuleDependencies(deps),
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


# ── /api/auth/session ────────────────────────────────────────────────────────


class TestSessionStatusEndpoint:
    def test_authenticated(self):
        module = _build_module()
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/session")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user-1"
        assert data["additional"]["email"] == "u@test.com"

    def test_unauthenticated_returns_401(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/session")
        assert resp.status_code == 401

    def test_expired_cookie_returns_401(self):
        module = _build_module()
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie(expires_delta=-60))

        resp = client.get("/api/auth/session")
        assert resp.status_code == 401


# ── /api/auth/userinfo ───────────────────────────────────────────────────────


class TestUserinfoEndpoint:
    def test_returns_401_without_session(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 401

    def test_returns_claims_without_user_store(self):
        module = _build_module()
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-1"
        assert data["email"] == "u@test.com"

    def test_returns_existing_user_from_store(self):
        user_store = Mock(spec=UserStore)
        user_store.get_user_by_id = AsyncMock(
            return_value=User(
                id="user-1", email="store@example.com", full_name="DB User"
            )
        )
        module = _build_module(user_store=user_store)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "user-1"
        assert data["email"] == "store@example.com"
        assert data["full_name"] == "DB User"

    def test_jit_provisions_new_user(self):
        user_store = Mock(spec=UserStore)
        user_store.get_user_by_id = AsyncMock(return_value=None)
        user_store.get_user_by_email = AsyncMock(return_value=None)
        provisioned = User(id="user-1", email="u@test.com", full_name="Test")
        user_store.create_user = AsyncMock(return_value=provisioned)

        module = _build_module(user_store=user_store)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 200
        user_store.create_user.assert_called_once_with(
            email="u@test.com", full_name="Test", id="user-1"
        )

    def test_returns_user_found_by_email(self):
        user_store = Mock(spec=UserStore)
        user_store.get_user_by_id = AsyncMock(return_value=None)
        user_store.get_user_by_email = AsyncMock(
            return_value=User(id="user-1", email="u@test.com", full_name="Test")
        )

        module = _build_module(user_store=user_store)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 200
        assert resp.json()["id"] == "user-1"

    def test_returns_404_when_user_cannot_be_provisioned(self):
        user_store = Mock(spec=UserStore)
        now = int(time.time())
        # no email in cookie → cannot provision
        cookie = jwt.encode(
            {"sub": "u1", "iat": now, "exp": now + 3600},
            SESSION_SECRET,
            algorithm="HS256",
        )
        user_store.get_user_by_id = AsyncMock(return_value=None)

        module = _build_module(user_store=user_store)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, cookie)

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 404

    def test_returns_500_when_create_user_fails(self):
        user_store = Mock(spec=UserStore)
        user_store.get_user_by_id = AsyncMock(return_value=None)
        user_store.get_user_by_email = AsyncMock(return_value=None)
        user_store.create_user = AsyncMock(side_effect=RuntimeError("DB error"))

        module = _build_module(user_store=user_store)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, _make_cookie())

        resp = client.get("/api/auth/userinfo")
        assert resp.status_code == 500
