"""
Unit tests for the User Settings module.
Tests both the abstract module interface and the simple implementation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException, Request
from typing import Dict, Any

from modai.module import ModuleDependencies
from modai.modules.user_settings.module import (
    UserSettingsModule,
    UserSettingsResponse,
    UserSettingsUpdateRequest,
    UserSettingTypeResponse,
    UserSettingTypeUpdateRequest,
)
from modai.modules.user_settings.simple_user_settings_module import (
    SimpleUserSettingsModule,
)
from modai.modules.session.module import SessionModule
from modai.modules.user_settings_store.module import UserSettingsStore
from modai.modules.user_settings_store.inmemory_user_settings_store import (
    InMemoryUserSettingsStore,
)


class MockSession:
    """Mock session object for testing"""

    def __init__(self, user_id: str):
        self.user_id = user_id


class MockSessionModule(SessionModule):
    """Mock session module for testing"""

    def __init__(self, dependencies: ModuleDependencies, config: dict[str, Any]):
        super().__init__(dependencies, config)
        self.mock_session = None

    def set_mock_session(self, session: MockSession):
        """Set the session to be returned by validate_session"""
        self.mock_session = session

    async def validate_session(self, request: Request) -> MockSession:
        if self.mock_session is None:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return self.mock_session

    async def start_new_session(self, request, response, user_id: str, **kwargs):
        pass

    async def end_session(self, request, response):
        pass


class TestSimpleUserSettingsModule:
    """Test the simple UserSettings module implementation"""

    @pytest.fixture
    def mock_session_module(self):
        """Create a mock session module"""
        return MockSessionModule(ModuleDependencies(modules={}), {})

    @pytest.fixture
    def mock_user_settings_store(self):
        """Create a mock user settings store"""
        return InMemoryUserSettingsStore(ModuleDependencies(modules={}), {})

    @pytest.fixture
    def dependencies(self, mock_session_module, mock_user_settings_store):
        """Create module dependencies with mocked modules"""
        return ModuleDependencies(
            modules={
                "session": mock_session_module,
                "user_settings_store": mock_user_settings_store,
            }
        )

    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return {}  # No database config needed since we use mock store

    @pytest.fixture
    def module(self, dependencies, config):
        """Create a test module instance"""
        return SimpleUserSettingsModule(dependencies, config)

    @pytest.fixture
    def mock_request(self):
        """Create a mock request object"""
        return MagicMock(spec=Request)

    def test_module_initialization_missing_session_dependency(self):
        """Test module raises error when session dependency is missing"""
        dependencies = ModuleDependencies(
            modules={"user_settings_store": InMemoryUserSettingsStore({}, {})}
        )
        config = {}

        with pytest.raises(
            ValueError, match="UserSettings module requires a session module dependency"
        ):
            SimpleUserSettingsModule(dependencies, config)

    def test_module_initialization_missing_store_dependency(self):
        """Test module raises error when user_settings_store dependency is missing"""
        dependencies = ModuleDependencies(
            modules={"session": MockSessionModule({}, {})}
        )
        config = {}

        with pytest.raises(
            ValueError,
            match="UserSettings module requires a user_settings_store module dependency",
        ):
            SimpleUserSettingsModule(dependencies, config)

    @pytest.mark.asyncio
    async def test_get_user_settings_empty(self, module, mock_request):
        """Test getting settings for user with no existing settings"""
        user_id = "test-user-123"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        result = await module.get_user_settings(user_id, mock_request)

        assert isinstance(result, UserSettingsResponse)
        assert result.settings == {}

    @pytest.mark.asyncio
    async def test_get_user_settings_unauthorized_access(self, module, mock_request):
        """Test user cannot access another user's settings"""
        user_id = "other-user-456"
        session = MockSession("current-user-123")
        module.session_module.set_mock_session(session)

        with pytest.raises(HTTPException) as exc_info:
            await module.get_user_settings(user_id, mock_request)

        assert exc_info.value.status_code == 403
        assert "only access your own data" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_get_user_settings_no_session(self, module, mock_request):
        """Test getting settings without valid session raises 401"""
        user_id = "test-user-123"
        # Don't set mock session, should raise 401

        with pytest.raises(HTTPException) as exc_info:
            await module.get_user_settings(user_id, mock_request)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_update_user_settings_new_user(self, module, mock_request):
        """Test updating settings for user with no existing settings"""
        user_id = "test-user-123"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        settings_update = UserSettingsUpdateRequest(
            settings={
                "theme": {"mode": "dark", "primary_color": "#1976d2"},
                "notifications": {"email_enabled": True},
            }
        )

        result = await module.update_user_settings(
            user_id, settings_update, mock_request
        )

        assert isinstance(result, UserSettingsResponse)
        assert result.settings["theme"]["mode"] == "dark"
        assert result.settings["theme"]["primary_color"] == "#1976d2"
        assert result.settings["notifications"]["email_enabled"] == True

    @pytest.mark.asyncio
    async def test_update_user_settings_existing_user(self, module, mock_request):
        """Test updating settings for user with existing settings (merge behavior)"""
        user_id = "test-user-123"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # First, create initial settings
        initial_settings = UserSettingsUpdateRequest(
            settings={
                "theme": {"mode": "light", "primary_color": "#blue"},
                "notifications": {"email_enabled": False, "push_enabled": True},
            }
        )
        await module.update_user_settings(user_id, initial_settings, mock_request)

        # Then update only theme settings
        update_settings = UserSettingsUpdateRequest(
            settings={"theme": {"mode": "dark", "primary_color": "#red"}}
        )
        result = await module.update_user_settings(
            user_id, update_settings, mock_request
        )

        assert isinstance(result, UserSettingsResponse)
        # Theme should be updated
        assert result.settings["theme"]["mode"] == "dark"
        assert result.settings["theme"]["primary_color"] == "#red"
        # Notifications should remain unchanged
        assert result.settings["notifications"]["email_enabled"] == False
        assert result.settings["notifications"]["push_enabled"] == True

    @pytest.mark.asyncio
    async def test_update_user_settings_unauthorized_modification(
        self, module, mock_request
    ):
        """Test user cannot modify another user's settings"""
        user_id = "other-user-456"
        session = MockSession("current-user-123")
        module.session_module.set_mock_session(session)

        settings_update = UserSettingsUpdateRequest(
            settings={"theme": {"mode": "dark"}}
        )

        with pytest.raises(HTTPException) as exc_info:
            await module.update_user_settings(user_id, settings_update, mock_request)

        assert exc_info.value.status_code == 403
        assert "only access your own data" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_settings_no_session(self, module, mock_request):
        """Test updating settings without valid session raises 401"""
        user_id = "test-user-123"
        settings_update = UserSettingsUpdateRequest(
            settings={"theme": {"mode": "dark"}}
        )
        # Don't set mock session, should raise 401

        with pytest.raises(HTTPException) as exc_info:
            await module.update_user_settings(user_id, settings_update, mock_request)

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_settings_after_update(self, module, mock_request):
        """Test full flow: update settings then retrieve them"""
        user_id = "test-user-123"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # Update settings
        settings_update = UserSettingsUpdateRequest(
            settings={
                "theme": {"mode": "dark", "sidebar": "collapsed"},
                "language": {"locale": "en-US", "timezone": "UTC"},
            }
        )
        await module.update_user_settings(user_id, settings_update, mock_request)

        # Retrieve settings
        result = await module.get_user_settings(user_id, mock_request)

        assert isinstance(result, UserSettingsResponse)
        assert result.settings["theme"]["mode"] == "dark"
        assert result.settings["theme"]["sidebar"] == "collapsed"
        assert result.settings["language"]["locale"] == "en-US"
        assert result.settings["language"]["timezone"] == "UTC"

    @pytest.mark.asyncio
    async def test_get_user_setting_type_empty(self, module, mock_request):
        """Test getting a specific setting type for user with no existing settings"""
        user_id = "test-user-123"
        module_name = "theme"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        result = await module.get_user_setting_type(user_id, module_name, mock_request)

        assert isinstance(result, UserSettingTypeResponse)
        assert result.settings == {}

    @pytest.mark.asyncio
    async def test_get_user_setting_type_existing(self, module, mock_request):
        """Test getting a specific setting type for user with existing settings"""
        user_id = "test-user-123"
        module_name = "theme"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # First, create some settings
        settings_update = UserSettingsUpdateRequest(
            settings={
                "theme": {"mode": "dark", "primary_color": "#1976d2"},
                "notifications": {"email_enabled": True},
            }
        )
        await module.update_user_settings(user_id, settings_update, mock_request)

        # Then get specific setting type
        result = await module.get_user_setting_type(user_id, module_name, mock_request)

        assert isinstance(result, UserSettingTypeResponse)
        assert result.settings["mode"] == "dark"
        assert result.settings["primary_color"] == "#1976d2"

    @pytest.mark.asyncio
    async def test_get_user_setting_type_nonexistent(self, module, mock_request):
        """Test getting a non-existent setting type returns empty settings"""
        user_id = "test-user-123"
        module_name = "nonexistent"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # First, create some settings
        settings_update = UserSettingsUpdateRequest(
            settings={"theme": {"mode": "dark", "primary_color": "#1976d2"}}
        )
        await module.update_user_settings(user_id, settings_update, mock_request)

        # Then get non-existent setting type
        result = await module.get_user_setting_type(user_id, module_name, mock_request)

        assert isinstance(result, UserSettingTypeResponse)
        assert result.settings == {}

    @pytest.mark.asyncio
    async def test_get_user_setting_type_unauthorized_access(
        self, module, mock_request
    ):
        """Test user cannot access another user's specific setting type"""
        user_id = "other-user-456"
        module_name = "theme"
        session = MockSession("current-user-123")
        module.session_module.set_mock_session(session)

        with pytest.raises(HTTPException) as exc_info:
            await module.get_user_setting_type(user_id, module_name, mock_request)

        assert exc_info.value.status_code == 403
        assert "only access your own data" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_update_user_setting_type_new_user(self, module, mock_request):
        """Test updating a specific setting type for user with no existing settings"""
        user_id = "test-user-123"
        module_name = "theme"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        settings_update = UserSettingTypeUpdateRequest(
            settings={"mode": "dark", "primary_color": "#1976d2"}
        )

        result = await module.update_user_setting_type(
            user_id, module_name, settings_update, mock_request
        )

        assert isinstance(result, UserSettingTypeResponse)
        assert result.settings["mode"] == "dark"
        assert result.settings["primary_color"] == "#1976d2"

    @pytest.mark.asyncio
    async def test_update_user_setting_type_existing_user(self, module, mock_request):
        """Test updating a specific setting type for user with existing settings"""
        user_id = "test-user-123"
        module_name = "theme"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # First, create initial settings
        initial_settings = UserSettingsUpdateRequest(
            settings={
                "theme": {"mode": "light", "primary_color": "#blue"},
                "notifications": {"email_enabled": False},
            }
        )
        await module.update_user_settings(user_id, initial_settings, mock_request)

        # Then update specific setting type
        settings_update = UserSettingTypeUpdateRequest(
            settings={"mode": "dark", "primary_color": "#red", "sidebar": "collapsed"}
        )
        result = await module.update_user_setting_type(
            user_id, module_name, settings_update, mock_request
        )

        assert isinstance(result, UserSettingTypeResponse)
        assert result.settings["mode"] == "dark"
        assert result.settings["primary_color"] == "#red"
        assert result.settings["sidebar"] == "collapsed"

        # Verify other settings are preserved
        full_settings = await module.get_user_settings(user_id, mock_request)
        assert full_settings.settings["notifications"]["email_enabled"] == False

    @pytest.mark.asyncio
    async def test_update_user_setting_type_unauthorized_modification(
        self, module, mock_request
    ):
        """Test user cannot modify another user's specific setting type"""
        user_id = "other-user-456"
        module_name = "theme"
        session = MockSession("current-user-123")
        module.session_module.set_mock_session(session)

        settings_update = UserSettingTypeUpdateRequest(settings={"mode": "dark"})

        with pytest.raises(HTTPException) as exc_info:
            await module.update_user_setting_type(
                user_id, module_name, settings_update, mock_request
            )

        assert exc_info.value.status_code == 403
        assert "only access your own data" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_setting_type_flow_integration(self, module, mock_request):
        """Test full flow: update specific setting type then retrieve it"""
        user_id = "test-user-123"
        module_name = "notifications"
        session = MockSession(user_id)
        module.session_module.set_mock_session(session)

        # Update specific setting type
        settings_update = UserSettingTypeUpdateRequest(
            settings={
                "email_enabled": True,
                "push_enabled": False,
                "frequency": "daily",
            }
        )
        update_result = await module.update_user_setting_type(
            user_id, module_name, settings_update, mock_request
        )

        # Retrieve specific setting type
        get_result = await module.get_user_setting_type(
            user_id, module_name, mock_request
        )

        assert isinstance(get_result, UserSettingTypeResponse)
        assert get_result.settings == update_result.settings
        assert get_result.settings["email_enabled"] == True
        assert get_result.settings["push_enabled"] == False
        assert get_result.settings["frequency"] == "daily"
