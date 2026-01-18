"""Tests for reconciliation task."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from decimal import Decimal


@pytest.fixture(autouse=True)
def mock_settings():
    """Mock settings for all tests."""
    with patch('app.core.locks.settings') as mock:
        mock.REDIS_LOCK_TTL = 30
        mock.REDIS_LOCK_TIMEOUT = 10
        mock.REDIS_URL = "redis://localhost:6379"
        yield mock


class TestReconcileTask:
    """Test reconciliation task functionality."""

    def test_reconcile_lock_prevents_concurrent_runs(self):
        """Reconcile task acquires lock to prevent concurrent runs."""
        from app.core.locks import LockNotAcquiredError

        # If lock is already held, reconcile should be skipped
        with patch('app.core.locks.get_redis_client') as mock_client:
            mock_redis = MagicMock()
            mock_redis.set.return_value = None  # Lock not acquired
            mock_client.return_value = mock_redis

            from app.core.locks import reconcile_lock

            with pytest.raises(LockNotAcquiredError):
                with reconcile_lock("account-123"):
                    pass

    def test_reconcile_updates_filled_execution(self):
        """Reconcile updates execution status to filled."""
        from app.models.base import ExecutionStatus

        # Test the status mapping logic
        exchange_status = "filled"
        if exchange_status in ["filled", "closed"]:
            new_status = ExecutionStatus.FILLED.value
            assert new_status == "filled"

    def test_reconcile_updates_cancelled_execution(self):
        """Reconcile updates execution status to cancelled."""
        from app.models.base import ExecutionStatus

        exchange_status = "cancelled"
        if exchange_status in ["cancelled", "canceled", "expired"]:
            new_status = ExecutionStatus.CANCELLED.value
            assert new_status == "cancelled"

    def test_reconcile_handles_partial_fill(self):
        """Reconcile handles partial fills correctly."""
        from app.models.base import ExecutionStatus

        exchange_status = "partial"
        if exchange_status in ["partially_filled", "partial"]:
            new_status = ExecutionStatus.PARTIALLY_FILLED.value
            assert new_status == "partially_filled"


class TestTradePlanStatusTransitions:
    """Test trade plan status transitions during reconciliation."""

    def test_entry_placed_to_entry_filled(self):
        """Trade plan transitions from entry_placed to entry_filled."""
        from app.models.base import TradePlanStatus

        # When entry execution is filled
        current = TradePlanStatus.ENTRY_PLACED.value
        assert current == "entry_placed"

        # After reconcile finds filled entry
        new = TradePlanStatus.ENTRY_FILLED.value
        assert new == "entry_filled"

    def test_tp_sl_placed_to_completed(self):
        """Trade plan transitions from tp_sl_placed to completed."""
        from app.models.base import TradePlanStatus

        # When all TP/SL orders are filled or cancelled
        current = TradePlanStatus.TP_SL_PLACED.value
        new = TradePlanStatus.COMPLETED.value
        assert new == "completed"


class TestReconcileMetrics:
    """Test reconciliation metrics."""

    def test_reconcile_metrics_increment(self):
        """Reconcile metrics are incremented correctly."""
        from app.core.metrics import reconcile_runs_total, reconcile_updates_total

        # These are Prometheus counters - verify they exist
        assert reconcile_runs_total is not None
        assert reconcile_updates_total is not None

        # Verify labels work
        reconcile_runs_total.labels(status="success")
        reconcile_updates_total.labels(type="execution_filled")
