"""
In-memory UserSettingsStore implementation for testing and development usage.
This implementation stores data in memory and is useful for testing scenarios
where persistence is not required.
"""

from typing import Any, Dict

from modai.module import ModuleDependencies
from modai.modules.user_settings_store.module import UserSettingsStore


class InMemoryUserSettingsStore(UserSettingsStore):
    """
    In-memory implementation of the UserSettingsStore module.

    This implementation stores all user settings in memory using dictionaries.
    Data is lost when the application restarts, making it suitable for
    testing and development scenarios where persistence is not required.
    """

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        # Storage structure: {user_id: {module_name: setting_data}}
        self.storage: Dict[str, Dict[str, Dict[str, Any]]] = {}

    async def get_user_settings(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        """
        Retrieve all settings for a specific user.
        """
        self._validate_user_id(user_id)
        return self.storage.get(user_id, {})

    async def get_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> Dict[str, Any]:
        """
        Retrieve user settings of a specific module.
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)

        user_settings = self.storage.get(user_id)
        if user_settings:
            return user_settings.get(module_name, {})
        return {}

    async def update_user_settings(
        self, user_id: str, settings: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Update multiple module settings for a user (merge operation).
        """
        self._validate_user_id(user_id)
        if not isinstance(settings, dict):
            raise ValueError("settings must be a dictionary")

        existing = self.storage.get(user_id)
        if existing:
            # Merge settings
            merged_settings = existing.copy()
            merged_settings.update(settings)
            self.storage[user_id] = merged_settings
            return merged_settings
        else:
            # Create new
            self.storage[user_id] = settings
            return settings

    async def update_user_setting_by_module(
        self, user_id: str, module_name: str, setting_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update module settings for a user (replace operation).
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)
        if not isinstance(setting_data, dict):
            raise ValueError("setting_data must be a dictionary")

        existing = self.storage.get(user_id)
        if existing:
            existing[module_name] = setting_data
        else:
            # Create new
            new_settings = {module_name: setting_data}
            self.storage[user_id] = new_settings

        return setting_data

    async def delete_user_settings(self, user_id: str) -> None:
        """
        Delete all settings for a specific user.
        """
        self._validate_user_id(user_id)

        if user_id in self.storage:
            del self.storage[user_id]

    async def delete_user_setting_by_module(
        self, user_id: str, module_name: str
    ) -> None:
        """
        Delete specific module settings for a user.
        """
        self._validate_user_id(user_id)
        self._validate_module_name(module_name)

        existing = self.storage.get(user_id)
        if existing and module_name in existing:
            del existing[module_name]
            if not existing:  # No settings left
                del self.storage[user_id]

    async def user_has_settings(self, user_id: str) -> bool:
        """
        Check if a user has any settings.
        """
        self._validate_user_id(user_id)

        user_settings = self.storage.get(user_id)
        return user_settings is not None and bool(user_settings)

    # Persistence Module implementation
    def migrate_data(self, software_version: str, previous_version: str | None) -> None:
        """
        Migrate data from old JSON-based schema to new separate column schema.
        """
        pass

    def _validate_user_id(self, user_id: str) -> None:
        """Validate that user_id is not empty"""
        if not user_id:
            raise ValueError("user_id cannot be empty")

    def _validate_module_name(self, module_name: str) -> None:
        """Validate that module_name is not empty"""
        if not module_name:
            raise ValueError("module_name cannot be empty")
