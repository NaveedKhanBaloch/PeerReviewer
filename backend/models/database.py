"""SQLAlchemy ORM models for reviews and related entities."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class ReviewStatus(str, enum.Enum):
    """Possible states for a review pipeline."""

    pending = "pending"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class Recommendation(str, enum.Enum):
    """Allowed review recommendations."""

    accept = "Accept"
    minor_revision = "Minor revision"
    major_revision = "Major revision"
    reject = "Reject"


class Review(Base):
    """Primary review record."""

    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authors: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    abstract: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    field: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    arxiv_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, name="review_status"),
        nullable=False,
        default=ReviewStatus.pending,
    )
    recommendation: Mapped[Optional[Recommendation]] = mapped_column(
        Enum(Recommendation, name="recommendation"),
        nullable=True,
    )
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    general_comments: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    major_flaws_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    minor_points_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    research_llm_raw_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_llm_raw_output: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pdf_report_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    dimension_scores: Mapped[List["ReviewDimensionScore"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
    )
    related_papers: Mapped[List["RelatedPaper"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
    )
    progress_events: Mapped[List["ProgressEvent"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
    )


class ReviewDimensionScore(Base):
    """Detailed dimension-level scoring for a review."""

    __tablename__ = "review_dimension_scores"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id"), nullable=False)
    dimension: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    strengths: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    weaknesses: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    critical_issues: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggestions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    review: Mapped["Review"] = relationship(back_populates="dimension_scores")


class RelatedPaper(Base):
    """Related literature retrieved from Semantic Scholar."""

    __tablename__ = "related_papers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id"), nullable=False)
    s2_paper_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authors: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    citation_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    relevance_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    review: Mapped["Review"] = relationship(back_populates="related_papers")


class ProgressEvent(Base):
    """Stored progress events for SSE streaming."""

    __tablename__ = "progress_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    review_id: Mapped[str] = mapped_column(ForeignKey("reviews.id"), nullable=False)
    step: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    review: Mapped["Review"] = relationship(back_populates="progress_events")
