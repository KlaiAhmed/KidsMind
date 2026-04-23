"""Add missing columns and chat_history table.

Revision ID: 20260421_03
Revises: 20260421_02
Create Date: 2026-04-21 12:00:00.000000

Adds:
- chat_history table (entirely new)
- users.reset_token, users.reset_token_expires_at, users.deleted_at
- refresh_token_sessions.generation, token_hash, device_info, attestation_status,
  trust_level, revoked_at, replaced_by_jti, reuse_detected, last_used_at
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260421_03"
down_revision: Union[str, Sequence[str], None] = "20260421_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    # --- chat_history table ---
    if not _table_exists("chat_history"):
        op.create_table(
            "chat_history",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("child_id", sa.String(length=64), nullable=False),
            sa.Column("session_id", sa.String(length=64), nullable=False),
            sa.Column("role", sa.String(length=16), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_chat_history_id", "chat_history", ["id"], unique=False)
        op.create_index("ix_chat_history_child_id", "chat_history", ["child_id"], unique=False)
        op.create_index("ix_chat_history_session_id", "chat_history", ["session_id"], unique=False)
        op.create_index("ix_chat_history_created_at", "chat_history", ["created_at"], unique=False)
        op.create_index(
            "ix_chat_history_child_session_created_at",
            "chat_history",
            ["child_id", "session_id", "created_at"],
            unique=False,
        )

    # --- users columns ---
    if _table_exists("users"):
        columns = _column_names("users")
        if "reset_token" not in columns:
            op.add_column("users", sa.Column("reset_token", sa.String(length=255), nullable=True))
        if "reset_token_expires_at" not in columns:
            op.add_column("users", sa.Column("reset_token_expires_at", sa.DateTime(), nullable=True))
        if "deleted_at" not in columns:
            op.add_column("users", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    # --- refresh_token_sessions columns ---
    RTS = "refresh_token_sessions"
    if _table_exists(RTS):
        columns = _column_names(RTS)
        indexes = _index_names(RTS)

        if "generation" not in columns:
            op.add_column(
                RTS,
                sa.Column("generation", sa.Integer(), nullable=True),
            )
            op.execute(
            sa.update(sa.table(RTS, sa.column("generation")))
            .where(sa.column("generation").is_(None))
            .values(generation=0)
        )
            op.alter_column(RTS, "generation", nullable=False, server_default=sa.text("0"))

        if "token_hash" not in columns:
            op.add_column(
                RTS,
                sa.Column("token_hash", sa.String(length=128), nullable=True),
            )
            op.execute(
            sa.update(sa.table(RTS, sa.column("token_hash"), sa.column("jti")))
            .where(sa.column("token_hash").is_(None))
            .values(token_hash=sa.column("jti"))
        )
            op.alter_column(RTS, "token_hash", nullable=False)
            if "ix_refresh_token_sessions_token_hash" not in indexes:
                op.create_index("ix_refresh_token_sessions_token_hash", RTS, ["token_hash"], unique=True)

        if "device_info" not in columns:
            op.add_column(RTS, sa.Column("device_info", sa.String(length=512), nullable=True))

        if "attestation_status" not in columns:
            op.add_column(
                RTS,
                sa.Column("attestation_status", sa.String(length=32), nullable=True),
            )
            op.execute(
            sa.update(sa.table(RTS, sa.column("attestation_status")))
            .where(sa.column("attestation_status").is_(None))
            .values(attestation_status="unknown")
        )
            op.alter_column(RTS, "attestation_status", nullable=False, server_default=sa.text("'unknown'"))

        if "trust_level" not in columns:
            op.add_column(
                RTS,
                sa.Column("trust_level", sa.String(length=32), nullable=True),
            )
            op.execute(
            sa.update(sa.table(RTS, sa.column("trust_level")))
            .where(sa.column("trust_level").is_(None))
            .values(trust_level="normal")
        )
            op.alter_column(RTS, "trust_level", nullable=False, server_default=sa.text("'normal'"))

        if "revoked_at" not in columns:
            op.add_column(RTS, sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True))

        if "replaced_by_jti" not in columns:
            op.add_column(RTS, sa.Column("replaced_by_jti", sa.String(length=64), nullable=True))

        if "reuse_detected" not in columns:
            op.add_column(
                RTS,
                sa.Column("reuse_detected", sa.Boolean(), nullable=True),
            )
            op.execute(
            sa.update(sa.table(RTS, sa.column("reuse_detected")))
            .where(sa.column("reuse_detected").is_(None))
            .values(reuse_detected=False)
        )
            op.alter_column(RTS, "reuse_detected", nullable=False, server_default=sa.text("false"))

        if "last_used_at" not in columns:
            op.add_column(RTS, sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # --- refresh_token_sessions columns ---
    RTS = "refresh_token_sessions"
    if _table_exists(RTS):
        columns = _column_names(RTS)
        indexes = _index_names(RTS)

        if "last_used_at" in columns:
            op.drop_column(RTS, "last_used_at")
        if "reuse_detected" in columns:
            op.drop_column(RTS, "reuse_detected")
        if "replaced_by_jti" in columns:
            op.drop_column(RTS, "replaced_by_jti")
        if "revoked_at" in columns:
            op.drop_column(RTS, "revoked_at")
        if "trust_level" in columns:
            op.drop_column(RTS, "trust_level")
        if "attestation_status" in columns:
            op.drop_column(RTS, "attestation_status")
        if "device_info" in columns:
            op.drop_column(RTS, "device_info")
        if "token_hash" in columns:
            if "ix_refresh_token_sessions_token_hash" in indexes:
                op.drop_index("ix_refresh_token_sessions_token_hash", table_name=RTS)
            op.drop_column(RTS, "token_hash")
        if "generation" in columns:
            op.drop_column(RTS, "generation")

    # --- users columns ---
    if _table_exists("users"):
        columns = _column_names("users")
        if "deleted_at" in columns:
            op.drop_column("users", "deleted_at")
        if "reset_token_expires_at" in columns:
            op.drop_column("users", "reset_token_expires_at")
        if "reset_token" in columns:
            op.drop_column("users", "reset_token")

    # --- chat_history table ---
    if _table_exists("chat_history"):
        op.drop_index("ix_chat_history_child_session_created_at", table_name="chat_history")
        op.drop_index("ix_chat_history_created_at", table_name="chat_history")
        op.drop_index("ix_chat_history_session_id", table_name="chat_history")
        op.drop_index("ix_chat_history_child_id", table_name="chat_history")
        op.drop_index("ix_chat_history_id", table_name="chat_history")
        op.drop_table("chat_history")
