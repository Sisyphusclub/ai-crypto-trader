"""Worker tasks module."""
from worker.tasks.demo import ping_task
from worker.tasks.strategy import (
    collect_market_data,
    evaluate_strategy,
    evaluate_all_strategies,
)
from worker.tasks.trader import run_trader_cycle, run_all_traders

__all__ = [
    "ping_task",
    "collect_market_data",
    "evaluate_strategy",
    "evaluate_all_strategies",
    "run_trader_cycle",
    "run_all_traders",
]


def ping_task(message: str = "pong") -> str:
    """Simple ping task for testing RQ connectivity."""
    return f"Received: {message}"
