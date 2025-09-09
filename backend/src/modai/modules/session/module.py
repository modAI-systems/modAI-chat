"""
Session Module: Provides session management handling capabilities.
- Session creation and validation
- Session data management
- Session-based user identification
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

from fastapi import Request, Response
from modai.module import ModaiModule, ModuleDependencies


class SessionModule(ModaiModule, ABC):
    """
    Module Declaration for: Session (Regular Module)
    Handles session management operations.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    @abstractmethod
    def start_new_session(
        self,
        request: Request,
        response: Response,
        user_id: str,
        username: str,
        **kwargs
    ):
        """
        Creates a session for the given user and applies it to the response.

        Args:
            request: FastAPI request object
            response: FastAPI response object
            user_id: Unique identifier for the user
            username: Username of the user
            **kwargs: Additional data to include in the session
        """
        pass

    @abstractmethod
    def validate_session(
        self,
        request: Request,
    ) -> Dict[str, Any]:
        """
        Validates and decodes a session.

        Args:
            request: FastAPI request object

        Returns:
            Dictionary containing session data (user_id, username, etc.)

        Raises:
            Exception: If session is invalid or expired
        """
        pass

    @abstractmethod
    def end_session(
        self,
        request: Request,
        response: Response,
    ) -> Dict[str, Any]:
        """
        Ends the session by invalidating the session.

        Args:
            request: FastAPI request object
            response: FastAPI response object
        """
        pass
