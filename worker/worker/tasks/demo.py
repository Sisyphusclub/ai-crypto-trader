"""Demo tasks for testing the worker queue."""
import time
from datetime import datetime


def ping_task(message: str = "pong") -> dict:
    """
    Simple ping task for testing the queue.
    Returns a dict with timestamp and message.
    """
    time.sleep(1)  # Simulate some work
    return {
        "status": "success",
        "message": message,
        "timestamp": datetime.utcnow().isoformat(),
    }
