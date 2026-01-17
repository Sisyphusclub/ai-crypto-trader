"""Health check endpoints with DB and Redis status."""
from datetime import datetime
from fastapi import APIRouter
from sqlalchemy import text
import redis

from app.core.settings import settings
from app.core.database import engine
from app.api.schemas import HealthResponse, ServiceStatus

router = APIRouter(tags=["health"])


def _check_db() -> ServiceStatus:
    """Check database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return ServiceStatus(ok=True)
    except Exception:
        return ServiceStatus(ok=False, error="Database connection failed")


def _check_redis() -> ServiceStatus:
    """Check Redis connectivity."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        return ServiceStatus(ok=True)
    except Exception:
        return ServiceStatus(ok=False, error="Redis connection failed")


@router.get("/health", response_model=HealthResponse)
def health():
    """
    Health check endpoint.
    Returns status of all dependencies (DB, Redis).
    """
    db_status = _check_db()
    redis_status = _check_redis()

    return HealthResponse(
        ok=db_status.ok and redis_status.ok,
        env=settings.APP_ENV,
        db=db_status,
        redis=redis_status,
        timestamp=datetime.utcnow(),
    )
