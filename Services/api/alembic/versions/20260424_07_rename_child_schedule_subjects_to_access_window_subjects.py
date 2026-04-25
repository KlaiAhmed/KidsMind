"""rename_child_schedule_subjects_to_access_window_subjects

Revision ID: 20260424_07
Revises: 20260424_06
Create Date: 2026-04-24 10:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260424_07"
down_revision: Union[str, Sequence[str], None] = "20260424_06"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_TABLE = "child_schedule_subjects"
NEW_TABLE = "access_window_subjects"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _index_exists(index_name: str) -> bool:
    return bool(op.get_bind().execute(sa.text("SELECT to_regclass(:index_name)"), {"index_name": index_name}).scalar())


def _foreign_key_names(table_name: str, constrained_column: str) -> list[str]:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return []
    return [
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys(table_name)
        if foreign_key.get("name") and foreign_key.get("constrained_columns") == [constrained_column]
    ]


def _rename_unique_constraint_if_exists(table_name: str, old_name: str, new_name: str) -> None:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return

    existing_names = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints(table_name)
        if constraint.get("name")
    }
    if old_name in existing_names and new_name not in existing_names:
        op.execute(sa.text(f"ALTER TABLE {table_name} RENAME CONSTRAINT {old_name} TO {new_name}"))


def upgrade() -> None:
    if not _table_exists(OLD_TABLE) or _table_exists(NEW_TABLE):
        return

    op.rename_table(OLD_TABLE, NEW_TABLE)

    for foreign_key_name in _foreign_key_names(NEW_TABLE, "schedule_id"):
        op.drop_constraint(foreign_key_name, NEW_TABLE, type_="foreignkey")

    op.alter_column(
        NEW_TABLE,
        "schedule_id",
        existing_type=postgresql.UUID(as_uuid=True),
        new_column_name="access_window_id",
    )

    _rename_unique_constraint_if_exists(
        NEW_TABLE,
        "uq_child_schedule_subjects_schedule_id_subject",
        "uq_access_window_subjects_access_window_id_subject",
    )

    op.create_foreign_key(
        "fk_access_window_subjects_access_window_id_access_windows",
        NEW_TABLE,
        "access_windows",
        ["access_window_id"],
        ["id"],
        ondelete="CASCADE",
    )

    if _index_exists("child_schedule_subjects_pkey") and not _index_exists("access_window_subjects_pkey"):
        op.execute(sa.text("ALTER INDEX child_schedule_subjects_pkey RENAME TO access_window_subjects_pkey"))


def downgrade() -> None:
    if not _table_exists(NEW_TABLE):
        return

    for foreign_key_name in _foreign_key_names(NEW_TABLE, "access_window_id"):
        op.drop_constraint(foreign_key_name, NEW_TABLE, type_="foreignkey")

    _rename_unique_constraint_if_exists(
        NEW_TABLE,
        "uq_access_window_subjects_access_window_id_subject",
        "uq_child_schedule_subjects_schedule_id_subject",
    )

    op.alter_column(
        NEW_TABLE,
        "access_window_id",
        existing_type=postgresql.UUID(as_uuid=True),
        new_column_name="schedule_id",
    )

    op.rename_table(NEW_TABLE, OLD_TABLE)

    op.create_foreign_key(
        "fk_child_schedule_subjects_schedule_id_child_week_schedule",
        OLD_TABLE,
        "child_week_schedule",
        ["schedule_id"],
        ["id"],
        ondelete="CASCADE",
    )

    if _index_exists("access_window_subjects_pkey") and not _index_exists("child_schedule_subjects_pkey"):
        op.execute(sa.text("ALTER INDEX access_window_subjects_pkey RENAME TO child_schedule_subjects_pkey"))
