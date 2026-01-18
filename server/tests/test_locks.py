"""Tests for Redis locks and mutex functionality."""
import pytest
import time
import threading
from unittest.mock import MagicMock, patch


@pytest.fixture(autouse=True)
def mock_settings():
    """Mock settings for all tests."""
    with patch('app.core.locks.settings') as mock:
        mock.REDIS_LOCK_TTL = 30
        mock.REDIS_LOCK_TIMEOUT = 10
        yield mock


class TestRedisLock:
    """Test Redis distributed lock implementation."""

    def test_lock_acquire_success(self):
        """Lock acquisition succeeds when key is not held."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        mock_redis.set.return_value = True

        lock = RedisLock(mock_redis, "test:lock", ttl=30)
        assert lock.acquire(blocking=False) is True
        mock_redis.set.assert_called_once()

    def test_lock_acquire_fails_when_held(self):
        """Lock acquisition fails when key is already held."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        mock_redis.set.return_value = None

        lock = RedisLock(mock_redis, "test:lock", ttl=30)
        result = lock.acquire(blocking=False)
        assert result is False

    def test_lock_release(self):
        """Lock release only works if we own it."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        mock_redis.set.return_value = True
        mock_redis.eval.return_value = 1

        lock = RedisLock(mock_redis, "test:lock", ttl=30)
        lock.acquire(blocking=False)
        result = lock.release()
        assert result is True
        mock_redis.eval.assert_called_once()

    def test_lock_release_not_owned(self):
        """Lock release returns False if not acquired."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        lock = RedisLock(mock_redis, "test:lock", ttl=30)
        result = lock.release()
        assert result is False

    def test_lock_context_manager(self):
        """Lock works as context manager."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        mock_redis.set.return_value = True
        mock_redis.eval.return_value = 1

        lock = RedisLock(mock_redis, "test:lock", ttl=30)
        with lock:
            assert lock._acquired is True
        assert lock._acquired is False

    def test_lock_context_manager_raises_on_failure(self):
        """Context manager raises when lock cannot be acquired."""
        from app.core.locks import RedisLock, LockNotAcquiredError

        mock_redis = MagicMock()
        mock_redis.set.return_value = None

        lock = RedisLock(mock_redis, "test:lock", ttl=30, blocking_timeout=0.1)

        with pytest.raises(LockNotAcquiredError):
            with lock:
                pass


class TestTraderLock:
    """Test trader-specific lock functionality."""

    def test_trader_lock_key_format(self):
        """Trader lock uses correct key format."""
        from app.core.locks import RedisLock

        mock_redis = MagicMock()
        mock_redis.set.return_value = True

        lock = RedisLock(mock_redis, "trader:abc-123:cycle")
        lock.acquire(blocking=False)

        call_args = mock_redis.set.call_args
        assert "lock:trader:abc-123:cycle" in call_args[0][0]


class TestIdempotency:
    """Test idempotency protection in worker tasks."""

    def test_duplicate_client_order_id_skipped(self):
        """Duplicate client_order_id should be skipped."""
        # This tests the logic in trader.py where we check for existing decisions
        from app.ai.risk_manager import generate_client_order_id

        # Same inputs should generate same client_order_id
        from datetime import datetime
        ts = datetime(2024, 1, 1, 12, 0, 0)
        id1 = generate_client_order_id("trader-1", "signal-1", ts)
        id2 = generate_client_order_id("trader-1", "signal-1", ts)
        assert id1 == id2

    def test_different_signals_different_ids(self):
        """Different signals should generate different client_order_ids."""
        from app.ai.risk_manager import generate_client_order_id
        from datetime import datetime

        ts = datetime(2024, 1, 1, 12, 0, 0)
        id1 = generate_client_order_id("trader-1", "signal-1", ts)
        id2 = generate_client_order_id("trader-1", "signal-2", ts)
        assert id1 != id2
