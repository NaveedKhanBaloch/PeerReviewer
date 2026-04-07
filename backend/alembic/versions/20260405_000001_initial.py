"""Initial schema.

Revision ID: 20260405_000001
Revises:
Create Date: 2026-04-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260405_000001"
down_revision = None
branch_labels = None
depends_on = None


review_status = sa.Enum("pending", "processing", "complete", "failed", name="review_status")
recommendation = sa.Enum("Accept", "Minor revision", "Major revision", "Reject", name="recommendation")


def upgrade() -> None:
    review_status.create(op.get_bind(), checkfirst=True)
    recommendation.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "reviews",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("authors", sa.String(length=1000), nullable=True),
        sa.Column("abstract", sa.Text(), nullable=True),
        sa.Column("field", sa.String(length=200), nullable=True),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("arxiv_id", sa.String(length=50), nullable=True),
        sa.Column("status", review_status, nullable=False),
        sa.Column("recommendation", recommendation, nullable=True),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("general_comments", sa.Text(), nullable=True),
        sa.Column("major_flaws_json", sa.Text(), nullable=True),
        sa.Column("minor_points_json", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("pdf_report_path", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "review_dimension_scores",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("review_id", sa.String(length=36), sa.ForeignKey("reviews.id"), nullable=False),
        sa.Column("dimension", sa.String(length=100), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("weaknesses", sa.Text(), nullable=True),
        sa.Column("critical_issues", sa.Text(), nullable=True),
        sa.Column("suggestions", sa.Text(), nullable=True),
    )

    op.create_table(
        "related_papers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("review_id", sa.String(length=36), sa.ForeignKey("reviews.id"), nullable=False),
        sa.Column("s2_paper_id", sa.String(length=100), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("authors", sa.String(length=500), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("citation_count", sa.Integer(), nullable=True),
        sa.Column("relevance_note", sa.Text(), nullable=True),
    )

    op.create_table(
        "progress_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("review_id", sa.String(length=36), sa.ForeignKey("reviews.id"), nullable=False),
        sa.Column("step", sa.String(length=100), nullable=False),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("progress_events")
    op.drop_table("related_papers")
    op.drop_table("review_dimension_scores")
    op.drop_table("reviews")
    recommendation.drop(op.get_bind(), checkfirst=True)
    review_status.drop(op.get_bind(), checkfirst=True)
