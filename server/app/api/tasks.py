"""Task queue API endpoints."""
from fastapi import APIRouter, HTTPException
from rq import Queue
from rq.job import Job
import redis

from app.core.settings import settings
from app.api.schemas import TaskEnqueueResponse, TaskStatusResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_queue() -> Queue:
    """Get RQ queue instance."""
    conn = redis.from_url(settings.REDIS_URL)
    return Queue("default", connection=conn)


@router.post("/ping", response_model=TaskEnqueueResponse)
def enqueue_ping(message: str = "pong"):
    """
    Enqueue a ping task.
    Returns the task ID for status polling.
    """
    queue = _get_queue()
    job = queue.enqueue("worker.tasks.demo.ping_task", message)
    return TaskEnqueueResponse(task_id=job.id, status="queued")


@router.get("/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    """
    Get the status of a queued task.
    """
    conn = redis.from_url(settings.REDIS_URL)
    try:
        job = Job.fetch(task_id, connection=conn)
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")

    status = job.get_status()
    result = None

    if status == "finished":
        result = str(job.result) if job.result else None
    elif status == "failed":
        result = "Task execution failed"  # Don't expose stack traces

    return TaskStatusResponse(task_id=task_id, status=status, result=result)
