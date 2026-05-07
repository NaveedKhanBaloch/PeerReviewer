"""Pydantic request and response schemas."""

from __future__ import annotations

from datetime import datetime
import re
from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validate_password(value: str) -> str:
    if len(value) < 8 or not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
        raise ValueError("Password must be at least 8 characters and include 1 uppercase letter and 1 number.")
    return value


def _validate_username(value: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9_]{3,50}", value):
        raise ValueError("Username must be 3-50 characters: letters, numbers, underscores only.")
    return value


class ReviewRequest(BaseModel):
    """Request body for an arXiv-based review."""

    arxiv_url: Optional[str] = None


class UserCreate(BaseModel):
    """Payload for public user signup."""

    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str
    organisation: Optional[str] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return _validate_username(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password(value)


class UserUpdate(BaseModel):
    """Payload for updating profile fields."""

    full_name: Optional[str] = None
    organisation: Optional[str] = None
    avatar_url: Optional[str] = None


class UserOut(BaseModel):
    """Authenticated user response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    is_email_verified: bool
    organisation: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]


class TokenResponse(BaseModel):
    """Auth token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class SignupResponse(BaseModel):
    """Public signup response before email verification."""

    message: str
    email: EmailStr
    verification_url: Optional[str] = None


class EmailVerificationResponse(BaseModel):
    """Email verification result."""

    message: str


class LoginRequest(BaseModel):
    """Email/password login request."""

    identifier: str = Field(validation_alias=AliasChoices("identifier", "email"))
    password: str


class GoogleAuthRequest(BaseModel):
    """Google Identity Services credential request."""

    credential: str


class RefreshRequest(BaseModel):
    """Refresh-token request."""

    refresh_token: str


class PasswordChange(BaseModel):
    """Own password change request."""

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password(value)


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
    severity: Optional[str] = None


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
    openreview_examples_prompt: Optional[str] = None
    review_llm_raw_output: Optional[str] = None
    created_at: datetime


class ProgressEventOut(BaseModel):
    """Progress event payload for SSE."""

    step: str
    message: str
    review_id: Optional[str] = None
    status: str = "processing"
