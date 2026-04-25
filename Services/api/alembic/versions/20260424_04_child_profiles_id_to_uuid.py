"""child_profiles_id_to_uuid

Revision ID: 20260424_04
Revises: 20260424_03
Create Date: 2026-04-24 10:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


revision: str = "20260424_04"
down_revision: Union[str, Sequence[str], None] = "20260424_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


CHILD_PROFILES_TABLE = "child_profiles"
MAP_TABLE = "child_profiles_id_map"
DOWNSTREAM_TABLES = (
    ("child_rules", "child_profile_id"),
    ("child_allowed_subjects", "child_profile_id"),
    ("child_week_schedule", "child_profile_id"),
)


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _column_type(table_name: str, column_name: str) -> sa.types.TypeEngine | None:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return None
    for column in inspector.get_columns(table_name):
        if column["name"] == column_name:
            return column["type"]
    return None


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _primary_key_name(table_name: str) -> str | None:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return None
    return inspector.get_pk_constraint(table_name).get("name")


def _foreign_key_names(table_name: str, constrained_column: str, referred_table: str) -> list[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return []
    return [
        foreign_key["name"]
        for foreign_key in inspector.get_foreign_keys(table_name)
        if foreign_key.get("name")
        and foreign_key.get("referred_table") == referred_table
        and foreign_key.get("constrained_columns") == [constrained_column]
    ]


def _drop_foreign_keys(table_name: str, constrained_column: str, referred_table: str) -> None:
    for foreign_key_name in _foreign_key_names(table_name, constrained_column, referred_table):
        op.drop_constraint(foreign_key_name, table_name, type_="foreignkey")


def _drop_constraint_if_exists(table_name: str, constraint_name: str, constraint_type: str) -> None:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return

    existing_names: set[str] = set()
    if constraint_type == "unique":
        existing_names = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints(table_name)
            if constraint.get("name")
        }
    elif constraint_type == "foreignkey":
        existing_names = {
            constraint["name"]
            for constraint in inspector.get_foreign_keys(table_name)
            if constraint.get("name")
        }

    if constraint_name in existing_names:
        op.drop_constraint(constraint_name, table_name, type_=constraint_type)


def _serial_sequence_name(table_name: str, column_name: str) -> str | None:
    return op.get_bind().execute(
        sa.text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
        {"table_name": table_name, "column_name": column_name},
    ).scalar()


def _is_uuid_column(table_name: str, column_name: str) -> bool:
    column_type = _column_type(table_name, column_name)
    return isinstance(column_type, postgresql.UUID)


def upgrade() -> None:
    if not _table_exists(CHILD_PROFILES_TABLE):
        return

    if _is_uuid_column(CHILD_PROFILES_TABLE, "id"):
        # Explicit no-op: child_profiles.id is already UUID at the current head schema.
        return

    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))
    op.execute(
        sa.text(
            f"""
            CREATE TABLE IF NOT EXISTS {MAP_TABLE} (
                old_id INTEGER PRIMARY KEY,
                new_id UUID NOT NULL DEFAULT gen_random_uuid()
            )
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_{MAP_TABLE}_new_id'
                      AND conrelid = '{MAP_TABLE}'::regclass
                ) THEN
                    ALTER TABLE {MAP_TABLE}
                    ADD CONSTRAINT uq_{MAP_TABLE}_new_id UNIQUE (new_id);
                END IF;
            END $$;
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO {MAP_TABLE} (old_id)
            SELECT id
            FROM {CHILD_PROFILES_TABLE}
            ON CONFLICT (old_id) DO NOTHING
            """
        )
    )

    child_profiles_sequence = _serial_sequence_name(CHILD_PROFILES_TABLE, "id")

    if "new_id" not in _column_names(CHILD_PROFILES_TABLE):
        op.add_column(
            CHILD_PROFILES_TABLE,
            sa.Column(
                "new_id",
                postgresql.UUID(as_uuid=True),
                nullable=False,
                server_default=sa.text("gen_random_uuid()"),
            ),
        )
    op.execute(
        sa.text(
            f"""
            UPDATE {CHILD_PROFILES_TABLE} AS child_profiles
            SET new_id = mapping.new_id
            FROM {MAP_TABLE} AS mapping
            WHERE child_profiles.id = mapping.old_id
            """
        )
    )

    for table_name, column_name in DOWNSTREAM_TABLES:
        if not _table_exists(table_name):
            continue
        new_column_name = f"new_{column_name}"
        if new_column_name not in _column_names(table_name):
            op.add_column(table_name, sa.Column(new_column_name, postgresql.UUID(as_uuid=True), nullable=True))
        op.execute(
            sa.text(
                f"""
                UPDATE {table_name} AS downstream
                SET {new_column_name} = mapping.new_id
                FROM {MAP_TABLE} AS mapping
                WHERE downstream.{column_name} = mapping.old_id
                """
            )
        )
        op.execute(
            sa.text(
                f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM {table_name}
                        WHERE {column_name} IS NOT NULL AND {new_column_name} IS NULL
                    ) THEN
                        RAISE EXCEPTION '{table_name}.{column_name} contains unmapped child_profiles.id values';
                    END IF;
                END $$;
                """
            )
        )

    _drop_constraint_if_exists("child_rules", "uq_child_rules_child_profile_id", "unique")
    for table_name, column_name in DOWNSTREAM_TABLES:
        _drop_foreign_keys(table_name, column_name, CHILD_PROFILES_TABLE)

    primary_key_name = _primary_key_name(CHILD_PROFILES_TABLE)
    if primary_key_name:
        op.drop_constraint(primary_key_name, CHILD_PROFILES_TABLE, type_="primary")

    if "ix_child_profiles_id" in _index_names(CHILD_PROFILES_TABLE):
        op.drop_index("ix_child_profiles_id", table_name=CHILD_PROFILES_TABLE)

    for table_name, column_name in DOWNSTREAM_TABLES:
        if _table_exists(table_name):
            op.drop_column(table_name, column_name)

    op.drop_column(CHILD_PROFILES_TABLE, "id")

    op.alter_column(
        CHILD_PROFILES_TABLE,
        "new_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        new_column_name="id",
    )
    for table_name, column_name in DOWNSTREAM_TABLES:
        if _table_exists(table_name):
            op.alter_column(
                table_name,
                f"new_{column_name}",
                existing_type=postgresql.UUID(as_uuid=True),
                existing_nullable=True,
                new_column_name=column_name,
            )
            op.alter_column(
                table_name,
                column_name,
                existing_type=postgresql.UUID(as_uuid=True),
                nullable=False,
            )

    op.create_primary_key("child_profiles_pkey", CHILD_PROFILES_TABLE, ["id"])
    op.create_index("ix_child_profiles_id", CHILD_PROFILES_TABLE, ["id"], unique=False)

    if _table_exists("child_rules"):
        op.create_unique_constraint("uq_child_rules_child_profile_id", "child_rules", ["child_profile_id"])
        op.create_foreign_key(
            "fk_child_rules_child_profile_id_child_profiles",
            "child_rules",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )
    if _table_exists("child_allowed_subjects"):
        op.create_foreign_key(
            "fk_child_allowed_subjects_child_profile_id_child_profiles",
            "child_allowed_subjects",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )
    if _table_exists("child_week_schedule"):
        op.create_foreign_key(
            "fk_child_week_schedule_child_profile_id_child_profiles",
            "child_week_schedule",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )

    if child_profiles_sequence:
        op.execute(sa.text(f"DROP SEQUENCE IF EXISTS {child_profiles_sequence}"))


def downgrade() -> None:
    if not _table_exists(CHILD_PROFILES_TABLE):
        return

    if not _table_exists(MAP_TABLE):
        # Explicit no-op: upgrade performed the UUID no-op path, so there is nothing to reverse.
        return

    op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS child_profiles_id_seq"))

    if "old_id" not in _column_names(CHILD_PROFILES_TABLE):
        op.add_column(CHILD_PROFILES_TABLE, sa.Column("old_id", sa.Integer(), nullable=True))
    op.execute(
        sa.text(
            f"""
            UPDATE {CHILD_PROFILES_TABLE} AS child_profiles
            SET old_id = mapping.old_id
            FROM {MAP_TABLE} AS mapping
            WHERE child_profiles.id = mapping.new_id
            """
        )
    )

    for table_name, column_name in DOWNSTREAM_TABLES:
        if not _table_exists(table_name):
            continue
        old_column_name = f"old_{column_name}"
        if old_column_name not in _column_names(table_name):
            op.add_column(table_name, sa.Column(old_column_name, sa.Integer(), nullable=True))
        op.execute(
            sa.text(
                f"""
                UPDATE {table_name} AS downstream
                SET {old_column_name} = mapping.old_id
                FROM {MAP_TABLE} AS mapping
                WHERE downstream.{column_name} = mapping.new_id
                """
            )
        )
        op.execute(
            sa.text(
                f"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM {table_name}
                        WHERE {old_column_name} IS NULL
                    ) THEN
                        RAISE EXCEPTION '{table_name}.{column_name} contains unmapped UUID values';
                    END IF;
                END $$;
                """
            )
        )

    _drop_constraint_if_exists("child_rules", "uq_child_rules_child_profile_id", "unique")
    for table_name, column_name in DOWNSTREAM_TABLES:
        _drop_foreign_keys(table_name, column_name, CHILD_PROFILES_TABLE)

    primary_key_name = _primary_key_name(CHILD_PROFILES_TABLE)
    if primary_key_name:
        op.drop_constraint(primary_key_name, CHILD_PROFILES_TABLE, type_="primary")

    if "ix_child_profiles_id" in _index_names(CHILD_PROFILES_TABLE):
        op.drop_index("ix_child_profiles_id", table_name=CHILD_PROFILES_TABLE)

    for table_name, column_name in DOWNSTREAM_TABLES:
        if _table_exists(table_name):
            op.drop_column(table_name, column_name)

    op.drop_column(CHILD_PROFILES_TABLE, "id")

    op.alter_column(
        CHILD_PROFILES_TABLE,
        "old_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        new_column_name="id",
    )
    op.alter_column(CHILD_PROFILES_TABLE, "id", existing_type=sa.Integer(), nullable=False)

    for table_name, column_name in DOWNSTREAM_TABLES:
        if _table_exists(table_name):
            op.alter_column(
                table_name,
                f"old_{column_name}",
                existing_type=sa.Integer(),
                existing_nullable=True,
                new_column_name=column_name,
            )
            op.alter_column(table_name, column_name, existing_type=sa.Integer(), nullable=False)

    op.execute(sa.text("ALTER TABLE child_profiles ALTER COLUMN id SET DEFAULT nextval('child_profiles_id_seq'::regclass)"))
    op.execute(sa.text("ALTER SEQUENCE child_profiles_id_seq OWNED BY child_profiles.id"))
    op.execute(
        sa.text(
            """
            SELECT setval(
                'child_profiles_id_seq',
                COALESCE((SELECT MAX(id) FROM child_profiles), 1),
                EXISTS (SELECT 1 FROM child_profiles)
            )
            """
        )
    )

    op.create_primary_key("child_profiles_pkey", CHILD_PROFILES_TABLE, ["id"])
    op.create_index("ix_child_profiles_id", CHILD_PROFILES_TABLE, ["id"], unique=False)

    if _table_exists("child_rules"):
        op.create_unique_constraint("uq_child_rules_child_profile_id", "child_rules", ["child_profile_id"])
        op.create_foreign_key(
            "fk_child_rules_child_profile_id_child_profiles",
            "child_rules",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )
    if _table_exists("child_allowed_subjects"):
        op.create_foreign_key(
            "fk_child_allowed_subjects_child_profile_id_child_profiles",
            "child_allowed_subjects",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )
    if _table_exists("child_week_schedule"):
        op.create_foreign_key(
            "fk_child_week_schedule_child_profile_id_child_profiles",
            "child_week_schedule",
            CHILD_PROFILES_TABLE,
            ["child_profile_id"],
            ["id"],
            ondelete="CASCADE",
        )

    op.execute(sa.text(f"DROP TABLE {MAP_TABLE}"))
