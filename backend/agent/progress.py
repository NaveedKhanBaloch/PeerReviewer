"""Utilities for emitting live progress events from graph nodes."""

from __future__ import annotations

from core.database import AsyncSessionLocal
from models.database import ProgressEvent


async def emit_progress(review_id: str, step: str, message: str) -> None:
    """Persist one progress event for SSE consumers."""
    async with AsyncSessionLocal() as session:
        session.add(ProgressEvent(review_id=review_id, step=step, message=message))
        await session.commit()
