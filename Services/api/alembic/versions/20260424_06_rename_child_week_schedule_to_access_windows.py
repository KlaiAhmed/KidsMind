"""rename_child_week_schedule_to_access_windows

Revision ID: 20260424_06
Revises: 20260424_05
Create Date: 2026-04-24 10:25:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "20260424_06"
down_revision: Union[str, Sequence[str], None] = "20260424_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


OLD_TABLE = "child_week_schedule"
NEW_TABLE = "access_windows"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _rename_constraint_if_exists(table_name: str, old_name: str, new_name: str) -> None:
    inspector = inspect(op.get_bind())
    if table_name not in inspector.get_table_names():
        return

    existing_names = {
        constraint["name"]
        for constraint in inspector.get_check_constraints(table_name)
        if constraint.get("name")
    }
    existing_names.update(
        constraint["name"]
        for constraint in inspector.get_unique_constraints(table_name)
        if constraint.get("name")
    )
    existing_names.update(
        constraint["name"]
        for constraint in inspector.get_foreign_keys(table_name)
        if constraint.get("name")
    )

    if old_name in existing_names and new_name not in existing_names:
        op.execute(sa.text(f"ALTER TABLE {table_name} RENAME CONSTRAINT {old_name} TO {new_name}"))


def _rename_index_if_exists(old_name: str, new_name: str) -> None:
    bind = op.get_bind()
    index_exists = bind.execute(sa.text("SELECT to_regclass(:index_name)"), {"index_name": old_name}).scalar()
    new_exists = bind.execute(sa.text("SELECT to_regclass(:index_name)"), {"index_name": new_name}).scalar()
    if index_exists and not new_exists:
        op.execute(sa.text(f"ALTER INDEX {old_name} RENAME TO {new_name}"))


def upgrade() -> None:
    if not _table_exists(OLD_TABLE) or _table_exists(NEW_TABLE):
        return

    op.rename_table(OLD_TABLE, NEW_TABLE)

    _rename_constraint_if_exists(
        NEW_TABLE,
        "ck_child_week_schedule_day_of_week",
        "ck_access_windows_day_of_week",
    )
    _rename_constraint_if_exists(
        NEW_TABLE,
        "ck_child_week_schedule_daily_cap_seconds",
        "ck_access_windows_daily_cap_seconds",
    )
    _rename_constraint_if_exists(
        NEW_TABLE,
        "uq_child_week_schedule_child_profile_id_day_of_week",
        "uq_access_windows_child_profile_id_day_of_week",
    )
    _rename_constraint_if_exists(
        NEW_TABLE,
        "fk_child_week_schedule_child_profile_id_child_profiles",
        "fk_access_windows_child_profile_id_child_profiles",
    )

    _rename_index_if_exists("child_week_schedule_pkey", "access_windows_pkey")


def downgrade() -> None:
    if not _table_exists(NEW_TABLE):
        return

    op.rename_table(NEW_TABLE, OLD_TABLE)

    _rename_constraint_if_exists(
        OLD_TABLE,
        "ck_access_windows_day_of_week",
        "ck_child_week_schedule_day_of_week",
    )
    _rename_constraint_if_exists(
        OLD_TABLE,
        "ck_access_windows_daily_cap_seconds",
        "ck_child_week_schedule_daily_cap_seconds",
    )
    _rename_constraint_if_exists(
        OLD_TABLE,
        "uq_access_windows_child_profile_id_day_of_week",
        "uq_child_week_schedule_child_profile_id_day_of_week",
    )
    _rename_constraint_if_exists(
        OLD_TABLE,
        "fk_access_windows_child_profile_id_child_profiles",
        "fk_child_week_schedule_child_profile_id_child_profiles",
    )

    _rename_index_if_exists("access_windows_pkey", "child_week_schedule_pkey")
