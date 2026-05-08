"""FastAPI entry point for the AI research reviewer backend."""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from api.routes.auth import router as auth_router
from api.routes.reviews import router
from core.config import settings
from core.database import Base, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:%(name)s:%(message)s",
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)
logging.getLogger("google.generativeai").setLevel(logging.WARNING)
Path(settings.OUTPUTS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)


def _ensure_sqlite_compatibility(sync_conn) -> None:
    """Patch older SQLite schemas with newly added nullable columns."""
    if sync_conn.dialect.name != "sqlite":
        return

    inspector = inspect(sync_conn)
    if "reviews" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("reviews")}
    compatibility_columns = {
        "research_llm_raw_output": "ALTER TABLE reviews ADD COLUMN research_llm_raw_output TEXT",
        "review_llm_raw_output": "ALTER TABLE reviews ADD COLUMN review_llm_raw_output TEXT",
        "created_by_user_id": "ALTER TABLE reviews ADD COLUMN created_by_user_id VARCHAR(36)",
    }

    for column_name, statement in compatibility_columns.items():
        if column_name not in existing_columns:
            sync_conn.execute(text(statement))

    sync_conn.execute(
        text(
            """
            UPDATE reviews
            SET recommendation = CASE recommendation
                WHEN 'accept' THEN 'Accept'
                WHEN 'minor_revision' THEN 'Minor revision'
                WHEN 'major_revision' THEN 'Major revision'
                WHEN 'reject' THEN 'Reject'
                ELSE recommendation
            END
            WHERE recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject')
            """
        )
    )

    if "users" in inspector.get_table_names():
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        user_compatibility_columns = {
            "is_email_verified": "ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT 1",
            "email_verification_token": "ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(128)",
            "email_verification_sent_at": "ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME",
        }
        for column_name, statement in user_compatibility_columns.items():
            if column_name not in user_columns:
                sync_conn.execute(text(statement))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and required directories."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_sqlite_compatibility)
    Path(settings.OUTPUTS_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.UPLOADS_DIR).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="AI Research Paper Reviewer", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Attach basic security headers to each response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    """Return consistent JSON for HTTP exceptions."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return sanitized server errors and log full tracebacks."""
    error_id = str(uuid.uuid4())
    logging.error("Unhandled exception %s on %s %s: %s", error_id, request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again.", "error_id": error_id},
    )


allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(router, prefix="/api")
app.mount("/outputs", StaticFiles(directory=settings.OUTPUTS_DIR), name="outputs")


@app.get("/health")
async def root_health() -> JSONResponse:
    """Root health endpoint."""
    return JSONResponse({"status": "ok", "environment": settings.ENVIRONMENT})
