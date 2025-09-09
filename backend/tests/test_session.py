import sys
import os
import pytest
from unittest.mock import MagicMock
import jwt

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from modai.module import ModuleDependencies
from modai.modules.session.jwt_session_module import JwtSessionModule


@pytest.fixture
def mock_request_response():
    """Create mock request and response objects for testing."""
    mock_request = MagicMock()
    mock_response = MagicMock()
    return mock_request, mock_response


def test_create_session_token(mock_request_response):
    """Test session token creation."""
    config = {
        "jwt_secret": "test-secret",
        "jwt_algorithm": "HS256",
        "jwt_expiration_hours": 1,
    }
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    session_module.start_new_session(mock_request, mock_response, "user123", "testuser")

    # Verify set_cookie was called
    mock_response.set_cookie.assert_called_once()
    call_args = mock_response.set_cookie.call_args

    # Extract the token from the call
    token = call_args.kwargs["value"]

    # Verify token can be decoded
    payload = jwt.decode(token, "test-secret", algorithms=["HS256"])
    assert payload["user_id"] == "user123"
    assert payload["username"] == "testuser"
    assert "exp" in payload
    assert "iat" in payload


def test_create_session_token_with_kwargs(mock_request_response):
    """Test session token creation with additional data."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    session_module.start_new_session(
        mock_request,
        mock_response,
        "user123",
        "testuser",
        role="admin",
        department="IT",
    )

    # Extract the token from the set_cookie call
    call_args = mock_response.set_cookie.call_args
    token = call_args.kwargs["value"]

    payload = jwt.decode(token, "test-secret", algorithms=["HS256"])
    assert payload["user_id"] == "user123"
    assert payload["username"] == "testuser"
    assert payload["role"] == "admin"
    assert payload["department"] == "IT"


def test_validate_session_token_success(mock_request_response):
    """Test successful token validation."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    session_module.start_new_session(mock_request, mock_response, "user123", "testuser")

    # Extract the token from the set_cookie call
    call_args = mock_response.set_cookie.call_args
    token = call_args.kwargs["value"]

    # Create a new mock request with the token in cookies
    mock_request_with_cookie = MagicMock()
    mock_request_with_cookie.cookies = {"session_token": token}

    payload = session_module.validate_session(mock_request_with_cookie)

    assert payload["user_id"] == "user123"
    assert payload["username"] == "testuser"


def test_validate_session_token_invalid():
    """Test validation of invalid token."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)

    # Create mock request with invalid token
    mock_request = MagicMock()
    mock_request.cookies = {"session_token": "invalid-token"}

    with pytest.raises(jwt.InvalidTokenError):
        session_module.validate_session(mock_request)


def test_validate_session_token_no_cookie():
    """Test validation when no session token cookie is present."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)

    # Create mock request with no session token cookie
    mock_request = MagicMock()
    mock_request.cookies = {}

    with pytest.raises(ValueError, match="No session token found in cookies"):
        session_module.validate_session(mock_request)


def test_end_session(mock_request_response):
    """Test ending a session by clearing the session cookie."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    # End the session
    session_module.end_session(mock_request, mock_response)

    # Verify delete_cookie was called with the correct key
    mock_response.delete_cookie.assert_called_once_with(key="session_token")


def test_end_session_no_existing_session(mock_request_response):
    """Test ending a session when no session exists (should still work)."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    # Create request with no session cookie
    mock_request.cookies = {}

    # End the session (should not raise an error)
    session_module.end_session(mock_request, mock_response)

    # Verify delete_cookie was still called
    mock_response.delete_cookie.assert_called_once_with(key="session_token")


def test_end_session_after_session_creation(mock_request_response):
    """Test the complete flow: create session, validate, then end session."""
    config = {"jwt_secret": "test-secret"}
    session_module = JwtSessionModule(dependencies=ModuleDependencies(), config=config)
    mock_request, mock_response = mock_request_response

    # Start a session
    session_module.start_new_session(mock_request, mock_response, "user123", "testuser")

    # Extract the token from the set_cookie call
    call_args = mock_response.set_cookie.call_args
    token = call_args.kwargs["value"]

    # Create a new mock request with the token in cookies for validation
    mock_request_with_cookie = MagicMock()
    mock_request_with_cookie.cookies = {"session_token": token}

    # Validate the session
    payload = session_module.validate_session(mock_request_with_cookie)
    assert payload["user_id"] == "user123"
    assert payload["username"] == "testuser"

    # Reset the mock to clear previous calls
    mock_response.reset_mock()

    # End the session
    session_module.end_session(mock_request_with_cookie, mock_response)

    # Verify delete_cookie was called
    mock_response.delete_cookie.assert_called_once_with(key="session_token")
