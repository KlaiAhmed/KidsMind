"""
Content Generation Service

Responsibility: Handles communication with AI service for content generation
including both synchronous and streaming responses.
Layer: Service
Domain: Chat / AI
"""

import json
import time
from collections.abc import AsyncGenerator

import httpx

from core.config import settings
from utils.logger import logger


SLOW_CALL_THRESHOLD_SECONDS = 3.0


def _merge_text_chunks(previous: str, incoming: str) -> str:
    """Merge streamed text that can arrive as either delta or cumulative chunks."""
    if not previous:
        return incoming
    if not incoming:
        return previous

    if incoming.startswith(previous):
        return incoming

    if previous.startswith(incoming):
        return previous

    return previous + incoming


def _merge_chunk_payload(accumulated: dict, payload: dict) -> dict:
    for key, value in payload.items():
        if isinstance(value, str):
            accumulated[key] = _merge_text_chunks(str(accumulated.get(key, "")), value)
        else:
            accumulated[key] = value

    return accumulated


async def generate_content(
    user_id: str,
    child_id: str,
    session_id: str,
    text: str,
    client: httpx.AsyncClient,
    context: str = "",
    nickname: str = "Child",
    age_group: str = "3-6",
    education_stage: str = "KINDERGARTEN",
    is_accelerated: bool = False,
    is_below_expected_stage: bool = False,
    timeout: int = 30
):

    url = f"{settings.AI_SERVICE_ENDPOINT}/v1/ai/chat/{user_id}/{child_id}/{session_id}"

    logger.info(
        "Calling AI service",
        extra={
            "text_length": len(text),
            "context_length": len(context),
            "nickname": nickname,
            "age_group": age_group,
            "education_stage": education_stage,
        },
    )

    start_time = time.perf_counter()
    res = await client.post(
        url,
        json={
            "text": text,
            "context": context,
            "nickname": nickname,
            "age_group": age_group,
            "education_stage": education_stage,
            "is_accelerated": is_accelerated,
            "is_below_expected_stage": is_below_expected_stage,
        },
        timeout=timeout,
    )
    elapsed = time.perf_counter() - start_time

    res.raise_for_status()

    if elapsed > SLOW_CALL_THRESHOLD_SECONDS:
        logger.warning(
            "Slow AI service response",
            extra={
                "duration_seconds": round(elapsed, 3),
                "status_code": res.status_code,
            },
        )
    else:
        logger.info(
            "AI service call completed",
            extra={
                "duration_seconds": round(elapsed, 3),
                "status_code": res.status_code,
                "response_size_bytes": len(res.content),
            },
        )

    return res.json().get("response", {})


async def stream_content(
    user_id: str,
    child_id: str,
    session_id: str,
    text: str,
    client: httpx.AsyncClient,
    context: str = "",
    nickname: str = "Child",
    age_group: str = "3-6",
    education_stage: str = "KINDERGARTEN",
    is_accelerated: bool = False,
    is_below_expected_stage: bool = False,
    timeout: int = 30,
) -> AsyncGenerator[bytes, None]:
    url = f"{settings.AI_SERVICE_ENDPOINT}/v1/ai/chat/stream/{user_id}/{child_id}/{session_id}"

    logger.info(
        "Starting AI service stream",
        extra={
            "text_length": len(text),
            "context_length": len(context),
            "nickname": nickname,
            "age_group": age_group,
            "education_stage": education_stage,
        },
    )

    async with client.stream(
        "POST",
        url,
        json={
            "text": text,
            "context": context,
            "nickname": nickname,
            "age_group": age_group,
            "education_stage": education_stage,
            "is_accelerated": is_accelerated,
            "is_below_expected_stage": is_below_expected_stage,
        },
        timeout=timeout,
    ) as res:
        res.raise_for_status()

        # Upstream emits SSE `data:` lines; accumulate chunk payloads so clients
        # (including Swagger) can always see the progressively built full object.
        accumulated_payload: dict = {}

        async for line in res.aiter_lines():
            if not line:
                continue

            if not line.startswith("data:"):
                continue

            data = line[5:].strip()

            if not data:
                continue

            if data == "[DONE]":
                yield b"data: [DONE]\n\n"
                continue

            try:
                parsed = json.loads(data)
            except json.JSONDecodeError:
                yield f"data: {data}\n\n".encode("utf-8")
                continue

            if isinstance(parsed, dict):
                merged = _merge_chunk_payload(accumulated_payload, parsed)
                payload_text = json.dumps(merged, ensure_ascii=False)
            else:
                payload_text = json.dumps(parsed, ensure_ascii=False)

            yield f"data: {payload_text}\n\n".encode("utf-8")
