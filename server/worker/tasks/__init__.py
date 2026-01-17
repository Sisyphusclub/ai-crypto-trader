"""Demo worker tasks."""


def ping_task(message: str = "pong") -> str:
    """Simple ping task for testing RQ connectivity."""
    return f"Received: {message}"
