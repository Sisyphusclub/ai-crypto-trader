"""Tests for logging sanitization."""
import pytest
import json


class TestLogSanitization:
    """Test log sanitization functionality."""

    def test_sanitize_api_key(self):
        """API key fields are redacted."""
        from app.core.logging import sanitize_dict

        data = {"api_key": "sk-1234567890abcdef"}
        result = sanitize_dict(data)
        assert result["api_key"] != "sk-1234567890abcdef"
        assert "****" in result["api_key"]

    def test_sanitize_api_secret(self):
        """API secret fields are redacted."""
        from app.core.logging import sanitize_dict

        data = {"api_secret": "very-secret-value-here"}
        result = sanitize_dict(data)
        assert "****" in result["api_secret"]

    def test_sanitize_password(self):
        """Password fields are redacted."""
        from app.core.logging import sanitize_dict

        data = {"password": "mypassword123"}
        result = sanitize_dict(data)
        assert "****" in result["password"]

    def test_sanitize_token(self):
        """Token fields are redacted."""
        from app.core.logging import sanitize_dict

        data = {"bearer_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"}
        result = sanitize_dict(data)
        assert "****" in result["bearer_token"]

    def test_sanitize_master_key(self):
        """Master key fields are redacted."""
        from app.core.logging import sanitize_dict

        data = {"master_key": "super-secret-master-key-value"}
        result = sanitize_dict(data)
        assert "****" in result["master_key"]

    def test_sanitize_nested_dict(self):
        """Nested dictionaries are sanitized."""
        from app.core.logging import sanitize_dict

        data = {
            "user": "john",
            "credentials": {
                "api_key": "secret-api-key",
                "api_secret": "secret-api-secret",
            }
        }
        result = sanitize_dict(data)
        assert result["user"] == "john"
        assert "****" in result["credentials"]["api_key"]
        assert "****" in result["credentials"]["api_secret"]

    def test_sanitize_list(self):
        """Lists with sensitive data are sanitized."""
        from app.core.logging import sanitize_dict

        data = {
            "api_keys": ["key1-secret", "key2-secret"]
        }
        result = sanitize_dict(data)
        assert all("****" in k for k in result["api_keys"])

    def test_non_sensitive_fields_preserved(self):
        """Non-sensitive fields are preserved."""
        from app.core.logging import sanitize_dict

        data = {
            "symbol": "BTCUSDT",
            "side": "long",
            "quantity": "0.01",
            "price": "50000.00",
        }
        result = sanitize_dict(data)
        assert result == data

    def test_short_values_fully_redacted(self):
        """Short sensitive values are fully redacted."""
        from app.core.logging import sanitize_dict

        data = {"api_key": "short"}
        result = sanitize_dict(data)
        assert result["api_key"] == "****"


class TestJsonFormatter:
    """Test JSON log formatter."""

    def test_json_format_structure(self):
        """JSON formatter produces valid JSON with required fields."""
        from app.core.logging import JsonFormatter
        import logging

        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        data = json.loads(result)

        assert "ts" in data
        assert data["level"] == "INFO"
        assert data["message"] == "Test message"
        assert "service" in data


class TestStartupChecks:
    """Test startup security checks."""

    def test_weak_jwt_secret_rejected(self):
        """Weak JWT secrets are rejected."""
        from app.core.startup import _looks_default

        assert _looks_default("") is True
        assert _looks_default("short") is True
        assert _looks_default("change-me-please") is True
        assert _looks_default("password") is True

    def test_strong_jwt_secret_accepted(self):
        """Strong JWT secrets are accepted."""
        from app.core.startup import _looks_default

        strong = "a8f7g6h5j4k3l2m1n0o9p8q7r6s5t4u3"
        assert _looks_default(strong) is False

    def test_entropy_check(self):
        """Low entropy secrets are rejected."""
        from app.core.startup import _calculate_entropy

        # Low entropy (repeated chars)
        low = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        assert _calculate_entropy(low) < 1.0

        # High entropy (random chars)
        high = "a8f7g6h5j4k3l2m1n0o9p8q7r6s5t4u3"
        assert _calculate_entropy(high) > 4.0


class TestLiveConfirmation:
    """Test LIVE mode confirmation."""

    def test_live_mode_requires_confirmation(self):
        """LIVE mode requires explicit confirmation."""
        from app.core.startup import _verify_live_mode_confirmation
        from unittest.mock import patch

        # Mock settings for LIVE mode without confirmation
        with patch('app.core.startup.settings') as mock_settings:
            mock_settings.PAPER_TRADING = False
            mock_settings.LIVE_TRADING_CONFIRMATION = ""

            with pytest.raises(RuntimeError, match="LIVE mode"):
                _verify_live_mode_confirmation()

    def test_live_mode_with_confirmation_passes(self):
        """LIVE mode with proper confirmation passes."""
        from app.core.startup import _verify_live_mode_confirmation
        from unittest.mock import patch

        with patch('app.core.startup.settings') as mock_settings:
            mock_settings.PAPER_TRADING = False
            mock_settings.LIVE_TRADING_CONFIRMATION = "I_UNDERSTAND"

            # Should not raise
            _verify_live_mode_confirmation()

    def test_paper_mode_no_confirmation_needed(self):
        """Paper mode doesn't require confirmation."""
        from app.core.startup import _verify_live_mode_confirmation
        from unittest.mock import patch

        with patch('app.core.startup.settings') as mock_settings:
            mock_settings.PAPER_TRADING = True
            mock_settings.LIVE_TRADING_CONFIRMATION = ""

            # Should not raise
            _verify_live_mode_confirmation()
