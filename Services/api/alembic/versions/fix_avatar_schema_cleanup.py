"""fix_avatar_schema_cleanup

Revision ID: 20260421_02
Revises: 20260421_01
Create Date: 2026-04-21 11:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "20260421_02"
down_revision: Union[str, Sequence[str], None] = "20260421_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    inspector = inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _column_names(table_name: str) -> set[str]:
    inspector = inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _foreign_keys(table_name: str) -> list[dict]:
    inspector = inspect(op.get_bind())
    return inspector.get_foreign_keys(table_name)


def _drop_fk_on_column(table_name: str, column_name: str, preferred_name: str | None = None) -> None:
    for fk in _foreign_keys(table_name):
        fk_name = fk.get("name")
        constrained_columns = fk.get("constrained_columns") or []
        if not fk_name:
            continue
        if preferred_name and fk_name == preferred_name:
            op.drop_constraint(fk_name, table_name, type_="foreignkey")
            continue
        if column_name in constrained_columns:
            op.drop_constraint(fk_name, table_name, type_="foreignkey")


def upgrade() -> None:
    op.execute(sa.text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    if _table_exists("avatar_tier_thresholds"):
        if _table_exists("avatar_tiers"):
            op.execute(
                sa.text(
                    """
                    INSERT INTO avatar_tiers (id, name, min_xp, sort_order, created_at, updated_at)
                    SELECT gen_random_uuid(), tier_name, min_xp, sort_order, created_at, updated_at
                    FROM avatar_tier_thresholds
                    WHERE tier_name NOT IN (SELECT name FROM avatar_tiers)
                    """
                )
            )
        op.drop_table("avatar_tier_thresholds")

    if _table_exists("media_assets"):
        if _table_exists("avatars") and _table_exists("avatar_tiers"):
            op.execute(
                sa.text(
                    """
                    INSERT INTO avatars (id, tier_id, name, description, file_path, xp_threshold, is_active, sort_order, created_at, updated_at)
                    SELECT
                      gen_random_uuid(),
                      (SELECT id FROM avatar_tiers ORDER BY min_xp LIMIT 1),
                      COALESCE(title, 'Unnamed'),
                      description,
                      object_key,
                      COALESCE(xp_threshold, 0),
                      COALESCE(is_active, TRUE),
                      COALESCE(sort_order, 0),
                      created_at,
                      updated_at
                    FROM media_assets
                    WHERE object_key NOT IN (SELECT file_path FROM avatars)
                    """
                )
            )
        op.drop_table("media_assets")

    if _table_exists("child_profiles"):
        columns = _column_names("child_profiles")
        if "avatar_id" not in columns:
            op.add_column("child_profiles", sa.Column("avatar_id", postgresql.UUID(as_uuid=True), nullable=True))

        if "avatar_id" in _column_names("child_profiles"):
            avatar_fk_names = [
                fk_name
                for fk in _foreign_keys("child_profiles")
                for fk_name in [fk.get("name")]
                if fk_name and "avatar_id" in (fk.get("constrained_columns") or [])
            ]

            if "fk_child_profiles_avatar_id" not in avatar_fk_names:
                for fk_name in avatar_fk_names:
                    op.drop_constraint(fk_name, "child_profiles", type_="foreignkey")

                op.create_foreign_key(
                    "fk_child_profiles_avatar_id",
                    "child_profiles",
                    "avatars",
                    ["avatar_id"],
                    ["id"],
                    ondelete="SET NULL",
                )

        if "avatar" in _column_names("child_profiles"):
            op.drop_column("child_profiles", "avatar")


def downgrade() -> None:
    if _table_exists("child_profiles"):
        if "avatar" not in _column_names("child_profiles"):
            op.add_column("child_profiles", sa.Column("avatar", sa.String(length=64), nullable=True))

        if "avatar_id" in _column_names("child_profiles"):
            _drop_fk_on_column("child_profiles", "avatar_id", preferred_name="fk_child_profiles_avatar_id")
            op.drop_column("child_profiles", "avatar_id")

    if not _table_exists("avatar_tier_thresholds"):
        op.create_table(
            "avatar_tier_thresholds",
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
        op.create_index("ix_avatar_tier_thresholds_id", "avatar_tier_thresholds", ["id"], unique=False)
        op.create_index("ix_avatar_tier_thresholds_tier_name", "avatar_tier_thresholds", ["tier_name"], unique=False)

    if not _table_exists("media_assets"):
        media_type = postgresql.ENUM("avatar", "badge", "audio_track", "audio_effect", name="media_type")
        avatar_tier = postgresql.ENUM("starter", "common", "rare", "epic", "legendary", name="avatar_tier")
        media_type.create(op.get_bind(), checkfirst=True)
        avatar_tier.create(op.get_bind(), checkfirst=True)

        op.create_table(
            "media_assets",
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
        op.create_index("ix_media_assets_id", "media_assets", ["id"], unique=False)
        op.create_index("ix_media_assets_media_type", "media_assets", ["media_type"], unique=False)
        op.create_index("ix_media_assets_object_key", "media_assets", ["object_key"], unique=True)
        op.create_index("ix_media_assets_xp_threshold", "media_assets", ["xp_threshold"], unique=False)
        op.create_index("ix_media_assets_is_base_avatar", "media_assets", ["is_base_avatar"], unique=False)
        op.create_index("ix_media_assets_is_active", "media_assets", ["is_active"], unique=False)
        op.create_index(
            "ix_media_assets_avatar_base_sort",
            "media_assets",
            ["is_base_avatar", "sort_order"],
            unique=False,
        )