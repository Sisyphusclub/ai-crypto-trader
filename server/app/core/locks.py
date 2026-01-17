"""Redis distributed lock for task mutex."""
import redis
import time
import uuid
from contextlib import contextmanager
from typing import Optional

from app.core.settings import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LockNotAcquiredError(Exception):
    """Raised when a lock cannot be acquired."""
    pass


class RedisLock:
    """Distributed lock using Redis."""

    def __init__(
        self,
        redis_client: redis.Redis,
        key: str,
        ttl: int = None,
        blocking_timeout: int = None
    ):
        self.redis = redis_client
        self.key = f"lock:{key}"
        self.ttl = ttl or settings.REDIS_LOCK_TTL
        self.blocking_timeout = blocking_timeout or settings.REDIS_LOCK_TIMEOUT
        self.token = str(uuid.uuid4())
        self._acquired = False

    def acquire(self, blocking: bool = True) -> bool:
        """Acquire the lock."""
        if blocking:
            end_time = time.time() + self.blocking_timeout
            while time.time() < end_time:
                if self._try_acquire():
                    return True
                time.sleep(0.1)
            return False
        return self._try_acquire()

    def _try_acquire(self) -> bool:
        """Try to acquire the lock without blocking."""
        acquired = self.redis.set(
            self.key,
            self.token,
            nx=True,
            ex=self.ttl
        )
        if acquired:
            self._acquired = True
            logger.debug(f"Lock acquired: {self.key}")
        return bool(acquired)

    def release(self) -> bool:
        """Release the lock if we own it."""
        if not self._acquired:
            return False

        # Lua script for atomic check-and-delete
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        result = self.redis.eval(script, 1, self.key, self.token)
        if result:
            self._acquired = False
            logger.debug(f"Lock released: {self.key}")
        return bool(result)

    def extend(self, additional_time: int = None) -> bool:
        """Extend the lock TTL if we own it."""
        if not self._acquired:
            return False

        ttl = additional_time or self.ttl
        script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("expire", KEYS[1], ARGV[2])
        else
            return 0
        end
        """
        result = self.redis.eval(script, 1, self.key, self.token, ttl)
        return bool(result)

    def __enter__(self):
        if not self.acquire():
            raise LockNotAcquiredError(f"Could not acquire lock: {self.key}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
        return False


def get_redis_client() -> redis.Redis:
    """Get a Redis client instance."""
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


@contextmanager
def trader_lock(trader_id: str, ttl: int = None):
    """Context manager for trader cycle lock."""
    client = get_redis_client()
    lock = RedisLock(client, f"trader:{trader_id}:cycle", ttl=ttl)
    try:
        if not lock.acquire():
            raise LockNotAcquiredError(
                f"Trader {trader_id} cycle already running"
            )
        yield lock
    finally:
        lock.release()


@contextmanager
def reconcile_lock(exchange_account_id: str, ttl: int = None):
    """Context manager for reconcile task lock."""
    client = get_redis_client()
    lock = RedisLock(
        client,
        f"reconcile:{exchange_account_id}",
        ttl=ttl or 300  # 5 minutes for reconcile
    )
    try:
        if not lock.acquire(blocking=False):
            raise LockNotAcquiredError(
                f"Reconcile already running for {exchange_account_id}"
            )
        yield lock
    finally:
        lock.release()
