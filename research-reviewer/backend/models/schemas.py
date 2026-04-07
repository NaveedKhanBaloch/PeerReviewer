"""Pydantic request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ReviewRequest(BaseModel):
    """Request body for an arXiv-based review."""

    arxiv_url: Optional[str] = None


class DimensionScoreOut(BaseModel):
    """Dimension score response payload."""

    dimension: str
    score: float
    strengths: List[str]
    weaknesses: List[str]
    critical_issues: List[str]
    suggestions: List[str]


class RelatedPaperOut(BaseModel):
    """Related paper response payload."""

    title: str
    authors: Optional[str]
    year: Optional[int]
    citation_count: Optional[int]
    relevance_note: Optional[str]


class MajorFlaw(BaseModel):
    """Major flaw item."""

    issue: str
    evidence: str
    remedy: str


class ReviewListItem(BaseModel):
    """Sidebar review list item."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    status: str
    recommendation: Optional[str]
    overall_score: Optional[float]


class FullReviewOut(BaseModel):
    """Full review detail payload."""

    id: str
    title: str
    authors: Optional[str]
    abstract: Optional[str]
    field: Optional[str]
    status: str
    recommendation: Optional[str]
    overall_score: Optional[float]
    summary: Optional[str]
    general_comments: Optional[str]
    major_flaws: List[MajorFlaw]
    minor_points: List[str]
    dimension_scores: List[DimensionScoreOut]
    related_papers: List[RelatedPaperOut]
    research_llm_raw_output: Optional[str] = None
    review_llm_raw_output: Optional[str] = None
    created_at: datetime


class ProgressEventOut(BaseModel):
    """Progress event payload for SSE."""

    step: str
    message: str
    review_id: Optional[str] = None
    status: str = "processing"
