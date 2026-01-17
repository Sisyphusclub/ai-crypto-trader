from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_ENV: str = "dev"
    JWT_SECRET: str = ""
    MASTER_KEY: str = ""
    DATABASE_URL: str = ""
    REDIS_URL: str = ""
    PAPER_TRADING: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
