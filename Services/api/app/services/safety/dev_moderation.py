from __future__ import annotations

import time
from urllib.parse import urlparse

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


_ML_SUPPORTED_LANGUAGES = {"en"}
DEV_GUARD_TIMEOUT_SECONDS = settings.DEV_GUARD_READ_TIMEOUT
DEV_GUARD_ATTEMPTS = 3

DEV_KIDS_THRESHOLDS = {
    "violent": 0.5,
    "insulting": 0.4,
    "discriminatory": 0.4,
    "toxic": 0.5,
    "sexual": 0.25,
    "self-harm": 0.4,
}


def _is_valid_provider_url(url: str | None) -> bool:
    if not url or not url.strip():
        return False
    parsed = urlparse(url.strip())
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


async def dev_check_moderation(
    message: str,
    context: str,
    client: httpx.AsyncClient,
    language: str = "en",
):
    provider_url = settings.DEV_GUARD_API_URL

    if moderation_circuit_breaker.is_open():
        logger.error(
            "Dev moderation circuit open; failing closed",
            extra={"blocked": True, "failure_kind": "circuit_open"},
        )
        moderation_failures_total.labels(provider="sightengine", failure_kind="circuit_open").inc()
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation temporarily unavailable",
            failure_kind="circuit_open",
            raw={"provider": "sightengine", "mode": "dev"},
        )

    if not _is_valid_provider_url(provider_url):
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="sightengine", failure_kind="config_missing").inc()
        logger.error(
            "Dev moderation blocked: provider URL is missing or invalid",
            extra={"provider_url": provider_url, "failure_kind": "config_missing"},
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service is not configured",
            failure_kind="config_missing",
            raw={"provider": "sightengine", "mode": "dev"},
        )

    if not settings.DEV_API_USER or not settings.DEV_GUARD_API_KEY:
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="sightengine", failure_kind="config_missing").inc()
        logger.error(
            "Dev moderation blocked: API credentials not configured",
            extra={
                "has_api_user": bool(settings.DEV_API_USER),
                "has_api_key": bool(settings.DEV_GUARD_API_KEY),
                "failure_kind": "config_missing",
            },
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service is not configured",
            failure_kind="config_missing",
            raw={"provider": "sightengine", "mode": "dev"},
        )

    effective_lang = language if language in _ML_SUPPORTED_LANGUAGES else "en"
    if effective_lang != language:
        logger.info(
            "Dev moderation: language not supported by ML mode, falling back to 'en'",
            extra={"requested_language": language, "effective_language": effective_lang},
        )

    timer = time.perf_counter()
    text = f"APP CONTEXT: {context}\nUSER Input: {message}"
    payload = {
        "text": text,
        "mode": "ml",
        "models": "general,self-harm",
        "lang": effective_lang,
        "api_user": settings.DEV_API_USER,
        "api_secret": settings.DEV_GUARD_API_KEY,
    }

    async def _post() -> httpx.Response:
        response = await client.post(
            provider_url,
            data=payload,
            timeout=httpx.Timeout(
                connect=settings.DEV_GUARD_CONNECT_TIMEOUT,
                read=settings.DEV_GUARD_READ_TIMEOUT,
                write=settings.DEV_GUARD_WRITE_TIMEOUT,
                pool=settings.DEV_GUARD_POOL_TIMEOUT,
            ),
        )
        response.raise_for_status()
        return response

    try:
        response = await retry_async_call(
            _post,
            attempts=DEV_GUARD_ATTEMPTS,
            timeout_seconds=DEV_GUARD_TIMEOUT_SECONDS,
            retryable_exceptions=(httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError, TimeoutError),
            operation_name="dev_moderation",
        )

        data = response.json()
        scores = data.get("moderation_classes", {})
        scores.pop("available", None)

        for category, threshold in DEV_KIDS_THRESHOLDS.items():
            api_score = scores.get(category, 0)
            if api_score > threshold:
                logger.warning(
                    "Content blocked by dev moderation",
                    extra={"category": category, "score": round(api_score, 3), "threshold": threshold},
                )
                moderation_circuit_breaker.record_success()
                flagged_rate_total.labels(stage="input", category=category).inc()
                return build_blocked_result(
                    category=category,
                    reason="Content exceeded a kid-safe threshold",
                    score=api_score,
                    threshold=threshold,
                    raw=data,
                )

        elapsed = time.perf_counter() - timer
        moderation_circuit_breaker.record_success()
        logger.info(
            "Dev moderation check completed",
            extra={"duration_seconds": round(elapsed, 3), "scores": scores},
        )
        return build_pass_result(raw=data)

    except (httpx.UnsupportedProtocol, httpx.InvalidURL):
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="sightengine", failure_kind="invalid_url").inc()
        logger.error(
            "Dev moderation provider URL invalid; failing closed",
            extra={"provider_url": provider_url, "failure_kind": "invalid_url"},
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service temporarily unavailable",
            failure_kind="invalid_url",
            raw={"provider": "sightengine", "mode": "dev"},
        )
    except (httpx.TimeoutException, httpx.RequestError, TimeoutError, httpx.HTTPStatusError) as exc:
        moderation_circuit_breaker.record_failure()
        if isinstance(exc, (httpx.TimeoutException, TimeoutError)):
            moderation_timeout_total.labels(provider="sightengine").inc()
        moderation_failures_total.labels(provider="sightengine", failure_kind="provider_error").inc()
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        try:
            error_body = exc.response.json() if isinstance(exc, httpx.HTTPStatusError) else None
        except Exception:
            error_body = exc.response.text if isinstance(exc, httpx.HTTPStatusError) else None

        logger.error(
            "Dev moderation provider failure; failing closed",
            extra={
                "provider_url": provider_url,
                "status_code": status_code,
                "error_body": error_body,
                "failure_kind": "provider_error",
            },
        )
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service temporarily unavailable",
            failure_kind="provider_error",
            raw={"provider": "sightengine", "mode": "dev", "status_code": status_code, "error_body": error_body},
        )
    except Exception:
        moderation_circuit_breaker.record_failure()
        moderation_failures_total.labels(provider="sightengine", failure_kind="unexpected_error").inc()
        logger.exception("Unexpected error during dev moderation check")
        return build_blocked_result(
            category="moderation_unavailable",
            reason="Moderation service temporarily unavailable",
            failure_kind="unexpected_error",
            raw={"provider": "sightengine", "mode": "dev"},
        )
