"""Tests for authentication endpoints."""
import importlib.util
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Load auth module directly without triggering app.api.__init__
_auth_path = Path(__file__).parent.parent / "app" / "api" / "auth.py"
_spec = importlib.util.spec_from_file_location("auth", _auth_path)
auth = importlib.util.module_from_spec(_spec)

# Mock settings before executing module
_mock_settings = MagicMock()
_mock_settings.APP_ENV = "test"
_mock_settings.JWT_SECRET = "test-secret-key-32-chars-long!!"
_mock_settings.TRUSTED_PROXY = False

# Patch the settings import
sys.modules["app.core.settings"] = MagicMock(settings=_mock_settings)
sys.modules["app.core.database"] = MagicMock()
sys.modules["app.models"] = MagicMock()

_spec.loader.exec_module(auth)


class TestPasswordHashing:
    """Test password hashing utilities."""

    def test_hash_password_returns_bcrypt_hash(self):
        """Hashed password starts with bcrypt prefix."""
        hashed = auth._hash_password("testpassword123")
        assert hashed.startswith("$2")
        assert len(hashed) == 60

    def test_verify_password_correct(self):
        """Correct password verifies successfully."""
        password = "securePassword!@#"
        hashed = auth._hash_password(password)
        assert auth._verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """Incorrect password fails verification."""
        hashed = auth._hash_password("correct")
        assert auth._verify_password("wrong", hashed) is False


class TestJWTTokens:
    """Test JWT token creation and decoding."""

    def test_create_token_contains_user_id(self):
        """Token contains user ID in subject claim."""
        user_id = uuid.uuid4()
        token = auth._create_token(user_id)
        decoded_id = auth._decode_token(token)
        assert decoded_id == user_id

    def test_decode_token_invalid_raises_401(self):
        """Invalid token raises HTTPException with 401."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            auth._decode_token("invalid.token.here")
        assert exc_info.value.status_code == 401

    def test_decode_token_expired_raises_401(self):
        """Expired token raises HTTPException with 401."""
        import jwt
        from datetime import timedelta
        from fastapi import HTTPException

        now = datetime.now(timezone.utc) - timedelta(hours=1)
        expired_token = jwt.encode(
            {"sub": str(uuid.uuid4()), "iat": int(now.timestamp()), "exp": int(now.timestamp())},
            _mock_settings.JWT_SECRET,
            algorithm=auth.JWT_ALGORITHM,
        )

        with pytest.raises(HTTPException) as exc_info:
            auth._decode_token(expired_token)
        assert exc_info.value.status_code == 401


class TestRateLimiting:
    """Test rate limiting decorator."""

    def test_rate_limit_allows_within_limit(self):
        """Requests within limit are allowed."""
        auth._rate_buckets.clear()

        mock_request = MagicMock()
        mock_request.client.host = "127.0.0.1"
        mock_request.url.path = "/test"
        mock_request.headers.get.return_value = None

        dep = auth.rate_limit(5, 60)
        for _ in range(5):
            dep(mock_request)

    def test_rate_limit_blocks_over_limit(self):
        """Requests over limit raise 429."""
        from fastapi import HTTPException

        auth._rate_buckets.clear()

        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.1"
        mock_request.url.path = "/test-block"
        mock_request.headers.get.return_value = None

        dep = auth.rate_limit(2, 60)
        dep(mock_request)
        dep(mock_request)

        with pytest.raises(HTTPException) as exc_info:
            dep(mock_request)
        assert exc_info.value.status_code == 429
        assert "Retry-After" in exc_info.value.headers

    def test_rate_limit_respects_x_forwarded_for_when_trusted(self):
        """Uses X-Forwarded-For when TRUSTED_PROXY is True."""
        mock_request = MagicMock()
        mock_request.client.host = "10.0.0.1"
        mock_request.url.path = "/test"
        mock_request.headers.get.return_value = "203.0.113.50, 10.0.0.1"

        _mock_settings.TRUSTED_PROXY = True
        key = auth._client_key(mock_request)
        assert key.startswith("203.0.113.50:")
        _mock_settings.TRUSTED_PROXY = False

    def test_rate_limit_ignores_x_forwarded_for_when_not_trusted(self):
        """Ignores X-Forwarded-For when TRUSTED_PROXY is False."""
        mock_request = MagicMock()
        mock_request.client.host = "10.0.0.1"
        mock_request.url.path = "/test"
        mock_request.headers.get.return_value = "203.0.113.50"

        _mock_settings.TRUSTED_PROXY = False
        key = auth._client_key(mock_request)
        assert key.startswith("10.0.0.1:")


class TestSecureCookie:
    """Test secure cookie logic."""

    def test_is_secure_cookie_dev_returns_false(self):
        """Dev environment returns False for secure cookies."""
        _mock_settings.APP_ENV = "dev"
        assert auth._is_secure_cookie() is False

    def test_is_secure_cookie_prod_returns_true(self):
        """Production environment returns True for secure cookies."""
        _mock_settings.APP_ENV = "production"
        result = auth._is_secure_cookie()
        _mock_settings.APP_ENV = "test"
        assert result is True


class TestRegisterEndpoint:
    """Test user registration endpoint."""

    def test_register_success_creates_user(self):
        """Successful registration creates user and sets cookie."""
        auth._rate_buckets.clear()

        user_id = uuid.uuid4()
        created_at = datetime.now(timezone.utc)

        # Create a mock user that will be returned after db.refresh
        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user.username = "newuser"
        mock_user.created_at = created_at

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        def refresh_side_effect(user):
            user.id = user_id
            user.username = "newuser"
            user.created_at = created_at

        mock_db.refresh.side_effect = refresh_side_effect

        mock_response = MagicMock()
        payload = auth.RegisterRequest(username="newuser", password="password123")

        _mock_settings.APP_ENV = "test"

        # Patch User class to return predictable values
        with patch.object(auth, 'User') as MockUser:
            mock_instance = MagicMock()
            mock_instance.id = user_id
            mock_instance.username = "newuser"
            mock_instance.created_at = created_at
            MockUser.return_value = mock_instance

            result = auth.register(payload, mock_response, mock_db)

            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()
            mock_response.set_cookie.assert_called_once()
            assert result.username == "newuser"

    def test_register_duplicate_username_returns_409(self):
        """Duplicate username returns 409 Conflict."""
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.username = "existing"
        mock_user.password_hash = "hash"

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        mock_response = MagicMock()
        payload = auth.RegisterRequest(username="existing", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            auth.register(payload, mock_response, mock_db)
        assert exc_info.value.status_code == 409


class TestLoginEndpoint:
    """Test user login endpoint."""

    def test_login_success_sets_cookie(self):
        """Successful login sets auth cookie."""
        password = "correctpassword"

        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.username = "testuser"
        mock_user.password_hash = auth._hash_password(password)
        mock_user.created_at = datetime.now(timezone.utc)

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        mock_response = MagicMock()
        payload = auth.LoginRequest(username="testuser", password=password)

        _mock_settings.APP_ENV = "test"

        result = auth.login(payload, mock_response, mock_db)

        mock_response.set_cookie.assert_called_once()
        assert result.username == "testuser"

    def test_login_invalid_password_returns_401(self):
        """Invalid password returns 401 Unauthorized."""
        from fastapi import HTTPException

        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.username = "testuser"
        mock_user.password_hash = auth._hash_password("correctpassword")

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        mock_response = MagicMock()
        payload = auth.LoginRequest(username="testuser", password="wrongpassword")

        with pytest.raises(HTTPException) as exc_info:
            auth.login(payload, mock_response, mock_db)
        assert exc_info.value.status_code == 401

    def test_login_nonexistent_user_returns_401(self):
        """Nonexistent user returns 401 Unauthorized."""
        from fastapi import HTTPException

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        mock_response = MagicMock()
        payload = auth.LoginRequest(username="ghost", password="password123")

        with pytest.raises(HTTPException) as exc_info:
            auth.login(payload, mock_response, mock_db)
        assert exc_info.value.status_code == 401


class TestLogoutEndpoint:
    """Test logout endpoint."""

    def test_logout_deletes_cookie(self):
        """Logout deletes auth cookie."""
        mock_response = MagicMock()
        result = auth.logout(mock_response)

        mock_response.delete_cookie.assert_called_once_with(auth.AUTH_COOKIE_NAME, path="/")
        assert result["ok"] is True


class TestMeEndpoint:
    """Test current user info endpoint."""

    def test_me_returns_user_info(self):
        """Me endpoint returns authenticated user info."""
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.username = "currentuser"
        mock_user.created_at = datetime.now(timezone.utc)

        result = auth.me(mock_user)
        assert result.username == "currentuser"
        assert result.id == mock_user.id


class TestGetCurrentUser:
    """Test get_current_user dependency."""

    def test_get_current_user_valid_token(self):
        """Valid token returns user."""
        user_id = uuid.uuid4()

        mock_user = MagicMock()
        mock_user.id = user_id
        mock_user.username = "testuser"

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = auth._create_token(user_id)

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user

        result = auth.get_current_user(mock_request, mock_db)
        assert result.id == user_id

    def test_get_current_user_no_token_raises_401(self):
        """Missing token raises 401."""
        from fastapi import HTTPException

        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None

        mock_db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            auth.get_current_user(mock_request, mock_db)
        assert exc_info.value.status_code == 401


class TestGetCurrentUserOptional:
    """Test get_current_user_optional dependency."""

    def test_get_current_user_optional_no_token_returns_none(self):
        """Missing token returns None instead of raising."""
        mock_request = MagicMock()
        mock_request.cookies.get.return_value = None

        mock_db = MagicMock()

        result = auth.get_current_user_optional(mock_request, mock_db)
        assert result is None


class TestOnboardingStatus:
    """Test onboarding status endpoint."""

    def test_onboarding_status_incomplete(self):
        """Incomplete onboarding returns correct flags."""
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = auth.onboarding_status(mock_user, mock_db)
        assert result.has_exchange is False
        assert result.has_model is False
        assert result.has_strategy is False
        assert result.has_trader is False
        assert result.complete is False

    def test_onboarding_status_complete(self):
        """Complete onboarding returns all True."""
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = MagicMock()

        result = auth.onboarding_status(mock_user, mock_db)
        assert result.has_exchange is True
        assert result.has_model is True
        assert result.has_strategy is True
        assert result.has_trader is True
        assert result.complete is True
