"""
Session Module: Provides session management handling capabilities.
- Session creation and validation
- Session data management
- Session-based user identification
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict

from fastapi import Request, Response
from modai.module import ModaiModule, ModuleDependencies


@dataclass
class Session:
    user_id: str
    additional: dict[str, Any]


class SessionModule(ModaiModule, ABC):
    """
    Module Declaration for: Session (Regular Module)
    Handles session management operations.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.logger = logging.getLogger(__name__)

    @abstractmethod
    def start_new_session(
        self,
        request: Request,
        response: Response,
        user_id: str,
        **kwargs,
    ):
        """
        Creates a session for the given user and applies it to the response.

        Args:
            user_id: Unique identifier for the user
            **kwargs: Additional data to include in the session
        """
        pass

    @abstractmethod
    def validate_session(
        self,
        request: Request,
    ) -> Session:
        """
        Validates and decodes a session.

        Returns:
            The active valid session

        Raises:
            If session is invalid or expired
        """
        pass

    @abstractmethod
    def end_session(
        self,
        request: Request,
        response: Response,
    ):
        """
        Ends the session by invalidating the session.
        """
        pass

    def validate_session_for_http(
        self,
        request: Request,
    ) -> Session:
        """
        Helper function which wraps the #validate_session method for HTTP request handling.

        Returns:
            The active valid session

        Raises:
            An HTTPException if session is invalid or expired
        """
        try:
            return self.validate_session(request)
        except Exception as e:
            self.logger.exception("Session validation failed: %s", str(e))
            from fastapi import HTTPException

            raise HTTPException(
                status_code=401, detail="Missing, invalid or expired session"
            ) from e
