"""chat_history_link_to_chat_sessions

Revision ID: 20260424_09
Revises: 20260424_08
Create Date: 2026-04-24 10:40:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260424_09"
down_revision: Union[str, Sequence[str], None] = "20260424_08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "chat_history"
LEGACY_MAP_TABLE = "chat_history_legacy_session_map"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _foreign_key_names(table_name: str, constrained_column: str, referred_table: str) -> list[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return []
    return [
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys(table_name)
        if foreign_key.get("name")
        and foreign_key.get("referred_table") == referred_table
        and foreign_key.get("constrained_columns") == [constrained_column]
    ]


def upgrade() -> None:
    if not (_table_exists(TABLE_NAME) and _table_exists("chat_sessions")):
        return

    columns = _column_names(TABLE_NAME)
    if "child_id" not in columns or "session_id" not in columns:
        return

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM chat_history
                    WHERE child_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                ) THEN
                    RAISE EXCEPTION 'chat_history contains non-UUID child_id values — migration aborted';
                END IF;
            END $$;
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            CREATE TABLE IF NOT EXISTS {LEGACY_MAP_TABLE} (
                chat_session_id UUID NOT NULL,
                legacy_child_id TEXT NOT NULL,
                legacy_session_key TEXT NOT NULL,
                PRIMARY KEY (legacy_child_id, legacy_session_key)
            )
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO {LEGACY_MAP_TABLE} (chat_session_id, legacy_child_id, legacy_session_key)
            SELECT gen_random_uuid(), child_id, session_id
            FROM (
                SELECT DISTINCT child_id, session_id
                FROM chat_history
            ) AS sub
            ON CONFLICT (legacy_child_id, legacy_session_key) DO NOTHING
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            INSERT INTO chat_sessions (id, child_profile_id, started_at, ended_at)
            SELECT
                mapping.chat_session_id,
                CAST(mapping.legacy_child_id AS UUID),
                MIN(chat_history.created_at),
                MAX(chat_history.created_at)
            FROM {LEGACY_MAP_TABLE} AS mapping
            JOIN chat_history
              ON chat_history.child_id = mapping.legacy_child_id
             AND chat_history.session_id = mapping.legacy_session_key
            GROUP BY mapping.chat_session_id, mapping.legacy_child_id
            ON CONFLICT (id) DO NOTHING
            """
        )
    )

    if "chat_session_id" not in _column_names(TABLE_NAME):
        op.add_column(TABLE_NAME, sa.Column("chat_session_id", postgresql.UUID(as_uuid=True), nullable=True))

    op.execute(
        sa.text(
            f"""
            UPDATE chat_history AS history
            SET chat_session_id = mapping.chat_session_id
            FROM {LEGACY_MAP_TABLE} AS mapping
            WHERE history.child_id = mapping.legacy_child_id
              AND history.session_id = mapping.legacy_session_key
            """
        )
    )

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM chat_history
                    WHERE chat_session_id IS NULL
                ) THEN
                    RAISE EXCEPTION 'chat_history.chat_session_id backfill produced NULL values — migration aborted';
                END IF;
            END $$;
            """
        )
    )

    op.alter_column(
        TABLE_NAME,
        "chat_session_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    if not _foreign_key_names(TABLE_NAME, "chat_session_id", "chat_sessions"):
        op.create_foreign_key(
            "fk_chat_history_chat_session_id_chat_sessions",
            TABLE_NAME,
            "chat_sessions",
            ["chat_session_id"],
            ["id"],
            ondelete="CASCADE",
        )

    if "ix_chat_history_session_created_at" not in _index_names(TABLE_NAME):
        op.create_index(
            "ix_chat_history_session_created_at",
            TABLE_NAME,
            ["chat_session_id", "created_at"],
            unique=False,
        )

    if "ix_chat_history_child_session_created_at" in _index_names(TABLE_NAME):
        op.drop_index("ix_chat_history_child_session_created_at", table_name=TABLE_NAME)

    op.drop_column(TABLE_NAME, "child_id")
    op.drop_column(TABLE_NAME, "session_id")
    op.alter_column(
        TABLE_NAME,
        "chat_session_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        new_column_name="session_id",
    )


def downgrade() -> None:
    if not (_table_exists(TABLE_NAME) and _table_exists(LEGACY_MAP_TABLE)):
        return

    columns = _column_names(TABLE_NAME)
    if "child_id" not in columns:
        op.add_column(TABLE_NAME, sa.Column("child_id", sa.Text(), nullable=True))
    if "legacy_session_id" not in columns:
        op.add_column(TABLE_NAME, sa.Column("legacy_session_id", sa.Text(), nullable=True))

    op.execute(
        sa.text(
            f"""
            UPDATE chat_history AS history
            SET
                child_id = mapping.legacy_child_id,
                legacy_session_id = mapping.legacy_session_key
            FROM {LEGACY_MAP_TABLE} AS mapping
            WHERE history.session_id = mapping.chat_session_id
            """
        )
    )

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM chat_history
                    WHERE child_id IS NULL OR legacy_session_id IS NULL
                ) THEN
                    RAISE EXCEPTION 'chat_history legacy columns could not be fully restored — downgrade aborted';
                END IF;
            END $$;
            """
        )
    )

    op.alter_column(TABLE_NAME, "child_id", existing_type=sa.Text(), nullable=False)
    op.alter_column(TABLE_NAME, "legacy_session_id", existing_type=sa.Text(), nullable=False)

    for foreign_key_name in _foreign_key_names(TABLE_NAME, "session_id", "chat_sessions"):
        op.drop_constraint(foreign_key_name, TABLE_NAME, type_="foreignkey")

    if "ix_chat_history_session_created_at" in _index_names(TABLE_NAME):
        op.drop_index("ix_chat_history_session_created_at", table_name=TABLE_NAME)

    op.alter_column(
        TABLE_NAME,
        "session_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        new_column_name="chat_session_id",
    )
    op.alter_column(
        TABLE_NAME,
        "legacy_session_id",
        existing_type=sa.Text(),
        existing_nullable=False,
        new_column_name="session_id",
    )

    if "ix_chat_history_child_id" not in _index_names(TABLE_NAME):
        op.create_index("ix_chat_history_child_id", TABLE_NAME, ["child_id"], unique=False)
    if "ix_chat_history_session_id" not in _index_names(TABLE_NAME):
        op.create_index("ix_chat_history_session_id", TABLE_NAME, ["session_id"], unique=False)
    if "ix_chat_history_child_session_created_at" not in _index_names(TABLE_NAME):
        op.create_index(
            "ix_chat_history_child_session_created_at",
            TABLE_NAME,
            ["child_id", "session_id", "created_at"],
            unique=False,
        )

    op.drop_column(TABLE_NAME, "chat_session_id")
    op.execute(sa.text(f"DROP TABLE {LEGACY_MAP_TABLE}"))
