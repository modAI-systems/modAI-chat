"""
UserSettingsStore Module: Provides user settings persistence capabilities.
- User settings CRUD operations
- Module name management
- JSON-based flexible storage
"""

from abc import ABC, abstractmethod
from typing import Any

from modai.module import ModaiModule, ModuleDependencies


class UserSettingsStore(ModaiModule, ABC):
    """
    This module provides persistence capabilities for user settings.
    It manages the storage and retrieval of user-specific settings
    organized by module name with flexible JSON structures.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)

    # User Settings Operations
    @abstractmethod
    async def get_user_settings(self, user_id: str) -> dict[str, dict[str, Any]]:
        """
        Retrieve all settings for a specific user.

        Args:
            user_id: The unique identifier of the user

        Returns:
            dictionary containing all user settings by module name, empty dict if user has no settings

        Raises:
            ValueError: If user_id is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def get_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> dict[str, Any]:
        """
        Retrieve user settings of a specific module.

        Args:
            user_id: The unique identifier of the user
            module_name: The module name of setting to retrieve

        Returns:
            dictionary containing the settings data, empty dict if not found

        Raises:
            ValueError: If user_id or module_name is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def update_user_settings(
        self, user_id: str, settings: dict[str, dict[str, Any]]
    ) -> dict[str, dict[str, Any]]:
        """
        Update multiple module settings for a user (merge operation).
        Only provided module names are updated, existing settings are preserved.

        Args:
            user_id: The unique identifier of the user
            settings: dictionary of module names to update

        Returns:
            dictionary containing all updated settings

        Raises:
            ValueError: If user_id is invalid or settings format is incorrect
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def update_user_setting_by_module(
        self, user_id: str, module_name: str, setting_data: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Update module settings for a user (replace operation).
        The specific settings are completely replaced with new data.

        Args:
            user_id: The unique identifier of the user
            module_name: The module name of setting to update
            setting_data: The new data for this settings

        Returns:
            dictionary containing the updated settings data

        Raises:
            ValueError: If user_id or module_name is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def delete_user_settings(self, user_id: str) -> None:
        """
        Delete all settings for a specific user.

        Args:
            user_id: The unique identifier of the user

        Raises:
            ValueError: If user_id is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def delete_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> None:
        """
        Delete specific module settings for a user.

        Args:
            user_id: The unique identifier of the user
            module_name: The module name of setting to delete

        Raises:
            ValueError: If user_id or module_name is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass

    @abstractmethod
    async def user_has_settings(self, user_id: str) -> bool:
        """
        Check if a user has any settings.

        Args:
            user_id: The unique identifier of the user

        Returns:
            True if user has settings, False otherwise

        Raises:
            ValueError: If user_id is invalid
            Exception: If a database or persistence infrastructure error occurs
        """
        pass
