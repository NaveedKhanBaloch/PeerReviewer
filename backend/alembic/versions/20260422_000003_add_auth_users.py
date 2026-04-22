"""Add users and review ownership.

Revision ID: 20260422_000003
Revises: 20260405_000002
Create Date: 2026-04-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260422_000003"
down_revision = "20260405_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing_tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("username", sa.String(length=100), nullable=False),
            sa.Column("full_name", sa.String(length=200), nullable=True),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("role", sa.Enum("admin", "user", name="user_role"), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("organisation", sa.String(length=200), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
            sa.UniqueConstraint("username"),
        )
        op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)
    review_columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("reviews")}
    if "created_by_user_id" not in review_columns:
        with op.batch_alter_table("reviews") as batch_op:
            batch_op.add_column(sa.Column("created_by_user_id", sa.String(length=36), nullable=True))
            batch_op.create_foreign_key("fk_reviews_created_by_user_id_users", "users", ["created_by_user_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("reviews") as batch_op:
        batch_op.drop_constraint("fk_reviews_created_by_user_id_users", type_="foreignkey")
        batch_op.drop_column("created_by_user_id")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
