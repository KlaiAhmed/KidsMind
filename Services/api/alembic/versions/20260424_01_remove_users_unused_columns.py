"""remove_users_unused_columns

Revision ID: 20260424_01
Revises: 20260421_03
Create Date: 2026-04-24 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260424_01"
down_revision: Union[str, Sequence[str], None] = "20260421_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLE_NAME = "users"
BACKUP_TABLE = "users_removed_columns_backup"
REMOVED_COLUMNS = (
    "is_verified",
    "consent_data_processing",
    "consent_analytics",
    "consent_given_at",
    "mfa_enabled",
    "mfa_secret",
    "email_changed_at",
    "mfa_changed_at",
    "default_language",
)


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
    if not all(column in columns for column in REMOVED_COLUMNS):
        return

    op.execute(sa.text(f"DROP TABLE IF EXISTS {BACKUP_TABLE}"))
    op.execute(
        sa.text(
            f"""
            CREATE TABLE {BACKUP_TABLE} AS
            SELECT
                id,
                is_verified,
                consent_data_processing,
                consent_analytics,
                consent_given_at,
                mfa_enabled,
                mfa_secret,
                email_changed_at,
                mfa_changed_at,
                default_language
            FROM {TABLE_NAME}
            """
        )
    )

    for column in REMOVED_COLUMNS:
        op.drop_column(TABLE_NAME, column)


def downgrade() -> None:
    if not _table_exists(TABLE_NAME):
        return

    columns = _column_names(TABLE_NAME)

    if "is_verified" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("is_verified", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )
    if "consent_data_processing" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("consent_data_processing", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )
    if "consent_analytics" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("consent_analytics", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )
    if "consent_given_at" not in columns:
        op.add_column(TABLE_NAME, sa.Column("consent_given_at", sa.DateTime(), nullable=True))
    if "mfa_enabled" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("mfa_enabled", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        )
    if "mfa_secret" not in columns:
        op.add_column(TABLE_NAME, sa.Column("mfa_secret", sa.String(length=255), nullable=True))
    if "email_changed_at" not in columns:
        op.add_column(TABLE_NAME, sa.Column("email_changed_at", sa.DateTime(timezone=True), nullable=True))
    if "mfa_changed_at" not in columns:
        op.add_column(TABLE_NAME, sa.Column("mfa_changed_at", sa.DateTime(timezone=True), nullable=True))
    if "default_language" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("default_language", sa.String(length=10), nullable=True, server_default=sa.text("'fr'")),
        )

    if _table_exists(BACKUP_TABLE):
        op.execute(
            sa.text(
                f"""
                UPDATE {TABLE_NAME} AS users
                SET
                    is_verified = backup.is_verified,
                    consent_data_processing = backup.consent_data_processing,
                    consent_analytics = backup.consent_analytics,
                    consent_given_at = backup.consent_given_at,
                    mfa_enabled = backup.mfa_enabled,
                    mfa_secret = backup.mfa_secret,
                    email_changed_at = backup.email_changed_at,
                    mfa_changed_at = backup.mfa_changed_at,
                    default_language = backup.default_language
                FROM {BACKUP_TABLE} AS backup
                WHERE users.id = backup.id
                """
            )
        )

    op.execute(
        sa.text(
            f"""
            UPDATE {TABLE_NAME}
            SET
                is_verified = COALESCE(is_verified, false),
                consent_data_processing = COALESCE(consent_data_processing, false),
                mfa_enabled = COALESCE(mfa_enabled, false),
                default_language = COALESCE(default_language, 'fr')
            """
        )
    )

    op.alter_column(
        TABLE_NAME,
        "is_verified",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )
    op.alter_column(
        TABLE_NAME,
        "consent_data_processing",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )
    op.alter_column(
        TABLE_NAME,
        "consent_analytics",
        existing_type=sa.Boolean(),
        nullable=True,
        server_default=sa.text("false"),
    )
    op.alter_column(
        TABLE_NAME,
        "mfa_enabled",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )
    op.alter_column(
        TABLE_NAME,
        "default_language",
        existing_type=sa.String(length=10),
        nullable=False,
        server_default=sa.text("'fr'"),
    )

    if _table_exists(BACKUP_TABLE):
        op.execute(sa.text(f"DROP TABLE {BACKUP_TABLE}"))
