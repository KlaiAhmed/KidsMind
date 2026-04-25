"""add_badges_notification_prefs_and_is_paused

Revision ID: 20260425_01
Revises: 20260424_10
Create Date: 2026-04-25 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260425_01"
down_revision: Union[str, Sequence[str], None] = "20260424_10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return False
    return column_name in [c["name"] for c in inspector.get_columns(table_name)]


def upgrade() -> None:
    if not _table_exists("badges"):
        op.create_table(
            "badges",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("condition", sa.String(512), nullable=True),
            sa.Column("icon_key", sa.String(128), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_badges_id", "badges", ["id"], unique=False)

    if not _table_exists("child_badges"):
        op.create_table(
            "child_badges",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("child_profile_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("badge_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("earned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("earned_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("progress_percent", sa.Float(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["child_profile_id"], ["child_profiles.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["badge_id"], ["badges.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_child_badges_id", "child_badges", ["id"], unique=False)
        op.create_index("ix_child_badges_child_profile_id", "child_badges", ["child_profile_id"], unique=False)
        op.create_index("ix_child_badges_badge_id", "child_badges", ["badge_id"], unique=False)

    if not _table_exists("parent_notification_prefs"):
        op.create_table(
            "parent_notification_prefs",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
            sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("daily_summary_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("safety_alerts_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("weekly_report_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("session_start_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("session_end_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("streak_milestone_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("email_channel", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("push_channel", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["parent_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_parent_notification_prefs_id", "parent_notification_prefs", ["id"], unique=False)
        op.create_index("ix_parent_notification_prefs_parent_id", "parent_notification_prefs", ["parent_id"], unique=True)

    if not _column_exists("child_profiles", "is_paused"):
        op.add_column("child_profiles", sa.Column("is_paused", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    if _column_exists("child_profiles", "is_paused"):
        op.drop_column("child_profiles", "is_paused")

    if _table_exists("parent_notification_prefs"):
        op.drop_index("ix_parent_notification_prefs_parent_id", table_name="parent_notification_prefs")
        op.drop_index("ix_parent_notification_prefs_id", table_name="parent_notification_prefs")
        op.drop_table("parent_notification_prefs")

    if _table_exists("child_badges"):
        op.drop_index("ix_child_badges_badge_id", table_name="child_badges")
        op.drop_index("ix_child_badges_child_profile_id", table_name="child_badges")
        op.drop_index("ix_child_badges_id", table_name="child_badges")
        op.drop_table("child_badges")

    if _table_exists("badges"):
        op.drop_index("ix_badges_id", table_name="badges")
        op.drop_table("badges")
