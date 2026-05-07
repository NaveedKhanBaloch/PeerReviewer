"""Add email verification fields to users."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260430_000004"
down_revision = "20260422_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "is_email_verified" not in columns:
        op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.true()))
        op.alter_column("users", "is_email_verified", server_default=None)
    if "email_verification_token" not in columns:
        op.add_column("users", sa.Column("email_verification_token", sa.String(length=128), nullable=True))
    if "email_verification_sent_at" not in columns:
        op.add_column("users", sa.Column("email_verification_sent_at", sa.DateTime(timezone=True), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_email_verification_token" not in indexes:
        op.create_index("ix_users_email_verification_token", "users", ["email_verification_token"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "users" not in inspector.get_table_names():
        return

    indexes = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_email_verification_token" in indexes:
        op.drop_index("ix_users_email_verification_token", table_name="users")

    columns = {column["name"] for column in inspector.get_columns("users")}
    for column_name in ["email_verification_sent_at", "email_verification_token", "is_email_verified"]:
        if column_name in columns:
            op.drop_column("users", column_name)
