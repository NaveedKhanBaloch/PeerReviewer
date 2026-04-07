"""Application configuration."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(ROOT_DIR / ".env"),
        env_file_encoding="utf-8",
    )

    GEMINI_API_KEY: str
    GEMINI_FLASH_MODEL: str = "gemini-2.5-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    SEMANTIC_SCHOLAR_API_KEY: str = ""
    GROBID_URL: str = "http://localhost:8070"
    DATABASE_URL: str = "sqlite+aiosqlite:///./reviews.db"
    OUTPUTS_DIR: str = "outputs"
    UPLOADS_DIR: str = "uploads"
    MAX_PDF_SIZE_MB: int = 50
    ENVIRONMENT: str = "development"

    def get_outputs_path(self) -> Path:
        """Ensure the outputs directory exists and return it."""
        path = Path(self.OUTPUTS_DIR)
        path.mkdir(exist_ok=True)
        return path


settings = Settings()
