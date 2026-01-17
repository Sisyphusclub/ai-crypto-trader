"""Prometheus metrics for the application."""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from app.core.settings import settings

# HTTP request metrics
http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)

# Worker metrics
worker_jobs_total = Counter(
    "worker_jobs_total",
    "Total worker jobs processed",
    ["task", "status"]
)

worker_job_duration_seconds = Histogram(
    "worker_job_duration_seconds",
    "Worker job duration in seconds",
    ["task"]
)

# AI model metrics
model_calls_total = Counter(
    "model_calls_total",
    "Total AI model API calls",
    ["provider", "model", "status"]
)

model_call_duration_seconds = Histogram(
    "model_call_duration_seconds",
    "AI model API call duration in seconds",
    ["provider", "model"]
)

model_tokens_total = Counter(
    "model_tokens_total",
    "Total tokens used by AI models",
    ["provider", "model", "type"]
)

# Exchange metrics
exchange_calls_total = Counter(
    "exchange_calls_total",
    "Total exchange API calls",
    ["exchange", "operation", "status"]
)

exchange_call_duration_seconds = Histogram(
    "exchange_call_duration_seconds",
    "Exchange API call duration in seconds",
    ["exchange", "operation"]
)

# Trading metrics
executions_total = Counter(
    "executions_total",
    "Total trade executions",
    ["exchange", "side", "status"]
)

positions_active = Gauge(
    "positions_active",
    "Current number of active positions",
    ["exchange"]
)

# Risk metrics
risk_checks_total = Counter(
    "risk_checks_total",
    "Total risk checks performed",
    ["result"]
)

# Reconcile metrics
reconcile_runs_total = Counter(
    "reconcile_runs_total",
    "Total reconciliation runs",
    ["status"]
)

reconcile_updates_total = Counter(
    "reconcile_updates_total",
    "Total records updated during reconciliation",
    ["type"]
)


def get_metrics() -> bytes:
    """Generate Prometheus metrics output."""
    if not settings.METRICS_ENABLED:
        return b""
    return generate_latest()


def get_metrics_content_type() -> str:
    """Get the content type for Prometheus metrics."""
    return CONTENT_TYPE_LATEST
