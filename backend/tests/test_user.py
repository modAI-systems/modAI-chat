import sys
import os
import pytest
from unittest.mock import Mock, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.user.simple_user_module import SimpleUserModule
from modai.modules.session.module import SessionModule, Session
from modai.modules.user_store.module import UserStore, User


@pytest.fixture
def client():
    app = FastAPI()

    # Create a mock session module
    session_module = Mock(spec=SessionModule)
    session_module.validate_session_for_http = MagicMock()  # Not async

    # Create a mock user store module
    user_store = Mock(spec=UserStore)
    user_store.get_user_by_id = AsyncMock()  # This is async

    # Create user module
    user_module = SimpleUserModule(
        dependencies=ModuleDependencies(
            {"session": session_module, "user_store": user_store}
        ),
        config={},
    )
    app.include_router(user_module.router)
    return TestClient(app), user_module, session_module, user_store


class TestSimpleUserModule:

    def test_init_missing_session_dependency(self):
        """Test that initialization fails when session module is missing"""
        dependencies = ModuleDependencies(modules={})
        config = {}

        with pytest.raises(
            ValueError, match="User module requires a session module dependency"
        ):
            SimpleUserModule(dependencies, config)

    def test_init_missing_user_store_dependency(self):
        """Test that initialization fails when user_store module is missing"""
        session_module = MagicMock()
        dependencies = ModuleDependencies(modules={"session": session_module})
        config = {}

        with pytest.raises(
            ValueError, match="User module requires a user_store module dependency"
        ):
            SimpleUserModule(dependencies, config)

    def test_init_success(self):
        """Test successful initialization with all dependencies"""
        session_module = MagicMock()
        user_store = MagicMock()
        dependencies = ModuleDependencies(
            modules={"session": session_module, "user_store": user_store}
        )
        config = {}

        user_module = SimpleUserModule(dependencies, config)

        assert user_module.session_module == session_module
        assert user_module.user_store == user_store
        assert hasattr(user_module, "router")


def test_get_current_user_success(client):
    """Test successful retrieval of current user"""
    test_client, user_module, session_module, user_store = client

    # Setup test data
    test_session = Session(user_id="user123", additional={})
    test_user = User(
        id="user123",
        email="test@example.com",
        full_name="Test User",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    # Configure mocks
    session_module.validate_session_for_http.return_value = test_session
    user_store.get_user_by_id.return_value = test_user

    # Call the endpoint
    response = test_client.get("/api/v1/user")

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["id"] == "user123"
    assert response_data["email"] == "test@example.com"
    assert response_data["full_name"] == "Test User"

    # Verify calls
    session_module.validate_session_for_http.assert_called_once()
    user_store.get_user_by_id.assert_called_once_with("user123")


def test_get_current_user_user_not_found(client):
    """Test behavior when user is not found in user store"""
    test_client, user_module, session_module, user_store = client

    # Setup test data
    test_session = Session(user_id="user123", additional={})

    # Configure mocks
    session_module.validate_session_for_http.return_value = test_session
    user_store.get_user_by_id.return_value = None  # User not found

    # Call the endpoint
    response = test_client.get("/api/v1/user")

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

    # Verify calls
    session_module.validate_session_for_http.assert_called_once()
    user_store.get_user_by_id.assert_called_once_with("user123")


def test_get_current_user_invalid_session(client):
    """Test behavior when session validation fails"""
    test_client, user_module, session_module, user_store = client

    # Configure mocks to raise HTTPException for invalid session
    from fastapi import HTTPException

    session_module.validate_session_for_http.side_effect = HTTPException(
        status_code=401, detail="Invalid or expired session"
    )

    # Call the endpoint
    response = test_client.get("/api/v1/user")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired session"

    # Verify session validation was called
    session_module.validate_session_for_http.assert_called_once()
    # User store should not be called since session validation failed
    user_store.get_user_by_id.assert_not_called()
