"""Review API routes and background processing pipeline."""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Deque, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from agent.graph import review_graph
from core.config import settings
from core.database import AsyncSessionLocal, get_db
from models.database import (
    ProgressEvent,
    Recommendation,
    RelatedPaper,
    Review,
    ReviewDimensionScore,
    ReviewStatus,
)
from models.schemas import (
    DimensionScoreOut,
    FullReviewOut,
    MajorFlaw,
    ProgressEventOut,
    RelatedPaperOut,
    ReviewListItem,
)
from services.pdf_generator import generate_review_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

RATE_LIMIT_WINDOW_SECONDS = 3600
RATE_LIMIT_MAX_REQUESTS = 10
rate_limit_store: Dict[str, Deque[float]] = defaultdict(deque)

STEP_MAPPING = [
    ("extracting", "Extracting paper content"),
    ("literature", "Searching related literature"),
    ("analysing", "Analysing research field and novelty"),
    ("reviewing", "Running peer review analysis"),
    ("generating_pdf", "Generating PDF report"),
]


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


def _sanitize_filename(value: str) -> str:
    """Sanitize a filename-safe slug from a title."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return cleaned.strip("._") or "review"


def _extract_arxiv_id(arxiv_url: str) -> str:
    """Parse an arXiv identifier from a supported URL."""
    match = re.search(r"arxiv\.org/(?:abs|pdf)/([0-9]+\.[0-9]+)(?:v\d+)?", arxiv_url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid arXiv URL.")
    return match.group(1)


def _parse_json_list(payload: Optional[str]) -> list:
    """Parse a JSON list string safely."""
    if not payload:
        return []
    try:
        data = json.loads(payload)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _check_rate_limit(ip_address: str) -> None:
    """Enforce the in-memory per-IP review creation limit."""
    now = time.time()
    bucket = rate_limit_store[ip_address]
    while bucket and now - bucket[0] > RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Max 10 reviews per hour.")
    bucket.append(now)


async def _create_progress_event(
    session: AsyncSession,
    review_id: str,
    step: str,
    message: str,
) -> None:
    """Persist a progress event for later SSE streaming."""
    session.add(ProgressEvent(review_id=review_id, step=step, message=message))
    await session.commit()


async def _persist_review_results(session: AsyncSession, review: Review, result: dict) -> None:
    """Store completed graph output into database tables."""
    review.title = result.get("title", review.title)
    review.authors = ", ".join(result.get("authors", [])) or None
    review.abstract = result.get("abstract") or None
    review.field = result.get("field") or None
    recommendation = result.get("recommendation")
    review.recommendation = Recommendation(recommendation) if recommendation else None
    review.overall_score = result.get("overall_score")
    review.summary = result.get("summary") or None
    review.general_comments = result.get("general_comments") or None
    review.major_flaws_json = json.dumps(result.get("major_flaws", []))
    review.minor_points_json = json.dumps(result.get("minor_points", []))
    review.research_llm_raw_output = result.get("research_llm_raw_output") or None
    review.review_llm_raw_output = result.get("review_llm_raw_output") or None
    review.error_message = result.get("error")

    await session.execute(delete(ReviewDimensionScore).where(ReviewDimensionScore.review_id == review.id))
    await session.execute(delete(RelatedPaper).where(RelatedPaper.review_id == review.id))

    for item in result.get("dimension_scores", []):
        session.add(
            ReviewDimensionScore(
                review_id=review.id,
                dimension=item.get("dimension", ""),
                score=float(item.get("score", 0)),
                strengths=json.dumps(item.get("strengths", [])),
                weaknesses=json.dumps(item.get("weaknesses", [])),
                critical_issues=json.dumps(item.get("critical_issues", [])),
                suggestions=json.dumps(item.get("suggestions", [])),
            )
        )

    for item in result.get("related_papers", []):
        session.add(
            RelatedPaper(
                review_id=review.id,
                s2_paper_id=item.get("s2_paper_id"),
                title=item.get("title", "Untitled"),
                authors=item.get("authors"),
                year=item.get("year"),
                citation_count=item.get("citation_count", 0),
                relevance_note=item.get("relevance_note"),
            )
        )

    await session.commit()


async def run_pipeline(review_id: str, paper_bytes: Optional[bytes], arxiv_id: Optional[str]) -> None:
    """Execute the full graph pipeline and persist the resulting review."""
    async with AsyncSessionLocal() as session:
        review = await session.get(Review, review_id)
        if review is None:
            return

        try:
            review.status = ReviewStatus.processing
            await session.commit()

            initial_state = {
                "paper_bytes": paper_bytes,
                "arxiv_id": arxiv_id,
                "review_id": review_id,
                "title": review.title,
                "authors": [],
                "abstract": "",
                "full_text": "",
                "sections": {},
                "figures": [],
                "tables": [],
                "references": [],
                "word_count": 0,
                "page_count": 0,
                "field": "",
                "related_papers": [],
                "research_llm_raw_output": "",
                "dimension_scores": [],
                "overall_score": 0.0,
                "recommendation": "",
                "summary": "",
                "general_comments": "",
                "major_flaws": [],
                "minor_points": [],
                "review_llm_raw_output": "",
                "progress_messages": [],
                "error": None,
                "status": "processing",
                "messages": [],
            }

            await _create_progress_event(session, review_id, "extracting", "Extracting paper content")
            result = await review_graph.ainvoke(initial_state)

            progress_messages = result.get("progress_messages", [])
            for step, prefix in STEP_MAPPING[1:]:
                if any(prefix.lower().split()[0] in message.lower() for message in progress_messages):
                    await _create_progress_event(session, review_id, step, prefix)

            if result.get("status") == "failed":
                review.status = ReviewStatus.failed
                review.error_message = result.get("error", "Review pipeline failed.")
                await _create_progress_event(session, review_id, "failed", review.error_message or "Review failed")
                await session.commit()
                return

            await _persist_review_results(session, review, result)
            await _create_progress_event(session, review_id, "generating_pdf", "Generating PDF report")

            pdf_path = await generate_review_pdf(
                {
                    "title": review.title,
                    "recommendation": review.recommendation.value if review.recommendation else None,
                    "overall_score": review.overall_score,
                    "summary": review.summary or "",
                    "general_comments": review.general_comments or "",
                    "major_flaws": json.loads(review.major_flaws_json or "[]"),
                    "minor_points": json.loads(review.minor_points_json or "[]"),
                    "dimension_scores": result.get("dimension_scores", []),
                    "related_papers": result.get("related_papers", []),
                },
                review_id,
            )

            review.pdf_report_path = pdf_path
            review.status = ReviewStatus.complete
            await session.commit()
            await _create_progress_event(session, review_id, "complete", "Review complete")
        except Exception as exc:
            logger.error("Pipeline failed for %s: %s", review_id, exc, exc_info=True)
            review.status = ReviewStatus.failed
            review.error_message = str(exc) if settings.ENVIRONMENT == "development" else "Internal review error."
            await session.commit()
            await _create_progress_event(session, review_id, "failed", review.error_message)


@router.post("/review")
async def start_review(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    arxiv_url: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Start a new review from a PDF upload or arXiv URL."""
    ip_address = request.client.host if request.client else "unknown"
    _check_rate_limit(ip_address)

    if bool(file) == bool(arxiv_url):
        raise HTTPException(status_code=400, detail="Provide exactly one of file or arxiv_url.")

    paper_bytes: Optional[bytes] = None
    arxiv_id: Optional[str] = None
    title = "Processing..."
    source = "upload"

    if file is not None:
        filename = file.filename or "paper.pdf"
        if file.content_type != "application/pdf" or not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Uploaded file must be a PDF.")
        paper_bytes = await file.read()
        max_bytes = settings.MAX_PDF_SIZE_MB * 1024 * 1024
        if len(paper_bytes) > max_bytes:
            raise HTTPException(status_code=413, detail="Uploaded PDF exceeds size limit.")
        sanitized_name = _sanitize_filename(Path(filename).name)
        upload_dir = Path(settings.UPLOADS_DIR)
        upload_dir.mkdir(exist_ok=True)
        (upload_dir / sanitized_name).write_bytes(paper_bytes)
        title = Path(filename).stem
    else:
        source = "arxiv"
        arxiv_id = _extract_arxiv_id(arxiv_url or "")
        title = f"arXiv {arxiv_id}"

    review = Review(
        title=title,
        source=source,
        arxiv_id=arxiv_id,
        status=ReviewStatus.pending,
    )
    db.add(review)
    await db.flush()
    await db.commit()
    await _create_progress_event(db, review.id, "pending", "Review request received")
    asyncio.create_task(run_pipeline(review.id, paper_bytes, arxiv_id))
    return JSONResponse({"review_id": review.id, "status": "processing"})


@router.get("/progress/{review_id}")
async def stream_progress(review_id: str) -> StreamingResponse:
    """Stream review progress events via server-sent events."""

    async def event_generator():
        start = time.monotonic()
        seen_ids: set[str] = set()
        while True:
            if time.monotonic() - start > 600:
                payload = {"step": "timeout", "message": "Review timed out.", "review_id": review_id, "status": "failed"}
                yield f"data: {json.dumps(payload)}\n\n"
                break

            async with AsyncSessionLocal() as session:
                review = await session.get(Review, review_id)
                if review is None or review.deleted_at is not None:
                    payload = {"step": "not_found", "message": "Review not found.", "review_id": review_id, "status": "failed"}
                    yield f"data: {json.dumps(payload)}\n\n"
                    break

                result = await session.execute(
                    select(ProgressEvent).where(ProgressEvent.review_id == review_id).order_by(ProgressEvent.timestamp.asc())
                )
                events = result.scalars().all()
                for event in events:
                    if event.id in seen_ids:
                        continue
                    seen_ids.add(event.id)
                    payload = {
                        "step": event.step,
                        "message": event.message,
                        "review_id": review_id,
                        "status": review.status.value,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

                if review.status in {ReviewStatus.complete, ReviewStatus.failed}:
                    break
            await asyncio.sleep(1.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/reviews", response_model=list[ReviewListItem])
async def list_reviews(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db)) -> List[ReviewListItem]:
    """Return recent non-deleted reviews for the sidebar."""
    result = await db.execute(
        select(Review)
        .where(Review.deleted_at.is_(None))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    reviews = result.scalars().all()
    return [
        ReviewListItem(
            id=review.id,
            title=review.title,
            created_at=review.created_at,
            status=review.status.value,
            recommendation=review.recommendation.value if review.recommendation else None,
            overall_score=review.overall_score,
        )
        for review in reviews
    ]


@router.get("/review/{review_id}", response_model=FullReviewOut)
async def get_review(review_id: str, db: AsyncSession = Depends(get_db)) -> FullReviewOut:
    """Return a full review payload by id."""
    review = await db.get(Review, review_id)
    if review is None or review.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Review not found.")

    result = await db.execute(
        select(ReviewDimensionScore).where(ReviewDimensionScore.review_id == review_id).order_by(ReviewDimensionScore.dimension.asc())
    )
    dimensions = result.scalars().all()
    related_result = await db.execute(
        select(RelatedPaper).where(RelatedPaper.review_id == review_id).order_by(RelatedPaper.citation_count.desc())
    )
    related_papers = related_result.scalars().all()

    return FullReviewOut(
        id=review.id,
        title=review.title,
        authors=review.authors,
        abstract=review.abstract,
        field=review.field,
        status=review.status.value,
        recommendation=review.recommendation.value if review.recommendation else None,
        overall_score=review.overall_score,
        summary=review.summary,
        general_comments=review.general_comments,
        major_flaws=[MajorFlaw(**item) for item in _parse_json_list(review.major_flaws_json)],
        minor_points=[str(item) for item in _parse_json_list(review.minor_points_json)],
        dimension_scores=[
            DimensionScoreOut(
                dimension=item.dimension,
                score=item.score,
                strengths=[str(v) for v in _parse_json_list(item.strengths)],
                weaknesses=[str(v) for v in _parse_json_list(item.weaknesses)],
                critical_issues=[str(v) for v in _parse_json_list(item.critical_issues)],
                suggestions=[str(v) for v in _parse_json_list(item.suggestions)],
            )
            for item in dimensions
        ],
        related_papers=[
            RelatedPaperOut(
                title=item.title,
                authors=item.authors,
                year=item.year,
                citation_count=item.citation_count,
                relevance_note=item.relevance_note,
            )
            for item in related_papers
        ],
        research_llm_raw_output=review.research_llm_raw_output,
        review_llm_raw_output=review.review_llm_raw_output,
        created_at=review.created_at,
    )


@router.get("/review/{review_id}/pdf")
async def download_pdf(review_id: str, db: AsyncSession = Depends(get_db)) -> FileResponse:
    """Download the generated review PDF."""
    review = await db.get(Review, review_id)
    if review is None or review.deleted_at is not None or not review.pdf_report_path:
        raise HTTPException(status_code=404, detail="PDF not found.")

    path = Path(review.pdf_report_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF not found.")

    filename = f"{_sanitize_filename(review.title)}_review.pdf"
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/review/{review_id}")
async def delete_review(review_id: str, db: AsyncSession = Depends(get_db)) -> JSONResponse:
    """Soft-delete a review."""
    review = await db.get(Review, review_id)
    if review is None or review.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Review not found.")
    review.deleted_at = _utcnow()
    await db.commit()
    return JSONResponse({"message": "deleted"})


@router.get("/health")
async def health() -> JSONResponse:
    """Health check endpoint."""
    return JSONResponse({"status": "ok", "environment": settings.ENVIRONMENT})
