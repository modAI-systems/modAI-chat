"""
Dev Mock Session Module: Returns a fixed, pre-configured user session.

**FOR DEVELOPMENT USE ONLY — never deploy this module in production.**

This module implements the SessionModule interface without any real authentication.
Every request is treated as if it comes from a statically configured user,
allowing the application to be used without an identity provider.

Endpoints:
  GET /api/auth/userinfo  - Always returns the configured mock user session
"""

import logging
from typing import Any

from fastapi import Request

from modai.module import ModuleDependencies
from modai.modules.session.module import Session, SessionModule


class DevMockSessionModule(SessionModule):
    """
    Development-only session module that bypasses authentication by returning
    a fixed, pre-configured user on every request.

    **WARNING**: This module must never be used in production.
    It disables all authentication and grants every caller the configured identity.

    Configuration:
        user_id (required): The user ID returned for every request.
        email   (optional): The email included in session additional claims.
        name    (optional): The full name included in session additional claims.

    Example config.yaml entry:
        session:
          class: modai.modules.session.dev_mock_session.DevMockSessionModule
          config:
            user_id: "dev-user"
            email: "dev@example.com"
            name: "Dev User"
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)

        self._user_id = self._require_config("user_id")

        name: str | None = config.get("name") or None
        additional: dict[str, Any] = {}
        if email := config.get("email"):
            additional["email"] = email
        if name:
            additional["name"] = name
        self._session = Session(user_id=self._user_id, additional=additional)

        self.logger.warning(
            "DevMockSessionModule is active — all requests are authenticated as '%s'. "
            "Do NOT use this module in production.",
            self._user_id,
        )

    def validate_session(self, request: Request) -> Session:
        """Return the pre-configured mock session for every request."""
        return self._session

    def _require_config(self, key: str) -> str:
        value = self.config.get(key)
        if not value:
            raise ValueError(f"dev_mock_session module requires '{key}' config")
        return value
