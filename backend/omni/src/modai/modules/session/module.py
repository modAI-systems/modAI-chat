"""
Session Module: Provides session management handling capabilities.
- Session validation
- Session-based user identification
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Request
from modai.module import ModaiModule, ModuleDependencies


@dataclass
class Session:
    user_id: str
    additional: dict[str, Any]


class SessionModule(ModaiModule, ABC):
    """
    Module Declaration for: Session (Web Module)
    Handles session validation operations and exposes the current session endpoint.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)
        self.router = APIRouter()
        self.router.add_api_route(
            "/api/auth/userinfo",
            self.validate_session,
            methods=["GET"],
        )

    @abstractmethod
    def validate_session(
        self,
        request: Request,
    ) -> Session:
        """
        Endpoint handler and validator for the current session.

        Returns:
            The active valid session information

        Raises:
            HTTPException if session is missing, invalid or expired
        """
        pass
