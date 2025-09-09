import sys
import os
import pytest
from unittest.mock import Mock, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI, Request, Response

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.authentication.password_authentication_module import (
    PasswordAuthenticationModule,
)
from modai.modules.session.module import SessionModule, Session
from modai.modules.user_store.module import UserStore, User, UserCredentials


@pytest.fixture
def client():
    app = FastAPI()

    # Create a mock session module
    session_module = Mock(spec=SessionModule)
    session_module.start_new_session = MagicMock()
    session_module.end_session = MagicMock()
    session_module.validate_session = MagicMock()

    # Create a mock user store module
    user_store = Mock(spec=UserStore)
    user_store.get_user_by_email = AsyncMock()
    user_store.get_user_credentials = AsyncMock()

    # Create authentication module
    auth_module = PasswordAuthenticationModule(
        dependencies=ModuleDependencies(
            {"session": session_module, "user_store": user_store}
        ),
        config={},
    )
    app.include_router(auth_module.router)
    return TestClient(app), auth_module, session_module, user_store


def test_login_success(client):
    test_client, auth_module, session_module, user_store = client

    # Create test user and credentials
    test_user = User(id="1", email="admin@example.com", full_name="Administrator")
    # Hash for password "admin"
    password_hash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
    test_credentials = UserCredentials(user_id="1", password_hash=password_hash)

    # Mock user store responses
    user_store.get_user_by_email.return_value = test_user
    user_store.get_user_credentials.return_value = test_credentials

    # Mock successful session creation
    session_module.start_new_session.return_value = None

    payload = {"email": "admin@example.com", "password": "admin"}
    response = test_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200

    response_data = response.json()
    assert response_data["message"] == "Successfully logged in"

    # Verify that start_new_session was called with correct parameters
    session_module.start_new_session.assert_called_once()
    call_args = session_module.start_new_session.call_args
    assert call_args[0][2] == "1"  # user_id
    assert call_args[1]["email"] == "admin@example.com"  # email passed as kwarg


def test_login_invalid_credentials(client):
    test_client, auth_module, session_module, user_store = client

    # Create test user and credentials
    test_user = User(id="1", email="admin@example.com", full_name="Administrator")
    # Hash for password "admin"
    password_hash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
    test_credentials = UserCredentials(user_id="1", password_hash=password_hash)

    # Mock user store responses
    user_store.get_user_by_email.return_value = test_user
    user_store.get_user_credentials.return_value = test_credentials

    payload = {"email": "admin@example.com", "password": "wrong-password"}
    response = test_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # Verify that start_new_session was NOT called due to invalid credentials
    session_module.start_new_session.assert_not_called()


def test_login_nonexistent_user(client):
    test_client, auth_module, session_module, user_store = client

    # Mock user store to return None (user not found)
    user_store.get_user_by_email.return_value = None

    payload = {"email": "nonexistent@example.com", "password": "password"}
    response = test_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # Verify that start_new_session was NOT called due to invalid user
    session_module.start_new_session.assert_not_called()


def test_logout_with_valid_session_cookie(client):
    """Test logout calls session module's end_session method."""
    test_client, auth_module, session_module, user_store = client

    # Mock that session module doesn't raise any exception
    session_module.end_session.return_value = None

    # Test logout
    logout_response = test_client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["message"] == "Successfully logged out"

    # Verify that end_session was called
    session_module.end_session.assert_called_once()


def test_logout_with_invalid_session_cookie(client):
    """Test logout when session module raises an exception."""
    test_client, auth_module, session_module, user_store = client

    # Mock that session module doesn't raise any exception
    session_module.end_session.return_value = None

    response = test_client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"

    # Verify that end_session was called
    session_module.end_session.assert_called_once()


def test_logout_without_session_cookie(client):
    """Test logout without any session cookie."""
    test_client, auth_module, session_module, user_store = client

    # Mock that session module doesn't raise any exception
    session_module.end_session.return_value = None

    response = test_client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"

    # Verify that end_session was called
    session_module.end_session.assert_called_once()


def test_login_user_without_credentials(client):
    """Test login when user exists but has no credentials."""
    test_client, auth_module, session_module, user_store = client

    # Create test user but no credentials
    test_user = User(id="1", email="admin@example.com", full_name="Administrator")

    # Mock user store responses
    user_store.get_user_by_email.return_value = test_user
    user_store.get_user_credentials.return_value = None  # No credentials

    payload = {"email": "admin@example.com", "password": "admin"}
    response = test_client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

    # Verify that start_new_session was NOT called
    session_module.start_new_session.assert_not_called()
