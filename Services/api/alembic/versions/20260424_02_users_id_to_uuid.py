"""users_id_to_uuid

Revision ID: 20260424_02
Revises: 20260424_01
Create Date: 2026-04-24 10:05:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# Audit findings before migrating users.id from INTEGER to UUID:
# - services/api/app/dependencies/auth.py resolves JWT `sub` and queries users with `int(user_id)`.
# - services/api/app/services/auth_service.py parses refresh payloads with `user_id = int(payload["sub"])`.
# - services/api/app/routers/chat.py types every `user_id` path parameter as `int`.
# - services/api/app/routers/admin_users.py types `user_id` and `parent_id` path parameters as `int`.
# - services/api/app/services/user_service.py, services/api/app/services/auth_service.py,
#   services/api/app/services/mobile_auth_service.py, services/api/app/services/child_profile_service.py,
#   and services/api/app/crud/crud_child_profiles.py all type user/parent identifiers as `int`.
# - services/api/app/schemas/auth_schema.py exposes `AuthUser.id: int`.
# - services/api/app/schemas/user_schema.py exposes `UserSummaryResponse.id: int`,
#   `UserFullResponse.id: int`, and `DeleteChildResponse.parent_id: int`.
# - services/api/app/schemas/child_profile_schema.py and services/api/app/schemas/safety_and_rules_schema.py
#   expose `parent_id: int`.


revision: str = "20260424_02"
down_revision: Union[str, Sequence[str], None] = "20260424_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


USERS_TABLE = "users"
CHILD_PROFILES_TABLE = "child_profiles"
REFRESH_TOKEN_SESSIONS_TABLE = "refresh_token_sessions"
MAP_TABLE = "users_id_map"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


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


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    if index_name in _index_names(table_name):
        op.drop_index(index_name, table_name=table_name)


def _drop_foreign_keys(table_name: str, constrained_column: str, referred_table: str) -> None:
    for foreign_key_name in _foreign_key_names(table_name, constrained_column, referred_table):
        op.drop_constraint(foreign_key_name, table_name, type_="foreignkey")


def _serial_sequence_name(table_name: str, column_name: str) -> str | None:
    return op.get_bind().execute(
        sa.text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
        {"table_name": table_name, "column_name": column_name},
    ).scalar()


def _is_uuid_column(table_name: str, column_name: str) -> bool:
    inspector = inspect(op.get_bind())
    if not _table_exists(table_name):
        return False
    for column in inspector.get_columns(table_name):
        if column["name"] == column_name:
            return isinstance(column["type"], postgresql.UUID)
    return False


def upgrade() -> None:
    if not (_table_exists(USERS_TABLE) and _table_exists(CHILD_PROFILES_TABLE) and _table_exists(REFRESH_TOKEN_SESSIONS_TABLE)):
        return

    if _is_uuid_column(USERS_TABLE, "id"):
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
            FROM {USERS_TABLE}
            ON CONFLICT (old_id) DO NOTHING
            """
        )
    )

    users_columns = _column_names(USERS_TABLE)
    child_profiles_columns = _column_names(CHILD_PROFILES_TABLE)
    refresh_columns = _column_names(REFRESH_TOKEN_SESSIONS_TABLE)
    users_sequence_name = _serial_sequence_name(USERS_TABLE, "id")

    if "new_id" not in users_columns:
        op.add_column(
            USERS_TABLE,
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
            UPDATE {USERS_TABLE} AS users
            SET new_id = mapping.new_id
            FROM {MAP_TABLE} AS mapping
            WHERE users.id = mapping.old_id
            """
        )
    )

    if "new_parent_id" not in child_profiles_columns:
        op.add_column(
            CHILD_PROFILES_TABLE,
            sa.Column("new_parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    op.execute(
        sa.text(
            f"""
            UPDATE {CHILD_PROFILES_TABLE} AS child_profiles
            SET new_parent_id = mapping.new_id
            FROM {MAP_TABLE} AS mapping
            WHERE child_profiles.parent_id = mapping.old_id
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
                    FROM {CHILD_PROFILES_TABLE}
                    WHERE parent_id IS NOT NULL AND new_parent_id IS NULL
                ) THEN
                    RAISE EXCEPTION 'child_profiles.parent_id contains unmapped users.id values';
                END IF;
            END $$;
            """
        )
    )

    if "new_user_id" not in refresh_columns:
        op.add_column(
            REFRESH_TOKEN_SESSIONS_TABLE,
            sa.Column("new_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        )
    op.execute(
        sa.text(
            f"""
            UPDATE {REFRESH_TOKEN_SESSIONS_TABLE} AS sessions
            SET new_user_id = mapping.new_id
            FROM {MAP_TABLE} AS mapping
            WHERE sessions.user_id = mapping.old_id
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
                    FROM {REFRESH_TOKEN_SESSIONS_TABLE}
                    WHERE user_id IS NOT NULL AND new_user_id IS NULL
                ) THEN
                    RAISE EXCEPTION 'refresh_token_sessions.user_id contains unmapped users.id values';
                END IF;
            END $$;
            """
        )
    )

    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_family_revoked")
    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_kind_revoked")
    _drop_index_if_exists(CHILD_PROFILES_TABLE, "ix_child_profiles_parent_id")
    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_id")
    _drop_index_if_exists(USERS_TABLE, "ix_users_id")

    _drop_foreign_keys(CHILD_PROFILES_TABLE, "parent_id", USERS_TABLE)
    _drop_foreign_keys(REFRESH_TOKEN_SESSIONS_TABLE, "user_id", USERS_TABLE)

    users_primary_key = _primary_key_name(USERS_TABLE)
    if users_primary_key:
        op.drop_constraint(users_primary_key, USERS_TABLE, type_="primary")

    op.drop_column(CHILD_PROFILES_TABLE, "parent_id")
    op.drop_column(REFRESH_TOKEN_SESSIONS_TABLE, "user_id")
    op.drop_column(USERS_TABLE, "id")

    op.alter_column(
        USERS_TABLE,
        "new_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        new_column_name="id",
    )
    op.alter_column(
        CHILD_PROFILES_TABLE,
        "new_parent_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=True,
        new_column_name="parent_id",
    )
    op.alter_column(
        REFRESH_TOKEN_SESSIONS_TABLE,
        "new_user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        existing_nullable=True,
        new_column_name="user_id",
    )

    op.alter_column(
        CHILD_PROFILES_TABLE,
        "parent_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        REFRESH_TOKEN_SESSIONS_TABLE,
        "user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.create_primary_key("users_pkey", USERS_TABLE, ["id"])
    op.create_foreign_key(
        "fk_child_profiles_parent_id_users",
        CHILD_PROFILES_TABLE,
        USERS_TABLE,
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_refresh_token_sessions_user_id_users",
        REFRESH_TOKEN_SESSIONS_TABLE,
        USERS_TABLE,
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    if "ix_users_id" not in _index_names(USERS_TABLE):
        op.create_index("ix_users_id", USERS_TABLE, ["id"], unique=False)
    if "ix_child_profiles_parent_id" not in _index_names(CHILD_PROFILES_TABLE):
        op.create_index("ix_child_profiles_parent_id", CHILD_PROFILES_TABLE, ["parent_id"], unique=False)
    if "ix_refresh_token_sessions_user_id" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
        op.create_index("ix_refresh_token_sessions_user_id", REFRESH_TOKEN_SESSIONS_TABLE, ["user_id"], unique=False)
    refresh_columns_post = _column_names(REFRESH_TOKEN_SESSIONS_TABLE)
    if "revoked" in refresh_columns_post:
        if "ix_refresh_token_sessions_user_family_revoked" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_family_revoked",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "family_id", "revoked"],
                unique=False,
            )
        if "ix_refresh_token_sessions_user_kind_revoked" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_kind_revoked",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "client_kind", "revoked"],
                unique=False,
            )
    else:
        if "ix_refresh_token_sessions_user_family" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_family",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "family_id"],
                unique=False,
            )
        if "ix_refresh_token_sessions_user_kind" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_kind",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "client_kind"],
                unique=False,
            )

    if users_sequence_name:
        op.execute(sa.text(f"DROP SEQUENCE IF EXISTS {users_sequence_name}"))

    # Conservatively retain users_id_map after upgrade so downgrade can restore
    # the original integer identifiers without any data loss.


def downgrade() -> None:
    if not (_table_exists(USERS_TABLE) and _table_exists(CHILD_PROFILES_TABLE) and _table_exists(REFRESH_TOKEN_SESSIONS_TABLE) and _table_exists(MAP_TABLE)):
        return

    users_columns = _column_names(USERS_TABLE)
    child_profiles_columns = _column_names(CHILD_PROFILES_TABLE)
    refresh_columns = _column_names(REFRESH_TOKEN_SESSIONS_TABLE)

    op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS users_id_seq"))

    if "old_id" not in users_columns:
        op.add_column(USERS_TABLE, sa.Column("old_id", sa.Integer(), nullable=True))
    if "old_parent_id" not in child_profiles_columns:
        op.add_column(CHILD_PROFILES_TABLE, sa.Column("old_parent_id", sa.Integer(), nullable=True))
    if "old_user_id" not in refresh_columns:
        op.add_column(REFRESH_TOKEN_SESSIONS_TABLE, sa.Column("old_user_id", sa.Integer(), nullable=True))

    op.execute(
        sa.text(
            f"""
            UPDATE {USERS_TABLE} AS users
            SET old_id = mapping.old_id
            FROM {MAP_TABLE} AS mapping
            WHERE users.id = mapping.new_id
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {CHILD_PROFILES_TABLE} AS child_profiles
            SET old_parent_id = mapping.old_id
            FROM {MAP_TABLE} AS mapping
            WHERE child_profiles.parent_id = mapping.new_id
            """
        )
    )
    op.execute(
        sa.text(
            f"""
            UPDATE {REFRESH_TOKEN_SESSIONS_TABLE} AS sessions
            SET old_user_id = mapping.old_id
            FROM {MAP_TABLE} AS mapping
            WHERE sessions.user_id = mapping.new_id
            """
        )
    )

    op.execute(
        sa.text(
            f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM {USERS_TABLE} WHERE old_id IS NULL) THEN
                    RAISE EXCEPTION 'users.id contains unmapped UUID values';
                END IF;
                IF EXISTS (SELECT 1 FROM {CHILD_PROFILES_TABLE} WHERE old_parent_id IS NULL) THEN
                    RAISE EXCEPTION 'child_profiles.parent_id contains unmapped UUID values';
                END IF;
                IF EXISTS (SELECT 1 FROM {REFRESH_TOKEN_SESSIONS_TABLE} WHERE old_user_id IS NULL) THEN
                    RAISE EXCEPTION 'refresh_token_sessions.user_id contains unmapped UUID values';
                END IF;
            END $$;
            """
        )
    )

    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_family_revoked")
    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_kind_revoked")
    _drop_index_if_exists(CHILD_PROFILES_TABLE, "ix_child_profiles_parent_id")
    _drop_index_if_exists(REFRESH_TOKEN_SESSIONS_TABLE, "ix_refresh_token_sessions_user_id")
    _drop_index_if_exists(USERS_TABLE, "ix_users_id")

    _drop_foreign_keys(CHILD_PROFILES_TABLE, "parent_id", USERS_TABLE)
    _drop_foreign_keys(REFRESH_TOKEN_SESSIONS_TABLE, "user_id", USERS_TABLE)

    users_primary_key = _primary_key_name(USERS_TABLE)
    if users_primary_key:
        op.drop_constraint(users_primary_key, USERS_TABLE, type_="primary")

    op.drop_column(CHILD_PROFILES_TABLE, "parent_id")
    op.drop_column(REFRESH_TOKEN_SESSIONS_TABLE, "user_id")
    op.drop_column(USERS_TABLE, "id")

    op.alter_column(
        USERS_TABLE,
        "old_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        new_column_name="id",
    )
    op.alter_column(
        CHILD_PROFILES_TABLE,
        "old_parent_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        new_column_name="parent_id",
    )
    op.alter_column(
        REFRESH_TOKEN_SESSIONS_TABLE,
        "old_user_id",
        existing_type=sa.Integer(),
        existing_nullable=True,
        new_column_name="user_id",
    )

    op.alter_column(USERS_TABLE, "id", existing_type=sa.Integer(), nullable=False)
    op.alter_column(CHILD_PROFILES_TABLE, "parent_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column(REFRESH_TOKEN_SESSIONS_TABLE, "user_id", existing_type=sa.Integer(), nullable=False)

    op.execute(sa.text("ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass)"))
    op.execute(sa.text("ALTER SEQUENCE users_id_seq OWNED BY users.id"))
    op.execute(
        sa.text(
            """
            SELECT setval(
                'users_id_seq',
                COALESCE((SELECT MAX(id) FROM users), 1),
                EXISTS (SELECT 1 FROM users)
            )
            """
        )
    )

    op.create_primary_key("users_pkey", USERS_TABLE, ["id"])
    op.create_foreign_key(
        "fk_child_profiles_parent_id_users",
        CHILD_PROFILES_TABLE,
        USERS_TABLE,
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_refresh_token_sessions_user_id_users",
        REFRESH_TOKEN_SESSIONS_TABLE,
        USERS_TABLE,
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )

    if "ix_users_id" not in _index_names(USERS_TABLE):
        op.create_index("ix_users_id", USERS_TABLE, ["id"], unique=False)
    if "ix_child_profiles_parent_id" not in _index_names(CHILD_PROFILES_TABLE):
        op.create_index("ix_child_profiles_parent_id", CHILD_PROFILES_TABLE, ["parent_id"], unique=False)
    if "ix_refresh_token_sessions_user_id" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
        op.create_index("ix_refresh_token_sessions_user_id", REFRESH_TOKEN_SESSIONS_TABLE, ["user_id"], unique=False)
    refresh_columns_down = _column_names(REFRESH_TOKEN_SESSIONS_TABLE)
    if "revoked" in refresh_columns_down:
        if "ix_refresh_token_sessions_user_family_revoked" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_family_revoked",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "family_id", "revoked"],
                unique=False,
            )
        if "ix_refresh_token_sessions_user_kind_revoked" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_kind_revoked",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "client_kind", "revoked"],
                unique=False,
            )
    else:
        if "ix_refresh_token_sessions_user_family" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_family",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "family_id"],
                unique=False,
            )
        if "ix_refresh_token_sessions_user_kind" not in _index_names(REFRESH_TOKEN_SESSIONS_TABLE):
            op.create_index(
                "ix_refresh_token_sessions_user_kind",
                REFRESH_TOKEN_SESSIONS_TABLE,
                ["user_id", "client_kind"],
                unique=False,
            )

    op.execute(sa.text(f"DROP TABLE {MAP_TABLE}"))
