"""
Media Cache Service

Responsibility: Caches the starter/base avatar metadata in Redis.
Layer: Service
Domain: Media / Caching
"""

import json
from typing import Any

from sqlalchemy.orm import Session

from core.cache_client import get_cache_client
from core.database import SessionLocal
from models.avatar import Avatar
from utils.logger import logger


BASE_AVATAR_CACHE_KEY = "media:avatars:base:v1"
BASE_AVATAR_CACHE_TTL_SECONDS = 3600


def _serialize_base_avatar(asset: Avatar) -> dict[str, Any]:
    return {
        "id": str(asset.id),
        "name": asset.name,
        "file_path": asset.file_path,
        "tier_id": str(asset.tier_id),
        "sort_order": asset.sort_order,
        "xp_threshold": asset.xp_threshold,
    }


def load_base_avatars_from_db(db: Session) -> list[Avatar]:
    return (
        db.query(Avatar)
        .filter(
            Avatar.xp_threshold == 0,
            Avatar.is_active.is_(True),
        )
        .order_by(Avatar.sort_order.asc(), Avatar.id.asc())
        .all()
    )


async def refresh_base_avatar_cache(redis: Any, db: Session) -> list[dict[str, Any]]:
    base_avatars = load_base_avatars_from_db(db)
    serialized = [_serialize_base_avatar(asset) for asset in base_avatars]
    await redis.set(
        BASE_AVATAR_CACHE_KEY,
        json.dumps(serialized),
        ex=BASE_AVATAR_CACHE_TTL_SECONDS,
    )
    return serialized


async def get_base_avatar_cache(redis: Any, db: Session) -> list[dict[str, Any]]:
    cached = await redis.get(BASE_AVATAR_CACHE_KEY)
    if cached:
        try:
            parsed = json.loads(cached)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            logger.warning("Corrupted base avatar cache entry detected; rebuilding")

    return await refresh_base_avatar_cache(redis, db)


async def invalidate_base_avatar_cache(redis: Any) -> None:
    await redis.delete(BASE_AVATAR_CACHE_KEY)


async def warm_base_avatar_cache() -> None:
    redis = await get_cache_client()
    db = SessionLocal()
    try:
        await refresh_base_avatar_cache(redis, db)
        logger.info("Base avatar cache warm-up completed")
    except Exception:
        logger.exception("Base avatar cache warm-up failed")
    finally:
        db.close()