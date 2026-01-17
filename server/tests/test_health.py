"""Tests for health check endpoints."""
import pytest
from unittest.mock import MagicMock, patch


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_healthz_always_returns_ok(self):
        """Healthz endpoint always returns 200."""
        from app.api.health import healthz

        result = healthz()
        assert result["status"] == "ok"

    def test_readyz_checks_db_and_redis(self):
        """Readyz endpoint checks DB and Redis."""
        from app.api.health import readyz

        with patch('app.api.health._check_db') as mock_db, \
             patch('app.api.health._check_redis') as mock_redis:
            from app.api.schemas import ServiceStatus
            mock_db.return_value = ServiceStatus(ok=True)
            mock_redis.return_value = ServiceStatus(ok=True)

            result = readyz()
            assert result["status"] == "ready"
            assert result["db"] == "ok"
            assert result["redis"] == "ok"

    def test_readyz_returns_503_on_db_failure(self):
        """Readyz returns 503 when DB is down."""
        from app.api.health import readyz
        from fastapi import Response

        with patch('app.api.health._check_db') as mock_db, \
             patch('app.api.health._check_redis') as mock_redis:
            from app.api.schemas import ServiceStatus
            mock_db.return_value = ServiceStatus(ok=False, error="DB down")
            mock_redis.return_value = ServiceStatus(ok=True)

            result = readyz()
            assert isinstance(result, Response)
            assert result.status_code == 503

    def test_livez_checks_all_components(self):
        """Livez endpoint checks DB, Redis, and worker queue."""
        from app.api.health import livez

        with patch('app.api.health._check_db') as mock_db, \
             patch('app.api.health._check_redis') as mock_redis, \
             patch('app.api.health._check_worker_queue') as mock_worker:
            from app.api.schemas import ServiceStatus
            mock_db.return_value = ServiceStatus(ok=True)
            mock_redis.return_value = ServiceStatus(ok=True)
            mock_worker.return_value = ServiceStatus(ok=True)

            result = livez()
            assert result["status"] == "live"
            assert result["db"] == "ok"
            assert result["redis"] == "ok"
            assert result["worker"] == "ok"


class TestMetricsEndpoint:
    """Test Prometheus metrics endpoint."""

    def test_metrics_returns_prometheus_format(self):
        """Metrics endpoint returns Prometheus format."""
        from app.api.health import metrics
        from fastapi import Response

        with patch('app.core.settings.settings') as mock_settings:
            mock_settings.METRICS_ENABLED = True

            result = metrics()
            assert isinstance(result, Response)
            # Content type should be Prometheus text format
            assert "text/plain" in result.media_type or "text/plain" in str(result.headers)


class TestAlertStats:
    """Test alert statistics endpoint."""

    def test_alert_stats_structure(self):
        """Alert stats returns proper structure."""
        from app.api.alerts import AlertStats

        stats = AlertStats(
            total=10,
            unacknowledged=5,
            by_severity={"error": 3, "warning": 2},
            by_category={"execution": 4, "risk": 1},
        )

        assert stats.total == 10
        assert stats.unacknowledged == 5
        assert stats.by_severity["error"] == 3
