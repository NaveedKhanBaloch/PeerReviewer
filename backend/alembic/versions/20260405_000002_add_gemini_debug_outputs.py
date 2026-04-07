"""Add Gemini raw output debug columns.

Revision ID: 20260405_000002
Revises: 20260405_000001
Create Date: 2026-04-05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260405_000002"
down_revision = "20260405_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reviews", sa.Column("research_llm_raw_output", sa.Text(), nullable=True))
    op.add_column("reviews", sa.Column("review_llm_raw_output", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("reviews", "review_llm_raw_output")
    op.drop_column("reviews", "research_llm_raw_output")
