"""child_profiles_remove_languages_column

Revision ID: 20260424_03
Revises: 20260424_02
Create Date: 2026-04-24 10:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260424_03"
down_revision: Union[str, Sequence[str], None] = "20260424_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "child_profiles"
BACKUP_TABLE = "child_profiles_languages_backup"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    columns = _column_names(TABLE_NAME)
    if "languages" not in columns:
        return

    op.execute(sa.text(f"DROP TABLE IF EXISTS {BACKUP_TABLE}"))
    op.execute(
        sa.text(
            f"""
            CREATE TABLE {BACKUP_TABLE} AS
            SELECT id, languages
            FROM {TABLE_NAME}
            """
        )
    )
    op.drop_column(TABLE_NAME, "languages")


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    columns = _column_names(TABLE_NAME)
    if "languages" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("languages", sa.JSON(), nullable=True, server_default=sa.text("'[]'::json")),
        )

    if _table_exists(BACKUP_TABLE):
        op.execute(
            sa.text(
                f"""
                UPDATE {TABLE_NAME} AS child_profiles
                SET languages = backup.languages
                FROM {BACKUP_TABLE} AS backup
                WHERE child_profiles.id = backup.id
                """
            )
        )

    op.execute(
        sa.text(
            f"""
            UPDATE {TABLE_NAME} AS child_profiles
            SET languages = to_json(ARRAY[child_rules.default_language])
            FROM child_rules
            WHERE child_profiles.id = child_rules.child_profile_id
              AND child_rules.default_language IS NOT NULL
              AND (
                  child_profiles.languages IS NULL
                  OR child_profiles.languages = '[]'::json
              )
            """
        )
    )
    op.execute(sa.text(f"UPDATE {TABLE_NAME} SET languages = COALESCE(languages, '[]'::json)"))

    op.alter_column(
        TABLE_NAME,
        "languages",
        existing_type=sa.JSON(),
        nullable=False,
        server_default=sa.text("'[]'::json"),
    )

    if _table_exists(BACKUP_TABLE):
        op.execute(sa.text(f"DROP TABLE {BACKUP_TABLE}"))
