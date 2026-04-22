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
from sqlalchemy import func, select
from sqlalchemy import inspect, text

from api.routes.admin import router as admin_router
from api.routes.auth import router as auth_router
from api.routes.reviews import router
from core.config import settings
from core.database import AsyncSessionLocal, Base, engine
from models.database import User, UserRole
from services.auth_service import hash_password

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
        "created_by_user_id": "ALTER TABLE reviews ADD COLUMN created_by_user_id VARCHAR(36)",
    }

    for column_name, statement in compatibility_columns.items():
        if column_name not in existing_columns:
            sync_conn.execute(text(statement))


async def _seed_default_admin() -> None:
    """Create or migrate the default local admin account."""
    async with AsyncSessionLocal() as session:
        simple_admin_email = "admin@login.com"
        simple_admin_password = "admin"

        existing_simple_admin = (
            await session.execute(select(User).where(User.email == simple_admin_email))
        ).scalar_one_or_none()
        if existing_simple_admin is not None:
            return

        legacy_admin = (
            await session.execute(select(User).where(User.username == "admin"))
        ).scalar_one_or_none()
        if legacy_admin is not None:
            legacy_admin.email = simple_admin_email
            legacy_admin.hashed_password = hash_password(simple_admin_password)
            legacy_admin.role = UserRole.admin
            legacy_admin.is_active = True
            if not legacy_admin.full_name:
                legacy_admin.full_name = "Default Admin"
            await session.commit()
            return

        total = int((await session.execute(select(func.count()).select_from(User))).scalar_one())
        if total > 0:
            return
        session.add(
            User(
                email=simple_admin_email,
                username="admin",
                full_name="Default Admin",
                hashed_password=hash_password(simple_admin_password),
                role=UserRole.admin,
            )
        )
        await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database tables and required directories."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_sqlite_compatibility)
    await _seed_default_admin()
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
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(router, prefix="/api")
app.mount("/outputs", StaticFiles(directory=settings.OUTPUTS_DIR), name="outputs")


@app.get("/health")
async def root_health() -> JSONResponse:
    """Root health endpoint."""
    return JSONResponse({"status": "ok", "environment": settings.ENVIRONMENT})
