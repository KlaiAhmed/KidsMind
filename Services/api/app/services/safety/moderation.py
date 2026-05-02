from core.config import settings
from fastapi import HTTPException
import httpx
from utils.shared.logger import logger
import time


MODERATION_TIMEOUT = httpx.Timeout(
    connect=5.0,
    read=10.0,
    write=5.0,
    pool=3.0,
)

def _blocked_result(category: str, score: float | None = None, threshold: float | None = None) -> dict[str, object]:
    return {
        "blocked": True,
        "category": category,
        "score": score,
        "threshold": threshold,
    }

def _pass_result() -> dict[str, object]:
    return {
        "blocked": False,
        "category": None,
        "score": None,
        "threshold": None,
    }

# Thresholds tuned for a kids platform.
KIDS_THRESHOLDS = {
    # Sexual
    "sexual": 0.25,
    "sexual/minors": 0.15,

    # Violence
    "violence": 0.4,
    "violence/graphic": 0.35,

    # Hate
    "hate": 0.3,
    "hate/threatening": 0.25,

    # Harassment
    "harassment": 0.5,
    "harassment/threatening": 0.35,

    # Self-harm
    "self-harm": 0.45,
    "self-harm/intent": 0.35,
    "self-harm/instructions": 0.35,

    # Illicit
    "illicit": 0.45,
    "illicit/violent": 0.35,
}


async def check_moderation(message: str, context: str, client: httpx.AsyncClient):
    try:
        timer = time.perf_counter()

        if not settings.GUARD_API_KEY:
            logger.warning("Moderation skipped: GUARD_API_KEY not configured")
            return _pass_result()

        headers = {"Authorization": f"Bearer {settings.GUARD_API_KEY}"}
        text = f"APP CONTEXT: {context}\nUSER Input: {message}"
        payload = {"model": settings.GUARD_MODEL_NAME, "input": text}

        response = await client.post(
            settings.GUARD_API_URL,
            json=payload,
            headers=headers,
            timeout=MODERATION_TIMEOUT,
        )
        response.raise_for_status()

        data = response.json()
        results = data["results"][0]
        scores = results["category_scores"]

        # If the model hard-flagged content, find the highest-scoring category
        # to return meaningful context rather than a generic "flagged" label.
        if results["flagged"]:
            flagged_categories = {k: v for k, v in scores.items() if results["categories"].get(k)}
            if flagged_categories:
                top_category = max(flagged_categories, key=flagged_categories.get)
                top_score = flagged_categories[top_category]
                logger.warning(
                    "Content hard-flagged by moderation",
                    extra={"top_category": top_category, "score": round(top_score, 3), "all_flagged": list(flagged_categories)},
                )
                return _blocked_result(top_category, top_score, threshold=None)

        # Secondary check: our own stricter thresholds for kids
        for category, threshold in KIDS_THRESHOLDS.items():
            api_score = scores.get(category, 0)
            if api_score > threshold:
                logger.warning(
                    "Content blocked by moderation (threshold)",
                    extra={
                        "category": category,
                        "score": round(api_score, 3),
                        "threshold": threshold,
                    },
                )
                return _blocked_result(category, api_score, threshold)

        elapsed = time.perf_counter() - timer
        logger.info(
            "Moderation check completed",
            extra={
                "duration_seconds": round(elapsed, 3),
                "flagged": False,
            },
        )
        return _pass_result()

    except HTTPException:
        raise
    except (httpx.TimeoutException, httpx.RequestError):
        logger.warning("Moderation provider unavailable; failing open to avoid blocking users")
        return _pass_result()
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        try:
            error_body = exc.response.json()
        except Exception:
            error_body = exc.response.text
        logger.error(
            "Moderation provider returned HTTP error",
            extra={"status_code": status_code, "error_body": error_body},
        )
        raise HTTPException(status_code=502, detail="Moderation provider error")
    except Exception:
        logger.exception("Unexpected error during moderation check")
        raise HTTPException(status_code=500, detail="Internal Moderation Error")