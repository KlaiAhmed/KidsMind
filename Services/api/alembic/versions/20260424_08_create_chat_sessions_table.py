"""create_chat_sessions_table

Revision ID: 20260424_08
Revises: 20260424_07
Create Date: 2026-04-24 10:35:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260424_08"
down_revision: Union[str, Sequence[str], None] = "20260424_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "chat_sessions"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _table_exists(TABLE_NAME):
        return

    op.create_table(
        TABLE_NAME,
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("child_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("access_window_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["access_window_id"], ["access_windows.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["child_profile_id"], ["child_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_sessions_child_profile_id", TABLE_NAME, ["child_profile_id"], unique=False)
    op.create_index("ix_chat_sessions_access_window_id", TABLE_NAME, ["access_window_id"], unique=False)
    op.create_index(
        "ix_chat_sessions_child_profile_started_at",
        TABLE_NAME,
        ["child_profile_id", "started_at"],
        unique=False,
    )


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    op.drop_index("ix_chat_sessions_child_profile_started_at", table_name=TABLE_NAME)
    op.drop_index("ix_chat_sessions_access_window_id", table_name=TABLE_NAME)
    op.drop_index("ix_chat_sessions_child_profile_id", table_name=TABLE_NAME)
    op.drop_table(TABLE_NAME)
