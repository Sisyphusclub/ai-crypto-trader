"""Health check endpoints with DB and Redis status."""
from datetime import datetime
from fastapi import APIRouter, Response
from sqlalchemy import text
import redis

from app.core.settings import settings
from app.core.database import engine
from app.core.metrics import get_metrics, get_metrics_content_type
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


def _check_worker_queue() -> ServiceStatus:
    """Check if worker queue is accessible."""
    try:
        r = redis.from_url(settings.REDIS_URL)
        # Check RQ default queue exists
        queue_len = r.llen("rq:queue:default")
        return ServiceStatus(ok=True)
    except Exception:
        return ServiceStatus(ok=False, error="Worker queue check failed")


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


@router.get("/healthz")
def healthz():
    """Basic liveness probe - always returns 200 if process is running."""
    return {"status": "ok"}


@router.get("/readyz")
def readyz():
    """Readiness probe - checks DB and Redis connectivity."""
    db_status = _check_db()
    redis_status = _check_redis()

    if db_status.ok and redis_status.ok:
        return {"status": "ready", "db": "ok", "redis": "ok"}

    return Response(
        content='{"status": "not_ready"}',
        status_code=503,
        media_type="application/json"
    )


@router.get("/livez")
def livez():
    """Full system liveness check including worker queue."""
    db_status = _check_db()
    redis_status = _check_redis()
    worker_status = _check_worker_queue()

    all_ok = db_status.ok and redis_status.ok and worker_status.ok

    result = {
        "status": "live" if all_ok else "degraded",
        "db": "ok" if db_status.ok else "fail",
        "redis": "ok" if redis_status.ok else "fail",
        "worker": "ok" if worker_status.ok else "fail",
    }

    if not all_ok:
        return Response(
            content=str(result).replace("'", '"'),
            status_code=503,
            media_type="application/json"
        )
    return result


@router.get("/metrics")
def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=get_metrics(),
        media_type=get_metrics_content_type()
    )
