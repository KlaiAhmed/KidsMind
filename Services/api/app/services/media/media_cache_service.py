"""
Media Cache Service

Responsibility: Caches the starter/base avatar metadata and signed URLs in Redis.
Layer: Service
Domain: Media / Caching
"""

import json
import time
from typing import Any

from sqlalchemy.orm import Session

from core.cache_client import get_cache_client
from core.config import settings
from core.database import SessionLocal
from core.storage import minio_client
from minio.error import S3Error
from models.media.avatar import Avatar
from utils.shared.logger import logger

BASE_AVATAR_CACHE_KEY = "media:avatars:base:v1"
BASE_AVATAR_CACHE_TTL_SECONDS = 3600

URL_CACHE_PREFIX = "media:url:"
URL_CACHE_TTL_SECONDS = settings.AVATAR_URL_CACHE_TTL_SECONDS
URL_CACHE_REFRESH_BUFFER = settings.AVATAR_URL_CACHE_REFRESH_BUFFER_SECONDS


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


def _url_cache_key(file_path: str) -> str:
    return f"{URL_CACHE_PREFIX}{file_path}"


def _generate_presigned_url(file_path: str) -> str | None:
    from datetime import timedelta
    try:
        return minio_client.presigned_get_object(
            "media-public",
            file_path,
            expires=timedelta(seconds=settings.MEDIA_SIGNED_URL_TTL_SECONDS),
        )
    except S3Error:
        logger.warning("Failed to generate signed URL", extra={"file_path": file_path})
        return None


async def get_cached_signed_url(redis: Any, file_path: str) -> str | None:
    cache_key = _url_cache_key(file_path)
    cached = await redis.get(cache_key)
    if cached:
        try:
            entry = json.loads(cached)
            url = entry["url"]
            expires_at = entry["expires_at"]
            if expires_at - URL_CACHE_REFRESH_BUFFER > time.time():
                return url
        except (json.JSONDecodeError, KeyError, TypeError):
            logger.warning("Corrupted signed URL cache entry", extra={"file_path": file_path})

    url = _generate_presigned_url(file_path)
    if url is None:
        return None

    expires_at = time.time() + URL_CACHE_TTL_SECONDS
    entry = {"url": url, "expires_at": expires_at}
    await redis.set(cache_key, json.dumps(entry), ex=URL_CACHE_TTL_SECONDS)
    return url


async def invalidate_signed_url_cache(redis: Any, file_path: str) -> None:
    cache_key = _url_cache_key(file_path)
    await redis.delete(cache_key)


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