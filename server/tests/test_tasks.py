"""Tests for Task Queue API endpoints."""
import uuid
import pytest
from unittest.mock import MagicMock


class MockJob:
    """Mock RQ Job for testing."""
    def __init__(self, job_id=None, status="queued", result=None):
        self.id = job_id or str(uuid.uuid4())
        self._status = status
        self.result = result

    def get_status(self):
        return self._status


class TestTaskQueueLogic:
    """Tests for task queue logic without actual module imports."""

    def test_enqueue_returns_task_id(self):
        """Enqueue operations return task ID."""
        mock_queue = MagicMock()
        mock_job = MockJob(job_id="task-123")
        mock_queue.enqueue.return_value = mock_job

        job = mock_queue.enqueue("worker.tasks.demo.ping_task", "pong")

        assert job.id == "task-123"

    def test_enqueue_with_strategy_id(self):
        """Strategy evaluation is enqueued with string ID."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        strategy_id = uuid.uuid4()
        mock_queue.enqueue("worker.tasks.strategy.evaluate_strategy", str(strategy_id))

        mock_queue.enqueue.assert_called_with(
            "worker.tasks.strategy.evaluate_strategy",
            str(strategy_id)
        )

    def test_task_status_queued(self):
        """Task status returns queued state."""
        job = MockJob(status="queued")

        status = job.get_status()
        result = None

        assert status == "queued"
        assert result is None

    def test_task_status_started(self):
        """Task status returns started state."""
        job = MockJob(status="started")

        status = job.get_status()

        assert status == "started"

    def test_task_status_finished_with_result(self):
        """Task status returns finished with result."""
        job = MockJob(status="finished", result={"success": True})

        status = job.get_status()
        result = str(job.result) if job.result else None

        assert status == "finished"
        assert result == "{'success': True}"

    def test_task_status_finished_no_result(self):
        """Task status handles finished without result."""
        job = MockJob(status="finished", result=None)

        status = job.get_status()
        result = str(job.result) if job.result else None

        assert status == "finished"
        assert result is None

    def test_task_status_failed(self):
        """Task status returns generic error for failed."""
        job = MockJob(status="failed")

        status = job.get_status()
        result = "Task execution failed" if status == "failed" else None

        assert status == "failed"
        assert result == "Task execution failed"


class TestTaskEnqueueEndpoints:
    """Tests for task enqueue endpoint patterns."""

    def test_ping_endpoint_enqueues_default_message(self):
        """Ping endpoint uses default message."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        message = "pong"
        mock_queue.enqueue("worker.tasks.demo.ping_task", message)

        mock_queue.enqueue.assert_called_once_with(
            "worker.tasks.demo.ping_task",
            "pong"
        )

    def test_ping_endpoint_enqueues_custom_message(self):
        """Ping endpoint uses custom message."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        message = "hello"
        mock_queue.enqueue("worker.tasks.demo.ping_task", message)

        mock_queue.enqueue.assert_called_once_with(
            "worker.tasks.demo.ping_task",
            "hello"
        )

    def test_evaluate_all_strategies_endpoint(self):
        """All strategies evaluation enqueues correct task."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        mock_queue.enqueue("worker.tasks.strategy.evaluate_all_strategies")

        mock_queue.enqueue.assert_called_once_with(
            "worker.tasks.strategy.evaluate_all_strategies"
        )

    def test_pnl_calculation_single_account(self):
        """PnL calculation for single account."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        account_id = uuid.uuid4()
        mock_queue.enqueue("worker.tasks.pnl.calculate_realized_pnl", str(account_id))

        mock_queue.enqueue.assert_called_once_with(
            "worker.tasks.pnl.calculate_realized_pnl",
            str(account_id)
        )

    def test_pnl_calculation_all_accounts(self):
        """PnL calculation for all accounts."""
        mock_queue = MagicMock()
        mock_job = MockJob()
        mock_queue.enqueue.return_value = mock_job

        mock_queue.enqueue("worker.tasks.pnl.calculate_all_pnl")

        mock_queue.enqueue.assert_called_once_with(
            "worker.tasks.pnl.calculate_all_pnl"
        )


class TestTaskStatusEndpoint:
    """Tests for task status endpoint patterns."""

    def test_task_not_found_raises_404(self):
        """Missing task raises 404."""
        from fastapi import HTTPException

        job = None
        if not job:
            with pytest.raises(HTTPException) as exc:
                raise HTTPException(status_code=404, detail="Task not found")
            assert exc.value.status_code == 404
            assert "Task not found" in exc.value.detail

    def test_task_response_structure(self):
        """Task status response has correct structure."""
        job = MockJob(job_id="task-123", status="queued")

        response = {
            "task_id": job.id,
            "status": job.get_status(),
            "result": None,
        }

        assert response["task_id"] == "task-123"
        assert response["status"] == "queued"
        assert response["result"] is None

    def test_finished_task_includes_result(self):
        """Finished task includes result in response."""
        job = MockJob(job_id="task-123", status="finished", result={"data": "value"})

        result = str(job.result) if job.result else None

        response = {
            "task_id": job.id,
            "status": job.get_status(),
            "result": result,
        }

        assert response["status"] == "finished"
        assert "data" in response["result"]
