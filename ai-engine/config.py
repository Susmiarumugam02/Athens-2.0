from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(default="sqlite:///../backend/db.sqlite3", alias="DATABASE_URL")
    model_dir: Path = Field(default=Path("models/registry"), alias="AI_MODEL_DIR")
    min_training_samples: int = Field(default=25, alias="AI_MIN_TRAINING_SAMPLES")
    api_key: str | None = Field(default=None, alias="AI_ENGINE_API_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
settings.model_dir.mkdir(parents=True, exist_ok=True)
