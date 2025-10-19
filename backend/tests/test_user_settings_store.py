"""
Unit tests for the User Settings Store module.

Tests both the abstract module interface and the SQLAlchemy implementation.
"""

from abc import ABC, abstractmethod
import pytest

from modai.module import ModuleDependencies
from modai.modules.user_settings_store.inmemory_user_settings_store import (
    InMemoryUserSettingsStore,
)
from modai.modules.user_settings_store.module import UserSettingsStore
from modai.modules.user_settings_store.sqlalchemy_user_settings_store import (
    SQLAlchemyUserSettingsStore,
)


class TestSQLAlchemyUserSettingsStore(ABC):
    """Test the SQLAlchemy UserSettingsStore implementation"""

    @pytest.fixture
    def dependencies(self):
        """Create module dependencies"""
        return ModuleDependencies(modules={})

    @pytest.fixture
    @abstractmethod
    def store(self, dependencies, config):
        """Create a test store instance with patched _table_to_user_settings method"""
        pass

    @pytest.mark.asyncio
    async def test_get_user_settings_empty(self, store: UserSettingsStore):
        """Test getting settings for user with no existing settings"""
        user_id = "test-user-123"

        result = await store.get_user_settings(user_id)

        assert result == {}

    @pytest.mark.asyncio
    async def test_get_user_settings_invalid_user_id(self, store: UserSettingsStore):
        """Test getting settings with invalid user_id raises error"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.get_user_settings("")

    @pytest.mark.asyncio
    async def test_get_user_setting_by_module_empty(self, store: UserSettingsStore):
        """Test getting specific module settings for user with no settings"""
        user_id = "test-user-123"
        module_name = "theme"

        result = await store.get_user_setting_by_module(user_id, module_name)

        assert result == {}

    @pytest.mark.asyncio
    async def test_get_user_setting_by_module_invalid_params(
        self, store: UserSettingsStore
    ):
        """Test getting module settings with invalid parameters raises errors"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.get_user_setting_by_module("", "theme")

        with pytest.raises(ValueError, match="module_name cannot be empty"):
            await store.get_user_setting_by_module("user123", "")

    @pytest.mark.asyncio
    async def test_update_user_settings_new_user(self, store: UserSettingsStore):
        """Test updating settings for new user"""
        user_id = "test-user-123"
        settings = {
            "theme": {"mode": "dark", "primary_color": "#1976d2"},
            "notifications": {"email_enabled": True},
        }

        result = await store.update_user_settings(user_id, settings)

        assert isinstance(result, dict)
        assert result["theme"]["mode"] == "dark"
        assert result["theme"]["primary_color"] == "#1976d2"
        assert result["notifications"]["email_enabled"] == True

    @pytest.mark.asyncio
    async def test_update_user_settings_existing_user(self, store: UserSettingsStore):
        """Test updating settings for existing user (merge behavior)"""
        user_id = "test-user-123"

        # First, create initial settings
        initial_settings = {
            "theme": {"mode": "light", "primary_color": "#blue"},
            "notifications": {"email_enabled": False, "push_enabled": True},
        }
        await store.update_user_settings(user_id, initial_settings)

        # Then update only theme settings
        update_settings = {"theme": {"mode": "dark", "primary_color": "#red"}}
        result = await store.update_user_settings(user_id, update_settings)

        assert isinstance(result, dict)
        # Theme should be updated
        assert result["theme"]["mode"] == "dark"
        assert result["theme"]["primary_color"] == "#red"
        # Notifications should remain unchanged
        assert result["notifications"]["email_enabled"] == False
        assert result["notifications"]["push_enabled"] == True

    @pytest.mark.asyncio
    async def test_update_user_settings_invalid_params(self, store: UserSettingsStore):
        """Test updating settings with invalid parameters raises errors"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.update_user_settings("", {})

        with pytest.raises(ValueError, match="settings must be a dictionary"):
            await store.update_user_settings("user123", "not a dict")

    @pytest.mark.asyncio
    async def test_update_user_setting_by_module_new_user(
        self, store: UserSettingsStore
    ):
        """Test updating specific module settings for new user"""
        user_id = "test-user-123"
        module_name = "theme"
        setting_data = {"mode": "dark", "primary_color": "#1976d2"}

        result = await store.update_user_setting_by_module(
            user_id, module_name, setting_data
        )

        assert isinstance(result, dict)
        assert result == setting_data

    @pytest.mark.asyncio
    async def test_update_user_setting_by_module_existing_user(
        self, store: UserSettingsStore
    ):
        """Test updating specific module settings for existing user"""
        user_id = "test-user-123"

        # First, create initial settings
        initial_settings = {
            "theme": {"mode": "light", "primary_color": "#blue"},
            "notifications": {"email_enabled": False},
        }
        await store.update_user_settings(user_id, initial_settings)

        # Then update specific module settings
        module_name = "theme"
        setting_data = {"mode": "dark", "primary_color": "#red", "sidebar": "collapsed"}
        result = await store.update_user_setting_by_module(
            user_id, module_name, setting_data
        )

        assert isinstance(result, dict)
        assert result == setting_data

        # Verify all settings are properly stored
        all_settings = await store.get_user_settings(user_id)
        assert all_settings["theme"] == setting_data
        # Other settings should remain unchanged
        assert all_settings["notifications"]["email_enabled"] == False

    @pytest.mark.asyncio
    async def test_update_user_setting_by_module_invalid_params(
        self, store: UserSettingsStore
    ):
        """Test updating module settings with invalid parameters raises errors"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.update_user_setting_by_module("", "theme", {})

        with pytest.raises(ValueError, match="module_name cannot be empty"):
            await store.update_user_setting_by_module("user123", "", {})

        with pytest.raises(ValueError, match="setting_data must be a dictionary"):
            await store.update_user_setting_by_module("user123", "theme", "not a dict")

    @pytest.mark.asyncio
    async def test_get_settings_after_update(self, store: UserSettingsStore):
        """Test full flow: update settings then retrieve them"""
        user_id = "test-user-123"

        # Update settings
        settings = {
            "theme": {"mode": "dark", "sidebar": "collapsed"},
            "language": {"locale": "en-US", "timezone": "UTC"},
        }
        await store.update_user_settings(user_id, settings)

        # Retrieve all settings
        result = await store.get_user_settings(user_id)

        assert isinstance(result, dict)
        assert result["theme"]["mode"] == "dark"
        assert result["theme"]["sidebar"] == "collapsed"
        assert result["language"]["locale"] == "en-US"
        assert result["language"]["timezone"] == "UTC"

        # Retrieve specific module settings
        theme_result = await store.get_user_setting_by_module(user_id, "theme")
        assert theme_result["mode"] == "dark"
        assert theme_result["sidebar"] == "collapsed"

    @pytest.mark.asyncio
    async def test_delete_user_settings(self, store: UserSettingsStore):
        """Test deleting all user settings"""
        user_id = "test-user-123"

        # Create settings first
        settings = {"theme": {"mode": "dark"}}
        await store.update_user_settings(user_id, settings)

        # Verify settings exist
        result = await store.get_user_settings(user_id)
        assert result["theme"]["mode"] == "dark"

        # Delete settings
        await store.delete_user_settings(user_id)

        # Verify settings are gone
        result = await store.get_user_settings(user_id)
        assert result == {}

    @pytest.mark.asyncio
    async def test_delete_user_settings_invalid_user_id(self, store: UserSettingsStore):
        """Test deleting settings with invalid user_id raises error"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.delete_user_settings("")

    @pytest.mark.asyncio
    async def test_delete_user_setting_by_module(self, store: UserSettingsStore):
        """Test deleting specific module settings"""
        user_id = "test-user-123"

        # Create settings first
        settings = {"theme": {"mode": "dark"}, "notifications": {"email_enabled": True}}
        await store.update_user_settings(user_id, settings)

        # Delete specific module settings
        await store.delete_user_setting_by_module(user_id, "theme")

        # Verify the setting was deleted
        remaining_settings = await store.get_user_settings(user_id)
        assert "theme" not in remaining_settings
        assert remaining_settings["notifications"]["email_enabled"] == True

    @pytest.mark.asyncio
    async def test_delete_last_setting_by_module(self, store: UserSettingsStore):
        """Test deleting the last module settings removes entire record"""
        user_id = "test-user-123"

        # Create settings with only one module
        settings = {"theme": {"mode": "dark"}}
        await store.update_user_settings(user_id, settings)

        # Delete the only module settings
        await store.delete_user_setting_by_module(user_id, "theme")

        # Verify user has no settings left
        remaining_settings = await store.get_user_settings(user_id)
        assert remaining_settings == {}

    @pytest.mark.asyncio
    async def test_delete_user_setting_by_module_invalid_params(
        self, store: UserSettingsStore
    ):
        """Test deleting module settings with invalid parameters raises errors"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.delete_user_setting_by_module("", "theme")

        with pytest.raises(ValueError, match="module_name cannot be empty"):
            await store.delete_user_setting_by_module("user123", "")

    @pytest.mark.asyncio
    async def test_user_has_settings(self, store: UserSettingsStore):
        """Test checking if user has settings"""
        user_id = "test-user-123"

        # Initially no settings
        result = await store.user_has_settings(user_id)
        assert result == False

        # Add settings
        settings = {"theme": {"mode": "dark"}}
        await store.update_user_settings(user_id, settings)

        # Should have settings now
        result = await store.user_has_settings(user_id)
        assert result == True

        # Delete settings
        await store.delete_user_settings(user_id)

        # Should not have settings anymore
        result = await store.user_has_settings(user_id)
        assert result == False

    @pytest.mark.asyncio
    async def test_user_has_settings_invalid_user_id(self, store: UserSettingsStore):
        """Test checking settings with invalid user_id raises error"""
        with pytest.raises(ValueError, match="user_id cannot be empty"):
            await store.user_has_settings("")

    def test_migrate_data(self, store: UserSettingsStore):
        """Test migration method exists and can be called"""
        # Should not raise an exception
        store.migrate_data("1.0.0", None)
        store.migrate_data("1.1.0", "1.0.0")


class TestInmemoryUserSettingsStore(TestSQLAlchemyUserSettingsStore):
    @pytest.fixture
    def store(self, dependencies):
        """Create a test store instance with patched _table_to_user_settings method"""
        return InMemoryUserSettingsStore(dependencies, {})


class TestSQLAlchemyUserSettingsStore(TestSQLAlchemyUserSettingsStore):
    @pytest.fixture
    def store(self, dependencies):
        """Create a test store instance with patched _table_to_user_settings method"""
        config = {"database_url": "sqlite:///:memory:", "echo": True}
        return SQLAlchemyUserSettingsStore(dependencies, config)

    def test_store_initialization_default_database_url(self, dependencies):
        """Test store fails when database URL is not specified"""
        config = {}
        with pytest.raises(
            ValueError,
            match="SQLAlchemyUserSettingsStore requires 'database_url' to be specified in config",
        ):
            SQLAlchemyUserSettingsStore(dependencies, config)
