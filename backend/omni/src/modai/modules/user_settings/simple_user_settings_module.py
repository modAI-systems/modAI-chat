"""
Simple UserSettings implementation using UserSettingsStore.
This implementation delegates persistence to a UserSettingsStore module.
"""

from typing import Any
from fastapi import Request, HTTPException

from modai.module import ModuleDependencies
from modai.modules.user_settings.module import (
    UserSettingsModule,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
    UserSettingTypeResponse,
    UserSettingTypeUpdateRequest,
)
from modai.modules.session.module import SessionModule
from modai.modules.user_settings_store.module import UserSettingsStore


class SimpleUserSettingsModule(UserSettingsModule):
    """
    Simple implementation of the UserSettings module.

    This implementation delegates persistence to a UserSettingsStore module
    and focuses on handling HTTP requests and authentication.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

        # Get required dependencies
        self.session_module: SessionModule = dependencies.modules.get("session")
        self.user_settings_store: UserSettingsStore = dependencies.modules.get(
            "user_settings_store"
        )

        if not self.session_module:
            raise ValueError("UserSettings module requires a session module dependency")
        if not self.user_settings_store:
            raise ValueError(
                "UserSettings module requires a user_settings_store module dependency"
            )

    async def get_user_settings(
        self, user_id: str, request: Request
    ) -> UserSettingsResponse:
        """
        Retrieves all settings for a specific user.
        """
        await self._validate_user_authorization(user_id, request)

        user_settings = await self.user_settings_store.get_user_settings(user_id)
        return UserSettingsResponse(settings=user_settings)

    async def update_user_settings(
        self, user_id: str, settings_update: UserSettingsUpdateRequest, request: Request
    ) -> UserSettingsResponse:
        """
        Updates settings for a specific user.
        """
        await self._validate_user_authorization(user_id, request)

        user_settings = await self.user_settings_store.update_user_settings(
            user_id, settings_update.settings
        )
        return UserSettingsResponse(settings=user_settings)

    async def get_user_setting_type(
        self, user_id: str, setting_type: str, request: Request
    ) -> UserSettingTypeResponse:
        """
        Retrieves a specific setting type for a user.
        """
        await self._validate_user_authorization(user_id, request)

        setting_data = await self.user_settings_store.get_user_setting_by_module(
            user_id, setting_type
        )
        return UserSettingTypeResponse(settings=setting_data)

    async def update_user_setting_type(
        self,
        user_id: str,
        setting_type: str,
        settings_update: UserSettingTypeUpdateRequest,
        request: Request,
    ) -> UserSettingTypeResponse:
        """
        Updates a specific setting type for a user.
        """
        await self._validate_user_authorization(user_id, request)

        setting_data = await self.user_settings_store.update_user_setting_by_module(
            user_id, setting_type, settings_update.settings
        )
        return UserSettingTypeResponse(settings=setting_data)

    async def _validate_user_authorization(
        self, user_id: str, request: Request
    ) -> None:
        """
        Validates session and ensures user can only access their own data.

        Args:
            user_id: The user ID to check access for

        Raises:
            HTTPException: If session is invalid or user tries to access other user's data
        """
        # Validate session
        session = self.session_module.validate_session_for_http(request)

        # TODO this is actually authorization logic and should not be done here
        #      but via the authorization module. To be refactored later.

        # Check if user can access these settings (only their own for now)
        if session.user_id != user_id:
            raise HTTPException(
                status_code=403, detail="You can only access your own data"
            )
