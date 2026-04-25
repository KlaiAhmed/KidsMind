"""add_unique_open_chat_session_index

Revision ID: 20260425_02
Revises: 20260425_01
Create Date: 2026-04-25 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260425_02"
down_revision: Union[str, Sequence[str], None] = "20260425_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "chat_sessions"
INDEX_NAME = "uq_chat_sessions_open_child_access_window"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return
    if INDEX_NAME not in _index_names(TABLE_NAME):
        op.execute(
            sa.text(
                f"""
                CREATE UNIQUE INDEX {INDEX_NAME}
                ON {TABLE_NAME} (child_profile_id, access_window_id)
                WHERE ended_at IS NULL
                """
            )
        )


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return
    if INDEX_NAME in _index_names(TABLE_NAME):
        op.execute(sa.text(f"DROP INDEX {INDEX_NAME}"))
