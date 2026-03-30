"""
Access token blocklist utilities.

Responsibility: Store and check revoked access-token JTIs in Redis.
"""

from datetime import datetime, timezone
import math
from fastapi import HTTPException

from core.cache_client import get_cache_client
from utils.logger import logger

ACCESS_TOKEN_BLOCKLIST_PREFIX = "auth:blocklist:access:"


def _build_blocklist_key(jti: str) -> str:
    return f"{ACCESS_TOKEN_BLOCKLIST_PREFIX}{jti}"


def _coerce_exp_to_timestamp(exp_claim: int | float | datetime) -> int:
    if isinstance(exp_claim, datetime):
        if exp_claim.tzinfo is None:
            exp_claim = exp_claim.replace(tzinfo=timezone.utc)
        return int(exp_claim.timestamp())
    return int(exp_claim)


def _calculate_ttl_seconds(exp_claim: int | float | datetime) -> int:
    expires_at = _coerce_exp_to_timestamp(exp_claim)
    ttl = expires_at - math.floor(datetime.now(timezone.utc).timestamp())
    return max(ttl, 0)


async def blocklist_access_token_jti(jti: str, exp_claim: int | float | datetime) -> None:
    """Store a revoked access-token JTI in Redis until its token expiry."""
    ttl_seconds = _calculate_ttl_seconds(exp_claim)
    if ttl_seconds <= 0:
        return

    redis_client = await get_cache_client()
    try:
        await redis_client.set(_build_blocklist_key(jti), "1", ex=ttl_seconds)
    except Exception:
        logger.exception(
            "Failed to persist access-token blocklist entry",
            extra={"jti": jti[:8] + "***", "ttl_seconds": ttl_seconds},
        )
        raise HTTPException(status_code=503, detail="Authentication cache unavailable")


async def is_access_token_blocklisted(jti: str) -> bool:
    """Return True when the access-token JTI exists in the Redis blocklist."""
    redis_client = await get_cache_client()
    try:
        return bool(await redis_client.exists(_build_blocklist_key(jti)))
    except Exception:
        logger.exception(
            "Failed to read access-token blocklist entry",
            extra={"jti": jti[:8] + "***"},
        )
        raise HTTPException(status_code=503, detail="Authentication cache unavailable")
