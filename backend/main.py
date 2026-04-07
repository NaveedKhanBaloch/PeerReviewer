"""FastAPI entry point for the AI research reviewer backend."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

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
Path(settings.OUTPUTS_DIR).mkdir(exist_ok=True)
Path(settings.UPLOADS_DIR).mkdir(exist_ok=True)


def _ensure_sqlite_compatibility(sync_conn) -> None:
    """Patch older SQLite schemas with newly added nullable columns."""
    inspector = inspect(sync_conn)
    if "reviews" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("reviews")}
    compatibility_columns = {
        "research_llm_raw_output": "ALTER TABLE reviews ADD COLUMN research_llm_raw_output TEXT",
        "review_llm_raw_output": "ALTER TABLE reviews ADD COLUMN review_llm_raw_output TEXT",
    }

    for column_name, statement in compatibility_columns.items():
        if column_name not in existing_columns:
            sync_conn.execute(text(statement))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and required directories."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_sqlite_compatibility)
    Path(settings.OUTPUTS_DIR).mkdir(exist_ok=True)
    Path(settings.UPLOADS_DIR).mkdir(exist_ok=True)
    yield


app = FastAPI(title="AI Research Paper Reviewer", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Attach basic security headers to each response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Return sanitized server errors and log full tracebacks."""
    logging.exception("Unhandled server error", exc_info=exc)
    detail = str(exc) if settings.ENVIRONMENT == "development" else "Internal server error."
    return JSONResponse(status_code=500, content={"detail": detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.mount("/outputs", StaticFiles(directory=settings.OUTPUTS_DIR), name="outputs")


@app.get("/health")
async def root_health() -> JSONResponse:
    """Root health endpoint."""
    return JSONResponse({"status": "ok", "environment": settings.ENVIRONMENT})
