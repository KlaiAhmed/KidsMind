"""chat_history_role_to_enum

Revision ID: 20260424_10
Revises: 20260424_09
Create Date: 2026-04-24 10:45:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260424_10"
down_revision: Union[str, Sequence[str], None] = "20260424_09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "chat_history"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _role_is_chat_history_enum() -> bool:
    inspector = inspect(op.get_bind())
    if TABLE_NAME not in inspector.get_table_names():
        return False

    for column in inspector.get_columns(TABLE_NAME):
        if column["name"] == "role":
            return getattr(column["type"], "name", None) == "chat_history_role"
    return False


def upgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    if _role_is_chat_history_enum():
        return

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM chat_history
                    WHERE lower(trim(role::text)) NOT IN ('user', 'assistant')
                ) THEN
                    RAISE EXCEPTION 'Unexpected role values found — migration aborted';
                END IF;
            END $$;
            """
        )
    )
    op.execute(sa.text("UPDATE chat_history SET role = lower(trim(role::text))"))
    op.execute(sa.text("CREATE TYPE chat_history_role AS ENUM ('user', 'assistant')"))
    op.alter_column(
        TABLE_NAME,
        "role",
        existing_type=sa.String(length=16),
        type_=sa.Enum("user", "assistant", name="chat_history_role"),
        postgresql_using="role::chat_history_role",
    )


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    op.alter_column(
        TABLE_NAME,
        "role",
        existing_type=sa.Enum("user", "assistant", name="chat_history_role"),
        type_=sa.String(length=16),
        postgresql_using="role::text",
    )
    op.execute(sa.text("DROP TYPE IF EXISTS chat_history_role"))
