"""
User Settings Module: Provides user settings management API endpoints.

This web module provides endpoints to manage user-specific settings via REST.
Settings are organized by type/category and stored as flexible JSON structures.
"""

from abc import ABC, abstractmethod
from fastapi import APIRouter, Request
from typing import Any, Dict
from pydantic import BaseModel
from modai.module import ModaiModule, ModuleDependencies


class UserSettingsResponse(BaseModel):
    """Response model for user settings."""

    settings: Dict[str, Dict[str, Any]]


class UserSettingsUpdateRequest(BaseModel):
    """Request model for updating user settings."""

    settings: Dict[str, Dict[str, Any]]


class UserSettingTypeResponse(BaseModel):
    """Response model for a specific user setting type."""

    settings: Dict[str, Any]


class UserSettingTypeUpdateRequest(BaseModel):
    """Request model for updating a specific user setting type."""

    settings: Dict[str, Any]


class UserSettingsModule(ModaiModule, ABC):
    """
    Module Declaration for: User Settings (Web Module)

    Manages user-specific settings organized by type/category.
    Each setting type can contain arbitrary JSON data structures.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.router = APIRouter()  # This makes it a web module

        # Add user settings routes
        self.router.add_api_route(
            "/api/user/{user_id}/settings", self.get_user_settings, methods=["GET"]
        )
        self.router.add_api_route(
            "/api/user/{user_id}/settings",
            self.update_user_settings,
            methods=["PUT"],
        )
        self.router.add_api_route(
            "/api/user/{user_id}/settings/{setting_type}",
            self.get_user_setting_type,
            methods=["GET"],
        )
        self.router.add_api_route(
            "/api/user/{user_id}/settings/{setting_type}",
            self.update_user_setting_type,
            methods=["PUT"],
        )

    @abstractmethod
    async def get_user_settings(
        self, user_id: str, request: Request
    ) -> UserSettingsResponse:
        """
        Retrieves all settings for a specific user.

        Args:
            user_id: The unique identifier of the user

        Returns:
            UserSettingsResponse: All user settings organized by type

        Raises:
            HTTPException: 401 if not authenticated or session invalid
            HTTPException: 403 if user doesn't have permission to access these settings
            HTTPException: 404 if user not found
        """
        pass

    @abstractmethod
    async def update_user_settings(
        self, user_id: str, settings_update: UserSettingsUpdateRequest, request: Request
    ) -> UserSettingsResponse:
        """
        Updates settings for a specific user.

        Args:
            user_id: The unique identifier of the user
            settings_update: The settings data to update

        Returns:
            UserSettingsResponse: Updated user settings organized by type

        Raises:
            HTTPException: 401 if not authenticated or session invalid
            HTTPException: 403 if user doesn't have permission to modify these settings
            HTTPException: 404 if user not found
            HTTPException: 422 if settings data is invalid
        """
        pass

    @abstractmethod
    async def get_user_setting_type(
        self, user_id: str, setting_type: str, request: Request
    ) -> UserSettingTypeResponse:
        """
        Retrieves a specific setting type for a user.

        Args:
            user_id: The unique identifier of the user
            setting_type: The type/category of setting to retrieve

        Returns:
            UserSettingTypeResponse: The specific setting type data

        Raises:
            HTTPException: 401 if not authenticated or session invalid
            HTTPException: 403 if user doesn't have permission to access these settings
            HTTPException: 404 if user or setting type not found
        """
        pass

    @abstractmethod
    async def update_user_setting_type(
        self,
        user_id: str,
        setting_type: str,
        settings_update: UserSettingTypeUpdateRequest,
        request: Request,
    ) -> UserSettingTypeResponse:
        """
        Updates a specific setting type for a user.

        Args:
            user_id: The unique identifier of the user
            setting_type: The type/category of setting to update
            settings_update: The setting data to update

        Returns:
            UserSettingTypeResponse: The updated setting type data

        Raises:
            HTTPException: 401 if not authenticated or session invalid
            HTTPException: 403 if user doesn't have permission to modify these settings
            HTTPException: 404 if user not found
            HTTPException: 422 if settings data is invalid
        """
        pass
