from pydantic_settings import BaseSettings
from functools import lru_cache


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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
