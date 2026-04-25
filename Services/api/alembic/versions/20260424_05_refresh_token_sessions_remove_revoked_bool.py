"""refresh_token_sessions_remove_revoked_bool

Revision ID: 20260424_05
Revises: 20260424_04
Create Date: 2026-04-24 10:20:00.000000

NOTE: The backfill on line 57 sets revoked_at = updated_at for rows where
revoked=true but revoked_at is NULL.  This is an approximation — updated_at
is the last write timestamp, not the exact revocation moment.  The true
revocation time was never recorded before this migration, so updated_at is
the closest available value.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260424_05"
down_revision: Union[str, Sequence[str], None] = "20260424_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "refresh_token_sessions"


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
    if not _table_exists(TABLE_NAME):
        return

    columns = _column_names(TABLE_NAME)
    if "revoked" not in columns:
        return

    op.execute(
        sa.text(
            f"""
            UPDATE {TABLE_NAME}
            SET revoked_at = updated_at
            WHERE revoked = true AND revoked_at IS NULL
            """
        )
    )

    indexes = _index_names(TABLE_NAME)
    if "ix_refresh_token_sessions_user_family_revoked" in indexes:
        op.drop_index("ix_refresh_token_sessions_user_family_revoked", table_name=TABLE_NAME)
    if "ix_refresh_token_sessions_user_kind_revoked" in indexes:
        op.drop_index("ix_refresh_token_sessions_user_kind_revoked", table_name=TABLE_NAME)

    op.drop_column(TABLE_NAME, "revoked")

    indexes = _index_names(TABLE_NAME)
    if "ix_refresh_token_sessions_user_family" not in indexes:
        op.create_index("ix_refresh_token_sessions_user_family", TABLE_NAME, ["user_id", "family_id"], unique=False)
    if "ix_refresh_token_sessions_user_kind" not in indexes:
        op.create_index("ix_refresh_token_sessions_user_kind", TABLE_NAME, ["user_id", "client_kind"], unique=False)


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    columns = _column_names(TABLE_NAME)
    if "revoked" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("revoked", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )

    op.execute(sa.text(f"UPDATE {TABLE_NAME} SET revoked = (revoked_at IS NOT NULL)"))

    op.alter_column(
        TABLE_NAME,
        "revoked",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )

    indexes = _index_names(TABLE_NAME)
    if "ix_refresh_token_sessions_user_family" in indexes:
        op.drop_index("ix_refresh_token_sessions_user_family", table_name=TABLE_NAME)
    if "ix_refresh_token_sessions_user_kind" in indexes:
        op.drop_index("ix_refresh_token_sessions_user_kind", table_name=TABLE_NAME)
    if "ix_refresh_token_sessions_user_family_revoked" not in _index_names(TABLE_NAME):
        op.create_index(
            "ix_refresh_token_sessions_user_family_revoked",
            TABLE_NAME,
            ["user_id", "family_id", "revoked"],
            unique=False,
        )
    if "ix_refresh_token_sessions_user_kind_revoked" not in _index_names(TABLE_NAME):
        op.create_index(
            "ix_refresh_token_sessions_user_kind_revoked",
            TABLE_NAME,
            ["user_id", "client_kind", "revoked"],
            unique=False,
        )
