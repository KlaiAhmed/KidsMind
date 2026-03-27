from collections.abc import AsyncGenerator

import redis.asyncio as aioredis

from core.config import settings


REDIS_CHILD_PROFILE_CACHE_URL = f"redis://:{settings.CACHE_PASSWORD}@cache:6379"


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """Yield a Redis connection for request-scoped dependencies."""
    redis_client = aioredis.from_url(
        REDIS_CHILD_PROFILE_CACHE_URL,
        encoding="utf-8",
        decode_responses=True,
        socket_connect_timeout=3,
        socket_timeout=3,
    )
    try:
        yield redis_client
    finally:
        await redis_client.aclose()