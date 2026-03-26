import time
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from modai.module import ModuleDependencies
from modai.modules.authentication._cookie import (
    COOKIE_NAME,
    decode_session_cookie,
    encode_session_cookie,
)
from modai.modules.authentication.oidc_auth_module import (
    AUTH_STATE_COOKIE_NAME,
    OIDCAuthModule,
)

# Backward-compatible alias
SESSION_COOKIE_NAME = COOKIE_NAME

ISSUER = "http://idp.test"
CLIENT_ID = "test-client-id"
REDIRECT_URI = "http://localhost:8000/api/auth/callback"
SESSION_SECRET = "super-secret-test-key"
POST_LOGIN_URI = "http://localhost:5173/"
POST_LOGOUT_URI = "http://localhost:5173/"

BASE_CONFIG = {
    "issuer": ISSUER,
    "client_id": CLIENT_ID,
    "redirect_uri": REDIRECT_URI,
    "session_secret": SESSION_SECRET,
    "post_login_uri": POST_LOGIN_URI,
    "post_logout_uri": POST_LOGOUT_URI,
}


def _build_module(*, config: dict | None = None) -> OIDCAuthModule:
    return OIDCAuthModule(
        dependencies=ModuleDependencies({}),
        config=config or BASE_CONFIG,
    )


def _build_module_with_server(
    httpserver, *, extra_config: dict | None = None, metadata: dict | None = None
) -> OIDCAuthModule:
    """Build module backed by httpserver for OIDC discovery and endpoints."""
    issuer = f"http://{httpserver.host}:{httpserver.port}"
    if metadata is None:
        metadata = {
            "authorization_endpoint": f"{issuer}/oauth/v2/authorize",
            "token_endpoint": f"{issuer}/oauth/v2/token",
            "userinfo_endpoint": f"{issuer}/oidc/v1/userinfo",
            "end_session_endpoint": f"{issuer}/oidc/v1/end_session",
            "jwks_uri": f"{issuer}/oauth/v2/keys",
        }
    httpserver.expect_request("/.well-known/openid-configuration").respond_with_json(
        metadata
    )
    cfg = {**BASE_CONFIG, "issuer": issuer, **(extra_config or {})}
    return OIDCAuthModule(dependencies=ModuleDependencies({}), config=cfg)


def _build_client(module: OIDCAuthModule) -> TestClient:
    app = FastAPI()
    module.configure_app(app)
    app.include_router(module.router)
    return TestClient(app, follow_redirects=False)


def _make_session_cookie(
    *,
    sub: str = "user-1",
    email: str = "u@test.com",
    name: str = "Test",
    expires_delta: int = 3600,
    session_secret: str = SESSION_SECRET,
) -> str:
    """Build a signed JWT session cookie for use as test input."""
    now = int(time.time())
    payload = {
        "sub": sub,
        "email": email,
        "name": name,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, session_secret, algorithm="HS256")


# ── Construction tests ───────────────────────────────────────────────────────
class TestModuleConstruction:
    def test_requires_issuer(self):
        cfg = {**BASE_CONFIG}
        del cfg["issuer"]
        with pytest.raises(ValueError, match="issuer"):
            _build_module(config=cfg)

    def test_requires_client_id(self):
        cfg = {**BASE_CONFIG}
        del cfg["client_id"]
        with pytest.raises(ValueError, match="client_id"):
            _build_module(config=cfg)

    def test_requires_redirect_uri(self):
        cfg = {**BASE_CONFIG}
        del cfg["redirect_uri"]
        with pytest.raises(ValueError, match="redirect_uri"):
            _build_module(config=cfg)

    def test_requires_session_secret(self):
        cfg = {**BASE_CONFIG}
        del cfg["session_secret"]
        with pytest.raises(ValueError, match="session_secret"):
            _build_module(config=cfg)

    def test_constructs_with_valid_config(self):
        module = _build_module()
        assert module.router is not None


# ── Login endpoint ───────────────────────────────────────────────────────


class TestLogin:
    def test_login_redirects_to_idp(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        resp = client.get("/api/auth/login")
        assert resp.status_code == 302

        location = resp.headers["location"]
        parsed = urlparse(location)
        params = parse_qs(parsed.query)

        # Redirect must point to the authorization_endpoint from discovery
        assert parsed.path == "/oauth/v2/authorize"
        assert params["client_id"] == [CLIENT_ID]
        assert params["response_type"] == ["code"]
        assert params["redirect_uri"] == [REDIRECT_URI]
        assert params["code_challenge_method"] == ["S256"]
        assert "code_challenge" in params
        assert "state" in params

    def test_login_sets_auth_state_cookie(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        resp = client.get("/api/auth/login")
        assert resp.status_code == 302
        # SessionMiddleware sets the signed session cookie for Authlib PKCE state
        assert AUTH_STATE_COOKIE_NAME in resp.cookies

    def test_login_custom_redirect_uri(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        httpserver.expect_request("/oauth/v2/token").respond_with_json(
            {"access_token": "at", "expires_in": 3600, "token_type": "Bearer"}
        )
        httpserver.expect_request("/oidc/v1/userinfo").respond_with_json(
            {"sub": "user-1", "email": "u@test.com"}
        )

        # Login with a custom post-login redirect
        login_resp = client.get("/api/auth/login?redirect_uri=http://app/dashboard")
        state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

        # Complete the callback and verify the final redirect destination
        callback_resp = client.get(f"/api/auth/callback?code=code&state={state}")
        assert callback_resp.headers["location"] == "http://app/dashboard"


# ── Callback endpoint ───────────────────────────────────────────────────


class TestCallback:
    def test_callback_error_parameter(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/callback?error=access_denied")
        assert resp.status_code == 400

    def test_callback_missing_code(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/callback?state=abc")
        assert resp.status_code == 400

    def test_callback_missing_state(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/callback?code=xyz")
        assert resp.status_code == 400

    def test_callback_invalid_state(self, httpserver):
        """Authlib raises MismatchingStateError when the state doesn't match the session."""
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        # Login populates the session with state S1; callback sends S2 -> mismatch
        client.get("/api/auth/login")
        resp = client.get("/api/auth/callback?code=xyz&state=wrong-state")
        assert resp.status_code == 400

    def test_callback_missing_auth_state_cookie(self):
        """Calling callback without a prior login raises MismatchingStateError -> 400."""
        module = _build_module()
        client = _build_client(module)

        resp = client.get("/api/auth/callback?code=xyz&state=abc")
        assert resp.status_code == 400

    def test_callback_success(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        httpserver.expect_request("/oauth/v2/token").respond_with_json(
            {
                "access_token": "at-new",
                "refresh_token": "rt-new",
                "expires_in": 3600,
                "token_type": "Bearer",
            }
        )
        httpserver.expect_request("/oidc/v1/userinfo").respond_with_json(
            {"sub": "user-1", "email": "u@test.com", "name": "Test User"}
        )

        # Login first so Authlib stores the PKCE state in the session
        login_resp = client.get("/api/auth/login")
        state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

        resp = client.get(f"/api/auth/callback?code=auth-code&state={state}")
        assert resp.status_code == 302
        assert resp.headers["location"] == POST_LOGIN_URI

        assert COOKIE_NAME in resp.cookies
        payload = decode_session_cookie(resp.cookies[COOKIE_NAME], SESSION_SECRET)
        assert payload["sub"] == "user-1"
        assert payload["email"] == "u@test.com"

    def test_callback_token_exchange_failure(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        httpserver.expect_request("/oauth/v2/token").respond_with_json(
            {"error": "invalid_grant"}, status=400
        )

        login_resp = client.get("/api/auth/login")
        state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

        resp = client.get(f"/api/auth/callback?code=bad&state={state}")
        assert resp.status_code == 502

    def test_callback_idp_missing_sub(self, httpserver):
        """If the IDP userinfo response has no sub claim, the callback returns 502."""
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        httpserver.expect_request("/oauth/v2/token").respond_with_json(
            {"access_token": "at", "expires_in": 3600}
        )
        httpserver.expect_request("/oidc/v1/userinfo").respond_with_json(
            {"email": "u@test.com"}  # no sub
        )

        login_resp = client.get("/api/auth/login")
        state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

        resp = client.get(f"/api/auth/callback?code=c&state={state}")
        assert resp.status_code == 502


# ── Logout endpoint ─────────────────────────────────────────────────────


class TestLogout:
    def test_logout_redirects_to_idp(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        cookie = _make_session_cookie()
        client.cookies.set(COOKIE_NAME, cookie)

        resp = client.post("/api/auth/logout")
        assert resp.status_code == 302

        location = resp.headers["location"]
        assert "end_session" in location
        assert f"client_id={CLIENT_ID}" in location

    def test_logout_without_session(self):
        module = _build_module()
        client = _build_client(module)

        resp = client.post("/api/auth/logout")
        assert resp.status_code == 401

    def test_logout_without_end_session_endpoint(self, httpserver):
        issuer = f"http://{httpserver.host}:{httpserver.port}"
        module = _build_module_with_server(
            httpserver,
            metadata={
                "authorization_endpoint": f"{issuer}/oauth/v2/authorize",
                "token_endpoint": f"{issuer}/oauth/v2/token",
                "userinfo_endpoint": f"{issuer}/oidc/v1/userinfo",
                # no end_session_endpoint
            },
        )
        client = _build_client(module)

        cookie = _make_session_cookie()
        client.cookies.set(COOKIE_NAME, cookie)

        resp = client.post("/api/auth/logout")
        assert resp.status_code == 302
        assert resp.headers["location"] == POST_LOGOUT_URI

    def test_logout_with_expired_cookie(self, httpserver):
        """Expired cookies are cleared and the user is redirected (no 401 - already logged out)."""
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        cookie = _make_session_cookie(expires_delta=-60)
        client.cookies.set(COOKIE_NAME, cookie)

        resp = client.post("/api/auth/logout")
        assert resp.status_code == 302

    def test_logout_with_tampered_cookie(self, httpserver):
        """Tampered cookies are cleared and the user is redirected."""
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        client.cookies.set(COOKIE_NAME, "garbage.token.here")

        resp = client.post("/api/auth/logout")
        assert resp.status_code == 302


# ── Cookie structure ─────────────────────────────────────────────────────


class TestCookieStructure:
    """Verify that the cookie produced by the callback is a valid stateless JWT."""

    def test_cookie_contains_user_claims_after_callback(self, httpserver):
        module = _build_module_with_server(httpserver)
        client = _build_client(module)

        httpserver.expect_request("/oauth/v2/token").respond_with_json(
            {"access_token": "at", "expires_in": 3600}
        )
        httpserver.expect_request("/oidc/v1/userinfo").respond_with_json(
            {
                "sub": "user-99",
                "email": "test@example.com",
                "name": "Test Person",
                "email_verified": True,
            }
        )

        login_resp = client.get("/api/auth/login")
        state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

        resp = client.get(f"/api/auth/callback?code=c&state={state}")
        assert resp.status_code == 302

        payload = decode_session_cookie(resp.cookies[COOKIE_NAME], SESSION_SECRET)
        assert payload["sub"] == "user-99"
        assert payload["email"] == "test@example.com"
        assert payload["name"] == "Test Person"
        assert payload["email_verified"] is True
        assert payload["exp"] > time.time()

    def test_encode_then_decode_roundtrip(self):
        cookie = encode_session_cookie(
            sub="u1",
            email="a@b.com",
            name="Alice",
            email_verified=True,
            session_secret=SESSION_SECRET,
        )
        payload = decode_session_cookie(cookie, SESSION_SECRET)
        assert payload["sub"] == "u1"
        assert payload["email"] == "a@b.com"
        assert payload["name"] == "Alice"
        assert payload["email_verified"] is True

    def test_decode_raises_on_expired_cookie(self):
        cookie = _make_session_cookie(expires_delta=-1)
        with pytest.raises(ValueError, match="expired"):
            decode_session_cookie(cookie, SESSION_SECRET)

    def test_decode_raises_on_wrong_secret(self):
        cookie = _make_session_cookie()
        with pytest.raises(ValueError, match="Invalid session cookie"):
            decode_session_cookie(cookie, "wrong-secret")
