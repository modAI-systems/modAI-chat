"""
OIDC Auth Module: Server-side OIDC Authorization Code flow with PKCE.

Handles the authentication lifecycle: login redirect, authorization-code
exchange, and logout. Session *validation* on subsequent requests is the
responsibility of OIDCSessionModule (oidc_session.py).

The session cookie set by this module is a self-contained signed JWT —
no session state is stored on the server. See _cookie.py for the payload
structure.

Authlib's Starlette integration handles PKCE (code_verifier, code_challenge,
state) automatically, storing ephemeral OAuth state in the session cookie
provided by Starlette's SessionMiddleware. Only the post-login redirect URI
is stored manually alongside Authlib's state.

Endpoints:
  GET  /api/auth/login    - Redirects to OIDC provider authorization endpoint
  GET  /api/auth/callback - Exchanges authorization code for tokens via PKCE,
                            then sets a stateless session cookie
  POST /api/auth/logout   - Clears session cookie, redirects to OIDC
                            end_session_endpoint
"""

import logging
from typing import Any
from urllib.parse import urlencode

from authlib.integrations.base_client import MismatchingStateError, OAuthError
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from modai.module import ModaiModule, ModuleDependencies
from modai.modules.authentication._cookie import (
    COOKIE_NAME,
    DEFAULT_SESSION_DURATION,
    encode_session_cookie,
)

logger = logging.getLogger(__name__)

# Cookie name for the Starlette session used by SessionMiddleware. It carries
# Authlib's PKCE state and the post-login redirect URI across the OAuth
# redirect round-trip. Short-lived (5 min) and samesite=lax so the browser
# sends it on the top-level GET redirect back from the IDP.
AUTH_STATE_COOKIE_NAME = "modai_auth_state"
AUTH_STATE_DURATION = 300  # seconds


class OIDCAuthModule(ModaiModule):
    """
    OIDC authentication module using Authlib's Starlette integration.

    Handles login redirect, authorization-code exchange, and logout.
    Authlib manages PKCE and state via the signed session cookie.
    Produces a stateless signed JWT session cookie — nothing is stored
    in memory per user or per session.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)
        self.router = APIRouter()

        # Required config
        self.issuer = self._require_config("issuer")
        self.client_id = self._require_config("client_id")
        self.redirect_uri = self._require_config("redirect_uri")
        self.session_secret = self._require_config("session_secret")

        # Optional config
        self.client_secret = self.config.get("client_secret", None)
        self.post_login_uri = self.config.get("post_login_uri", "/")
        self.post_logout_uri = self.config.get("post_logout_uri", "/")
        self.scopes = self.config.get("scopes", "openid profile email offline_access")
        self.cookie_secure = self.config.get("cookie_secure", False)
        self.cookie_samesite = self.config.get("cookie_samesite", "lax")
        self.session_duration: int = int(
            self.config.get("session_duration", DEFAULT_SESSION_DURATION)
        )

        self._oauth = OAuth()
        self._oauth.register(
            name="oidc",
            client_id=self.client_id,
            client_secret=self.client_secret,
            server_metadata_url=f"{self.issuer.rstrip('/')}/.well-known/openid-configuration",
            client_kwargs={
                "scope": self.scopes,
                "code_challenge_method": "S256",
            },
        )

        self.router.add_api_route("/api/auth/login", self.login, methods=["GET"])
        self.router.add_api_route("/api/auth/callback", self.callback, methods=["GET"])
        self.router.add_api_route("/api/auth/logout", self.logout, methods=["POST"])

    def configure_app(self, app: FastAPI) -> None:
        """Register SessionMiddleware for signed ephemeral PKCE state storage."""
        app.add_middleware(
            SessionMiddleware,
            secret_key=self.session_secret,
            session_cookie=AUTH_STATE_COOKIE_NAME,
            max_age=AUTH_STATE_DURATION,
            same_site="lax",
            https_only=self.cookie_secure,
        )

    # ── Web endpoints ────────────────────────────────────────────────────

    async def login(self, request: Request) -> RedirectResponse:
        """Initiate OIDC Authorization Code flow with PKCE via Authlib."""
        redirect_after = request.query_params.get("redirect_uri") or self.post_login_uri
        # Store alongside Authlib's own PKCE state in the session.
        request.session["post_login_uri"] = redirect_after
        return await self._oauth.oidc.authorize_redirect(request, self.redirect_uri)

    async def callback(self, request: Request) -> RedirectResponse:
        """Handle OIDC callback: exchange code for tokens, set session cookie."""
        error = request.query_params.get("error")
        if error:
            self.logger.error("OIDC callback error: %s", error)
            raise HTTPException(status_code=400, detail="Authentication failed")

        if not request.query_params.get("code") or not request.query_params.get(
            "state"
        ):
            raise HTTPException(
                status_code=400, detail="Missing code or state parameter"
            )

        # Authlib validates the state against the session, exchanges the code
        # for tokens via PKCE, and returns the token response.
        try:
            token = await self._oauth.oidc.authorize_access_token(request)
        except MismatchingStateError:
            raise HTTPException(status_code=400, detail="Invalid or expired state")
        except OAuthError as exc:
            self.logger.error("Token exchange failed: %s", exc)
            raise HTTPException(status_code=502, detail="Token exchange failed")

        user_info = dict(await self._oauth.oidc.userinfo(token=token))

        sub = user_info.get("sub")
        if not sub:
            self.logger.error("IDP did not return a sub claim")
            raise HTTPException(status_code=502, detail="Identity provider error")

        post_login_uri = request.session.pop("post_login_uri", self.post_login_uri)
        request.session.clear()

        session_cookie = encode_session_cookie(
            sub=str(sub),
            email=user_info.get("email", ""),
            name=user_info.get("name"),
            email_verified=user_info.get("email_verified"),
            session_secret=self.session_secret,
            session_duration=self.session_duration,
        )

        response = RedirectResponse(
            post_login_uri or self.post_login_uri, status_code=302
        )
        response.set_cookie(
            COOKIE_NAME,
            session_cookie,
            httponly=True,
            secure=self.cookie_secure,
            samesite=self.cookie_samesite,
            max_age=self.session_duration,
        )
        self.logger.info("Authentication successful for user: %s", sub)
        return response

    async def logout(self, request: Request) -> Response:
        """Clear session cookie and redirect to OIDC end_session_endpoint."""
        if not request.cookies.get(COOKIE_NAME):
            raise HTTPException(status_code=401, detail="Not authenticated")
        metadata = await self._oauth.oidc.load_server_metadata()
        end_session_endpoint = metadata.get("end_session_endpoint")

        if end_session_endpoint:
            params = {
                "post_logout_redirect_uri": self.post_logout_uri,
                "client_id": self.client_id,
            }
            logout_url = f"{end_session_endpoint}?{urlencode(params)}"
            response: Response = RedirectResponse(logout_url, status_code=302)
        else:
            response = RedirectResponse(self.post_logout_uri, status_code=302)

        response.delete_cookie(COOKIE_NAME)
        return response

    # ── Internal helpers ─────────────────────────────────────────────────

    def _require_config(self, key: str) -> str:
        value = self.config.get(key)
        if not value:
            raise ValueError(f"authentication module requires '{key}' config")
        return value
