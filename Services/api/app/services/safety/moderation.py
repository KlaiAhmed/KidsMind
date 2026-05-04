from __future__ import annotations

import time

import httpx

from core.config import settings
from services.safety.moderation_common import (
    build_blocked_result,
    build_pass_result,
    moderation_circuit_breaker,
    retry_async_call,
)
from utils.observability.metrics import flagged_rate_total, moderation_failures_total, moderation_timeout_total
from utils.shared.logger import logger


MODERATION_TIMEOUT_SECONDS = 10.0
MODERATION_ATTEMPTS = 3

KIDS_THRESHOLDS = {
    "sexual": 0.25,
    "sexual/minors": 0.15,
    "violence": 0.4,
    "violence/graphic": 0.35,
    "hate": 0.3,
    "hate/threatening": 0.25,
    "harassment": 0.5,
    "harassment/threatening": 0.35,
    "self-harm": 0.45,
    "self-harm/intent": 0.35,
    "self-harm/instructions": 0.35,
    "illicit": 0.45,
    "illicit/violent": 0.35,
}


async def check_moderation(message: str, context: str, client: httpx.AsyncClient):
    if moderation_circuit_breaker.is_open():
        logger.error(
            "Moderation circuit open; failing closed",
            extra={"blocked": True, "failure_kind": "circuit_open"},
        )
        moderation_failures_total.labels(provider="openai", failure_kind="circuit_open").inc()
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation temporarily unavailable",
            failure_kind="circuit_open",
            raw={"provider": "openai", "mode": "prod"},
        )

    timer = time.perf_counter()

    if not settings.GUARD_API_KEY:
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="openai", failure_kind="config_missing").inc()
        logger.error(
            "Moderation blocked: GUARD_API_KEY not configured",
            extra={"blocked": True, "failure_kind": "config_missing"},
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service is not configured",
            failure_kind="config_missing",
            raw={"provider": "openai", "mode": "prod"},
        )

    headers = {"Authorization": f"Bearer {settings.GUARD_API_KEY}"}
    text = f"APP CONTEXT: {context}\nUSER Input: {message}"
    payload = {"model": settings.GUARD_MODEL_NAME, "input": text}

    async def _post() -> httpx.Response:
        response = await client.post(
            settings.GUARD_API_URL,
            json=payload,
            headers=headers,
            timeout=httpx.Timeout(connect=5.0, read=MODERATION_TIMEOUT_SECONDS, write=5.0, pool=3.0),
        )
        response.raise_for_status()
        return response

    try:
        response = await retry_async_call(
            _post,
            attempts=MODERATION_ATTEMPTS,
            timeout_seconds=MODERATION_TIMEOUT_SECONDS,
            retryable_exceptions=(httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError),
            operation_name="prod_moderation",
        )

        data = response.json()
        results = data["results"][0]
        scores = results["category_scores"]
        moderation_circuit_breaker.record_success()

        if results.get("flagged"):
            flagged_categories = {k: v for k, v in scores.items() if results["categories"].get(k)}
            if flagged_categories:
                top_category = max(flagged_categories, key=flagged_categories.get)
                top_score = flagged_categories[top_category]
                logger.warning(
                    "Content hard-flagged by moderation",
                    extra={"top_category": top_category, "score": round(top_score, 3), "all_flagged": list(flagged_categories)},
                )
                flagged_rate_total.labels(stage="input", category=top_category).inc()
                return build_blocked_result(
                    category=top_category,
                    reason="Content flagged by moderation",
                    score=top_score,
                    threshold=None,
                    raw=data,
                )

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
                flagged_rate_total.labels(stage="input", category=category).inc()
                return build_blocked_result(
                    category=category,
                    reason="Content exceeded a kid-safe threshold",
                    score=api_score,
                    threshold=threshold,
                    raw=data,
                )

        elapsed = time.perf_counter() - timer
        logger.info(
            "Moderation check completed",
            extra={"duration_seconds": round(elapsed, 3), "flagged": False},
        )
        return build_pass_result(raw=data)

    except (httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError) as exc:
        moderation_circuit_breaker.record_failure()
        if isinstance(exc, httpx.TimeoutException):
            moderation_timeout_total.labels(provider="openai").inc()
        moderation_failures_total.labels(provider="openai", failure_kind="provider_error").inc()
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        error_body = None
        if isinstance(exc, httpx.HTTPStatusError):
            try:
                error_body = exc.response.json()
            except Exception:
                error_body = exc.response.text
        logger.error(
            "Moderation provider failure; failing closed",
            extra={
                "status_code": status_code,
                "error_body": error_body,
                "failure_kind": "provider_error",
            },
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service temporarily unavailable",
            failure_kind="provider_error",
            raw={"status_code": status_code, "error_body": error_body, "provider": "openai", "mode": "prod"},
        )
    except Exception:
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="openai", failure_kind="unexpected_error").inc()
        logger.exception("Unexpected error during moderation check")
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service temporarily unavailable",
            failure_kind="unexpected_error",
            raw={"provider": "openai", "mode": "prod"},
        )
