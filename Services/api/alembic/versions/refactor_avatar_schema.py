"""refactor_avatar_schema

Revision ID: 20260421_01
Revises: 20260420_07
Create Date: 2026-04-21 10:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260421_01"
down_revision: Union[str, Sequence[str], None] = "20260420_07"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


AVATAR_TIERS_TABLE = "avatar_tiers"
LEGACY_AVATAR_TIERS_TABLE = "avatar_tier_thresholds"
AVATARS_TABLE = "avatars"
LEGACY_MEDIA_ASSETS_TABLE = "media_assets"
CHILD_PROFILES_TABLE = "child_profiles"
CHILD_AVATAR_FK = "fk_child_profiles_avatar_id_avatars"
MEDIA_TYPE_ENUM = "media_type"
AVATAR_TIER_ENUM = "avatar_tier"


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _foreign_keys(table_name: str) -> list[dict]:
    inspector = inspect(op.get_bind())
    return inspector.get_foreign_keys(table_name)


def _index_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _drop_fk_by_column(table_name: str, column_name: str, preferred_name: str | None = None) -> None:
    for fk in _foreign_keys(table_name):
        name = fk.get("name")
        constrained_columns = fk.get("constrained_columns") or []
        if not name:
            continue
        if preferred_name and name == preferred_name:
            op.drop_constraint(name, table_name, type_="foreignkey")
            continue
        if column_name in constrained_columns:
            op.drop_constraint(name, table_name, type_="foreignkey")


def _create_avatar_tiers_table() -> None:
    if _table_exists(AVATAR_TIERS_TABLE):
        return

    op.create_table(
        AVATAR_TIERS_TABLE,
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("min_xp", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_avatar_tiers_name"),
        sa.UniqueConstraint("sort_order", name="uq_avatar_tiers_sort_order"),
    )
    op.create_index("ix_avatar_tiers_id", AVATAR_TIERS_TABLE, ["id"], unique=False)
    op.create_index("ix_avatar_tiers_name", AVATAR_TIERS_TABLE, ["name"], unique=False)


def _ensure_default_avatar_tier() -> None:
    if not _table_exists(AVATAR_TIERS_TABLE):
        return

    op.execute(
        sa.text(
            """
            INSERT INTO avatar_tiers (name, min_xp, sort_order)
            SELECT 'Starter', 0, 0
            WHERE NOT EXISTS (SELECT 1 FROM avatar_tiers)
            """
        )
    )


def _create_avatars_table() -> None:
    if _table_exists(AVATARS_TABLE):
        return

    op.create_table(
        AVATARS_TABLE,
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tier_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("xp_threshold", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["tier_id"], ["avatar_tiers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_path", name="uq_avatars_file_path"),
    )
    op.create_index("ix_avatars_id", AVATARS_TABLE, ["id"], unique=False)
    op.create_index("ix_avatars_tier_id", AVATARS_TABLE, ["tier_id"], unique=False)
    op.create_index("ix_avatars_file_path", AVATARS_TABLE, ["file_path"], unique=True)


def _create_legacy_media_assets_table() -> None:
    if _table_exists(LEGACY_MEDIA_ASSETS_TABLE):
        return

    media_type = sa.Enum("avatar", "badge", "audio_track", "audio_effect", name=MEDIA_TYPE_ENUM)
    avatar_tier = sa.Enum("starter", "common", "rare", "epic", "legendary", name=AVATAR_TIER_ENUM)
    media_type.create(op.get_bind(), checkfirst=True)
    avatar_tier.create(op.get_bind(), checkfirst=True)

    op.create_table(
        LEGACY_MEDIA_ASSETS_TABLE,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("media_type", media_type, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("bucket_name", sa.String(length=63), nullable=False, server_default=sa.text("'media-public'")),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("xp_threshold", sa.Integer(), nullable=True),
        sa.Column("is_base_avatar", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("avatar_sequence", sa.Integer(), nullable=True),
        sa.Column("avatar_tier", avatar_tier, nullable=True),
        sa.Column("badge_group", sa.String(length=100), nullable=True),
        sa.Column("criteria_description", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_media_assets_id", LEGACY_MEDIA_ASSETS_TABLE, ["id"], unique=False)
    op.create_index("ix_media_assets_media_type", LEGACY_MEDIA_ASSETS_TABLE, ["media_type"], unique=False)
    op.create_index("ix_media_assets_object_key", LEGACY_MEDIA_ASSETS_TABLE, ["object_key"], unique=True)
    op.create_index("ix_media_assets_xp_threshold", LEGACY_MEDIA_ASSETS_TABLE, ["xp_threshold"], unique=False)
    op.create_index("ix_media_assets_is_base_avatar", LEGACY_MEDIA_ASSETS_TABLE, ["is_base_avatar"], unique=False)
    op.create_index("ix_media_assets_is_active", LEGACY_MEDIA_ASSETS_TABLE, ["is_active"], unique=False)
    op.create_index(
        "ix_media_assets_avatar_base_sort",
        LEGACY_MEDIA_ASSETS_TABLE,
        ["is_base_avatar", "sort_order"],
        unique=False,
    )


def _create_legacy_avatar_tiers_table() -> None:
    if _table_exists(LEGACY_AVATAR_TIERS_TABLE):
        return

    op.create_table(
        LEGACY_AVATAR_TIERS_TABLE,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tier_name", sa.String(length=32), nullable=False),
        sa.Column("min_xp", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tier_name", name="uq_avatar_tier_thresholds_tier_name"),
        sa.UniqueConstraint("sort_order", name="uq_avatar_tier_thresholds_sort_order"),
    )
    op.create_index("ix_avatar_tier_thresholds_id", LEGACY_AVATAR_TIERS_TABLE, ["id"], unique=False)
    op.create_index("ix_avatar_tier_thresholds_tier_name", LEGACY_AVATAR_TIERS_TABLE, ["tier_name"], unique=False)


def upgrade() -> None:
    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    _create_avatar_tiers_table()

    if _table_exists(LEGACY_AVATAR_TIERS_TABLE):
        op.execute(
            sa.text(
                """
                INSERT INTO avatar_tiers (name, min_xp, sort_order, created_at, updated_at)
                SELECT
                    t.tier_name,
                    COALESCE(t.min_xp, 0),
                    COALESCE(t.sort_order, 0),
                    COALESCE(t.created_at, NOW()),
                    COALESCE(t.updated_at, NOW())
                FROM avatar_tier_thresholds t
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM avatar_tiers at
                    WHERE LOWER(at.name) = LOWER(t.tier_name)
                )
                ORDER BY t.sort_order, t.id
                """
            )
        )

    _ensure_default_avatar_tier()

    if _table_exists(LEGACY_AVATAR_TIERS_TABLE):
        op.drop_table(LEGACY_AVATAR_TIERS_TABLE)

    _create_avatars_table()

    if _table_exists(LEGACY_MEDIA_ASSETS_TABLE):
        op.execute(
            sa.text(
                """
                INSERT INTO avatars (
                    tier_id,
                    name,
                    description,
                    file_path,
                    xp_threshold,
                    is_active,
                    sort_order,
                    created_at,
                    updated_at
                )
                SELECT
                    COALESCE(
                        (
                            SELECT at.id
                            FROM avatar_tiers at
                            WHERE LOWER(at.name) = LOWER(COALESCE(ma.avatar_tier::text, ''))
                            ORDER BY at.sort_order, at.name
                            LIMIT 1
                        ),
                        (
                            SELECT at2.id
                            FROM avatar_tiers at2
                            ORDER BY at2.sort_order, at2.name
                            LIMIT 1
                        )
                    ) AS tier_id,
                    COALESCE(NULLIF(TRIM(ma.title), ''), 'Avatar'),
                    ma.description,
                    ma.object_key,
                    COALESCE(ma.xp_threshold, 0),
                    COALESCE(ma.is_active, true),
                    COALESCE(ma.sort_order, 0),
                    COALESCE(ma.created_at, NOW()),
                    COALESCE(ma.updated_at, NOW())
                FROM media_assets ma
                WHERE ma.media_type::text = 'avatar'
                  AND ma.object_key IS NOT NULL
                  AND TRIM(ma.object_key) <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM avatars a WHERE a.file_path = ma.object_key
                  )
                """
            )
        )

    if _table_exists(CHILD_PROFILES_TABLE):
        columns = _column_names(CHILD_PROFILES_TABLE)
        if "avatar_id" not in columns:
            op.add_column(
                CHILD_PROFILES_TABLE,
                sa.Column("avatar_id", postgresql.UUID(as_uuid=True), nullable=True),
            )

        fk_names = {fk.get("name") for fk in _foreign_keys(CHILD_PROFILES_TABLE) if fk.get("name")}
        if CHILD_AVATAR_FK not in fk_names:
            op.create_foreign_key(
                CHILD_AVATAR_FK,
                CHILD_PROFILES_TABLE,
                AVATARS_TABLE,
                ["avatar_id"],
                ["id"],
                ondelete="SET NULL",
            )

        columns = _column_names(CHILD_PROFILES_TABLE)
        if "avatar" in columns:
            op.execute(
                sa.text(
                    """
                    UPDATE child_profiles cp
                    SET avatar_id = a.id
                    FROM avatars a
                    WHERE cp.avatar_id IS NULL
                      AND cp.avatar IS NOT NULL
                      AND (
                          cp.avatar = a.file_path
                          OR cp.avatar = regexp_replace(a.file_path, '^.*/', '')
                          OR cp.avatar LIKE '%' || a.file_path
                      )
                    """
                )
            )
            op.drop_column(CHILD_PROFILES_TABLE, "avatar")

    if _table_exists(LEGACY_MEDIA_ASSETS_TABLE):
        op.drop_table(LEGACY_MEDIA_ASSETS_TABLE)
        media_type = sa.Enum(name=MEDIA_TYPE_ENUM)
        avatar_tier = sa.Enum(name=AVATAR_TIER_ENUM)
        avatar_tier.drop(op.get_bind(), checkfirst=True)
        media_type.drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    _create_legacy_media_assets_table()

    if _table_exists(AVATARS_TABLE) and _table_exists(LEGACY_MEDIA_ASSETS_TABLE):
        op.execute(
            sa.text(
                """
                WITH base AS (
                    SELECT COALESCE(MAX(id), 0) AS start_id
                    FROM media_assets
                ),
                ordered AS (
                    SELECT
                        a.id,
                        a.name,
                        a.description,
                        a.file_path,
                        a.xp_threshold,
                        a.is_active,
                        a.sort_order,
                        a.created_at,
                        a.updated_at,
                        at.name AS tier_name,
                        ROW_NUMBER() OVER (
                            ORDER BY a.sort_order ASC, a.created_at ASC, a.id ASC
                        ) AS seq
                    FROM avatars a
                    LEFT JOIN avatar_tiers at ON at.id = a.tier_id
                )
                INSERT INTO media_assets (
                    id,
                    media_type,
                    title,
                    description,
                    bucket_name,
                    object_key,
                    mime_type,
                    file_size_bytes,
                    duration_seconds,
                    is_active,
                    xp_threshold,
                    is_base_avatar,
                    sort_order,
                    avatar_sequence,
                    avatar_tier,
                    badge_group,
                    criteria_description,
                    created_by_user_id,
                    updated_by_user_id,
                    created_at,
                    updated_at
                )
                SELECT
                    base.start_id + ordered.seq,
                    'avatar'::media_type,
                    COALESCE(NULLIF(TRIM(ordered.name), ''), 'Avatar'),
                    ordered.description,
                    'media-public',
                    ordered.file_path,
                    'image/webp',
                    0,
                    NULL,
                    COALESCE(ordered.is_active, true),
                    COALESCE(ordered.xp_threshold, 0),
                    CASE WHEN COALESCE(ordered.xp_threshold, 0) = 0 THEN true ELSE false END,
                    COALESCE(ordered.sort_order, 0),
                    base.start_id + ordered.seq,
                    (
                        CASE
                            WHEN LOWER(COALESCE(ordered.tier_name, '')) IN ('starter', 'common', 'rare', 'epic', 'legendary')
                                THEN LOWER(ordered.tier_name)
                            WHEN COALESCE(ordered.xp_threshold, 0) >= 5000 THEN 'legendary'
                            WHEN COALESCE(ordered.xp_threshold, 0) >= 1500 THEN 'epic'
                            WHEN COALESCE(ordered.xp_threshold, 0) >= 500 THEN 'rare'
                            WHEN COALESCE(ordered.xp_threshold, 0) >= 100 THEN 'common'
                            ELSE 'starter'
                        END
                    )::avatar_tier,
                    NULL,
                    NULL,
                    NULL,
                    NULL,
                    COALESCE(ordered.created_at, NOW()),
                    COALESCE(ordered.updated_at, NOW())
                FROM ordered
                CROSS JOIN base
                WHERE ordered.file_path IS NOT NULL
                  AND TRIM(ordered.file_path) <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM media_assets m WHERE m.object_key = ordered.file_path
                  )
                """
            )
        )

    if _table_exists(CHILD_PROFILES_TABLE):
        columns = _column_names(CHILD_PROFILES_TABLE)
        if "avatar" not in columns:
            op.add_column(CHILD_PROFILES_TABLE, sa.Column("avatar", sa.String(length=64), nullable=True))

        columns = _column_names(CHILD_PROFILES_TABLE)
        if "avatar_id" in columns and _table_exists(AVATARS_TABLE):
            op.execute(
                sa.text(
                    """
                    UPDATE child_profiles cp
                    SET avatar = LEFT(a.file_path, 64)
                    FROM avatars a
                    WHERE cp.avatar_id = a.id
                      AND cp.avatar IS NULL
                    """
                )
            )

        columns = _column_names(CHILD_PROFILES_TABLE)
        if "avatar_id" in columns:
            _drop_fk_by_column(CHILD_PROFILES_TABLE, "avatar_id", CHILD_AVATAR_FK)
            op.drop_column(CHILD_PROFILES_TABLE, "avatar_id")

    if _table_exists(AVATARS_TABLE):
        op.drop_table(AVATARS_TABLE)

    _create_legacy_avatar_tiers_table()

    if _table_exists(AVATAR_TIERS_TABLE) and _table_exists(LEGACY_AVATAR_TIERS_TABLE):
        op.execute(
            sa.text(
                """
                WITH ordered AS (
                    SELECT
                        ROW_NUMBER() OVER (ORDER BY at.sort_order ASC, at.id ASC) AS seq,
                        LEFT(LOWER(at.name), 32) AS tier_name,
                        COALESCE(at.min_xp, 0) AS min_xp,
                        COALESCE(at.sort_order, 0) AS sort_order,
                        COALESCE(at.created_at, NOW()) AS created_at,
                        COALESCE(at.updated_at, NOW()) AS updated_at
                    FROM avatar_tiers at
                )
                INSERT INTO avatar_tier_thresholds (
                    id,
                    tier_name,
                    min_xp,
                    sort_order,
                    created_at,
                    updated_at
                )
                SELECT
                    o.seq,
                    o.tier_name,
                    o.min_xp,
                    o.sort_order,
                    o.created_at,
                    o.updated_at
                FROM ordered o
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM avatar_tier_thresholds t
                    WHERE LOWER(t.tier_name) = o.tier_name
                )
                ORDER BY o.seq
                """
            )
        )

    if _table_exists(AVATAR_TIERS_TABLE):
        op.drop_table(AVATAR_TIERS_TABLE)
