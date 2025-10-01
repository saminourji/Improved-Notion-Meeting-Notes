from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Simplified application configuration."""

    environment: str = Field("development", env="APP_ENV")
    log_level: str = Field("INFO", env="LOG_LEVEL")

    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field("gpt-4o-mini", env="OPENAI_MODEL")

    huggingface_token: Optional[str] = Field(default=None, env="HUGGINGFACE_TOKEN")

    data_dir: Path = Field(default=Path("data"), env="DATA_DIR")
    logs_dir: Path = Field(default=Path("logs"), env="LOGS_DIR")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra fields in .env
    }
    
    @property
    def pipeline_log_path(self) -> Path:
        """Path to the pipeline log file."""
        return self.logs_dir / "pipeline.log"


_settings: Optional[Settings] = None

def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        _settings.data_dir.mkdir(parents=True, exist_ok=True)
        _settings.logs_dir.mkdir(parents=True, exist_ok=True)
    return _settings