from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    environment: str = Field("development", env="APP_ENV")
    log_level: str = Field("INFO", env="LOG_LEVEL")

    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field("gpt-4o-mini", env="OPENAI_MODEL")

    huggingface_token: Optional[str] = Field(default=None, env="HUGGINGFACE_TOKEN")

    postgres_url: Optional[str] = Field(default=None, env="POSTGRES_URL")
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL")

    data_dir: Path = Field(default=Path("data"), env="DATA_DIR")
    logs_dir: Path = Field(default=Path("logs"), env="LOGS_DIR")

    pipeline_log_name: str = Field("pipeline.log", env="PIPELINE_LOG_NAME")
    max_concurrent_jobs: int = Field(1, env="MAX_CONCURRENT_JOBS")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def pipeline_log_path(self) -> Path:
        return self.logs_dir / self.pipeline_log_name


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.logs_dir.mkdir(parents=True, exist_ok=True)
    return settings
