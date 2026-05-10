"""Application configuration."""

from pathlib import Path

from pydantic import field_validator, model_validator
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
    GROBID_HOSTPORT: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./reviews.db"
    OUTPUTS_DIR: str = "outputs"
    UPLOADS_DIR: str = "uploads"
    MAX_PDF_SIZE_MB: int = 50
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-this-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    GOOGLE_CLIENT_ID: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@ai-research-reviewer.local"
    SMTP_FROM_NAME: str = "AI Research Reviewer"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Use SQLAlchemy's async Postgres driver for managed Postgres URLs."""
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def derive_service_urls(self) -> "Settings":
        """Build GROBID URLs from host:port references when provided."""
        if self.GROBID_HOSTPORT and self.GROBID_URL in {"", "http://localhost:8070"}:
            self.GROBID_URL = f"http://{self.GROBID_HOSTPORT}"
        return self

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Fail fast when production starts with unsafe defaults."""
        if self.ENVIRONMENT.lower() != "production":
            return self
        if self.SECRET_KEY in {"change-this-in-production-min-32-chars", "change-this-to-a-random-32-char-string-in-production"}:
            raise ValueError("SECRET_KEY must be changed for production.")
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production.")
        if not self.ALLOWED_ORIGINS.strip():
            raise ValueError("ALLOWED_ORIGINS must be set in production.")
        if not self.FRONTEND_URL.strip():
            raise ValueError("FRONTEND_URL must be set in production.")
        return self

    def get_outputs_path(self) -> Path:
        """Ensure the outputs directory exists and return it."""
        path = Path(self.OUTPUTS_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
