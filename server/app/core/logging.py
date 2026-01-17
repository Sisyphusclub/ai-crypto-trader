"""Structured JSON logging with automatic sanitization."""
import logging
import json
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from contextvars import ContextVar

from app.core.settings import settings

# Context vars for request/task tracking
request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
trader_id_var: ContextVar[Optional[str]] = ContextVar("trader_id", default=None)
strategy_id_var: ContextVar[Optional[str]] = ContextVar("strategy_id", default=None)
symbol_var: ContextVar[Optional[str]] = ContextVar("symbol", default=None)

SENSITIVE_PATTERNS = re.compile(
    r"(api[_-]?key|api[_-]?secret|secret|token|password|credential|auth|bearer|master[_-]?key)",
    re.IGNORECASE
)


def _sanitize_value(key: str, value: Any) -> Any:
    """Redact sensitive values."""
    if isinstance(value, str) and SENSITIVE_PATTERNS.search(key):
        if len(value) > 8:
            return value[:4] + "****" + value[-4:]
        return "****"
    if isinstance(value, dict):
        return {k: _sanitize_value(k, v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_value(key, v) for v in value]
    return value


def sanitize_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize a dictionary, redacting sensitive fields."""
    return {k: _sanitize_value(k, v) for k, v in data.items()}


class JsonFormatter(logging.Formatter):
    """JSON log formatter with context enrichment and sanitization."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "service": settings.SERVICE_NAME,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add context vars
        if request_id := request_id_var.get():
            log_data["request_id"] = request_id
        if trader_id := trader_id_var.get():
            log_data["trader_id"] = trader_id
        if strategy_id := strategy_id_var.get():
            log_data["strategy_id"] = strategy_id
        if symbol := symbol_var.get():
            log_data["symbol"] = symbol

        # Add extra fields from record (Python logging attaches extra as attributes)
        skip_attrs = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "exc_info", "exc_text", "thread", "threadName",
            "taskName", "message",
        }
        for key, value in record.__dict__.items():
            if key not in skip_attrs and not key.startswith("_"):
                log_data[key] = _sanitize_value(key, value)

        # Add exception info
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, default=str)


class StandardFormatter(logging.Formatter):
    """Standard text formatter for development."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        prefix_parts = [f"[{timestamp}]", f"[{record.levelname}]", f"[{record.name}]"]

        if trader_id := trader_id_var.get():
            prefix_parts.append(f"[trader:{trader_id[:8]}]")
        if symbol := symbol_var.get():
            prefix_parts.append(f"[{symbol}]")

        prefix = " ".join(prefix_parts)
        message = record.getMessage()

        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)

        return f"{prefix} {message}"


def setup_logging() -> None:
    """Configure application logging."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))

    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_JSON:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(StandardFormatter())

    root.addHandler(handler)

    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name."""
    return logging.getLogger(name)
