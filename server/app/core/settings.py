from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

# Compute path to project root .env file
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    APP_ENV: str = "dev"
    JWT_SECRET: str = ""
    MASTER_KEY: str = ""
    DATABASE_URL: str = ""
    REDIS_URL: str = ""
    PAPER_TRADING: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = True
    SERVICE_NAME: str = "ai-crypto-trader"

    # Metrics
    METRICS_ENABLED: bool = True

    # Redis locks
    REDIS_LOCK_TTL: int = 60
    REDIS_LOCK_TIMEOUT: int = 5

    # Reconcile task
    RECONCILE_LOOKBACK_HOURS: int = 24
    RECONCILE_BATCH_SIZE: int = 100

    # LIVE mode safety
    LIVE_TRADING_CONFIRMATION: str = ""

    # Security
    TRUSTED_PROXY: bool = False  # Set True when behind nginx/traefik
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
