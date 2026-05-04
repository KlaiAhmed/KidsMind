"""add_flagged_chat_history_index

Revision ID: 20260504_03
Revises: 20260504_02
Create Date: 2026-05-04 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect


revision: str = "20260504_03"
down_revision: Union[str, Sequence[str], None] = "20260504_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "chat_history"
INDEX_NAME = "ix_chat_history_session_flagged"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    if _table_exists(TABLE_NAME) and INDEX_NAME not in _index_names(TABLE_NAME):
        op.create_index(INDEX_NAME, TABLE_NAME, ["session_id", "is_flagged"], unique=False)


def downgrade() -> None:
    if _table_exists(TABLE_NAME) and INDEX_NAME in _index_names(TABLE_NAME):
        op.drop_index(INDEX_NAME, table_name=TABLE_NAME)
