"""AI Service

Responsibility: Orchestrates LLM interactions for chat and quiz generation.
Layer: Service
Domain: AI/LLM

ARCHITECTURAL NOTE: History vs Memory
---------------------------------------
This service uses LangChain's RunnableWithMessageHistory which automatically
injects MEMORY (active conversation context) into prompts. We do NOT pass
HISTORY (persisted database records) directly to the LLM.

Key points:
- session_id: Identifies the conversation session for MEMORY retrieval
- MEMORY is loaded from Redis via session_memory_service
- HISTORY is persisted to Postgres via chat_history_service (separate concern)
- The build_chain module handles the transformation layer

The invoke_payload sent to the chain contains ONLY:
- Child profile data (nickname, age_group, etc.)
- Current user message (input)
- Context (if any)

MEMORY is injected by RunnableWithMessageHistory, NOT in the payload.
"""

import json
import time
import asyncio
from uuid import uuid4
from typing import AsyncGenerator

from openai import RateLimitError as OpenAIRateLimitError
from fastapi import HTTPException

from services.chat.build_chain import chain_builder
from services.quiz.quiz_validation import validate_quiz_payload, QuizValidationError
from core.config import settings
from core.exceptions import AIRateLimitError
from core.llm import build_llm_for_profile
from utils.child.child_policy import child_policy
from utils.shared.logger import logger

QUIZ_MAX_RETRIES = 3
QUIZ_RETRY_INITIAL_DELAY = 1.0
QUIZ_RETRY_MAX_DELAY = 8.0
QUIZ_RETRY_BACKOFF = 2.0


class AIService:
    def __init__(self):
        pass

    def build_session_key(self, user_id: str, child_id: str, session_id: str) -> str:
        return f"kidsmind:session:{user_id}:{child_id}:{session_id}"

    @staticmethod
    def _build_chat_input(profile_context: dict, text: str, context: str = "") -> dict:
        return {
            "nickname": profile_context["nickname"],
            "age_group": profile_context["age_group"],
            "education_stage": profile_context["education_stage"],
            "is_accelerated": profile_context["is_accelerated"],
            "is_below_expected_stage": profile_context["is_below_expected_stage"],
            "child_policy": child_policy(
                profile_context["age_group"],
                profile_context["is_accelerated"],
                profile_context["is_below_expected_stage"],
            ),
            "language": profile_context["language"],
            "context": context or "",
            "input": text,
        }

    @staticmethod
    def _build_quiz_input(profile_context: dict, subject: str, topic: str, level: str, question_count: int, context: str = "") -> dict:
        return {
            "nickname": profile_context["nickname"],
            "age_group": profile_context["age_group"],
            "education_stage": profile_context["education_stage"],
            "child_policy": child_policy(
                profile_context["age_group"],
                profile_context.get("is_accelerated", False),
                profile_context.get("is_below_expected_stage", False),
            ),
            "language": profile_context.get("language", "en"),
            "subject": subject,
            "topic": topic,
            "level": level,
            "question_count": question_count,
            "context": context or "",
        }

    @staticmethod
    def _extract_message_text(message) -> str:
        content = getattr(message, "content", message)

        if hasattr(message, "response_metadata") and not content:
            metadata = message.response_metadata
            if metadata and metadata.get("finish_reason") == "length":
                return ""

        if isinstance(content, str):
            return content

        if isinstance(content, dict):
            for key in ("text", "content", "value", "output_text"):
                value = content.get(key)
                if isinstance(value, str):
                    return value
            return json.dumps(content, ensure_ascii=False)

        if isinstance(content, list):
            parts: list[str] = []
            for block in content:
                if isinstance(block, str):
                    parts.append(block)
                    continue

                block_text = getattr(block, "text", None)
                if isinstance(block_text, str):
                    parts.append(block_text)
                    continue

                if isinstance(block, dict):
                    text_value = block.get("text")
                    if isinstance(text_value, str):
                        parts.append(text_value)
                        continue
                    if isinstance(text_value, dict):
                        nested = text_value.get("value") or text_value.get("text")
                        if isinstance(nested, str):
                            parts.append(nested)
                            continue

                    for key in ("content", "value", "output_text"):
                        value = block.get(key)
                        if isinstance(value, str):
                            parts.append(value)
                            break

            return "".join(parts)

        return str(content or "")

    @staticmethod
    def _parse_quiz_json_text(text: str) -> dict:
        normalized = text.strip()
        if normalized.startswith("```"):
            lines = normalized.splitlines()
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            normalized = "\n".join(lines).strip()

        start = normalized.find("{")
        end = normalized.rfind("}")
        if start >= 0 and end >= start:
            normalized = normalized[start:end + 1]

        parsed = json.loads(normalized)
        if not isinstance(parsed, dict):
            raise ValueError("Quiz generation returned JSON that was not an object")
        return parsed

    @classmethod
    def _coerce_quiz_payload(cls, response) -> dict:
        if isinstance(response, dict):
            return dict(response)

        text = cls._extract_message_text(response)
        if text:
            return cls._parse_quiz_json_text(text)

        if hasattr(response, "model_dump"):
            dumped = response.model_dump()
            if isinstance(dumped, dict):
                content = dumped.get("content")
                if isinstance(content, str) and content.strip():
                    return cls._parse_quiz_json_text(content)
                if "intro" in dumped or "questions" in dumped:
                    return dumped

        raise ValueError("Quiz generation returned no parseable payload")

    async def stream_chat_text(
        self,
        user: dict,
        profile_context: dict,
        text: str,
        context: str = "",
    ) -> AsyncGenerator[str, None]:
        timer = time.perf_counter()
        age_group = profile_context["age_group"]
        llm = build_llm_for_profile(age_group, streaming=True)
        chain = chain_builder.build_chat_chain(llm)

        session_id = self.build_session_key(user['id'], user['child_id'], user['session_id'])
        invoke_payload = self._build_chat_input(profile_context, text, context)

        logger.info(
            "AIService.stream_chat_text started",
            extra={
                "user_id": user.get("id"),
                "child_id": user.get("child_id"),
                "session_id": session_id,
                "age_group": age_group,
            },
        )

        try:
            async for chunk in chain.astream(
                invoke_payload,
                config={"configurable": {"session_id": session_id}},
            ):
                chunk_text = self._extract_message_text(chunk)
                if not chunk_text:
                    continue
                yield chunk_text

        except OpenAIRateLimitError as e:
            raise AIRateLimitError(str(e)) from e
        except Exception:
            logger.exception(
                "AIService.stream_chat_text failed",
                extra={"session_id": session_id},
            )
            raise
        finally:
            elapsed = time.perf_counter() - timer
            logger.info(
                "AIService.stream_chat_text finished",
                extra={
                    "session_id": session_id,
                    "elapsed_seconds": elapsed,
                },
            )

    async def _invoke_quiz_chain(self, chain, invoke_payload: dict, timeout_seconds: float) -> dict:
        """Single quiz generation attempt. Returns raw payload (unvalidated)."""
        task = asyncio.create_task(chain.ainvoke(invoke_payload))
        try:
            response = await asyncio.wait_for(
                asyncio.shield(task),
                timeout=timeout_seconds,
            )
            return self._coerce_quiz_payload(response)
        except asyncio.TimeoutError:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
            raise TimeoutError(f"Quiz generation timed out after {timeout_seconds}s")
        except ValueError as e:
            raise ValueError(f"Failed to parse quiz response: {e}")

    async def _generate_quiz_with_retry(
        self,
        chain,
        invoke_payload: dict,
        timeout_seconds: float,
        question_count: int,
    ) -> dict:
        """Generate quiz with exponential backoff retry. Returns validated payload."""
        last_error = None
        delay = QUIZ_RETRY_INITIAL_DELAY

        for attempt in range(1, QUIZ_MAX_RETRIES + 1):
            try:
                logger.info(
                    "AIService.generate_quiz attempt",
                    extra={
                        "attempt": attempt,
                        "max_retries": QUIZ_MAX_RETRIES,
                        "subject": invoke_payload.get("subject"),
                        "topic": invoke_payload.get("topic"),
                    },
                )

                raw_payload = await self._invoke_quiz_chain(chain, invoke_payload, timeout_seconds)

                validated_payload = validate_quiz_payload(
                    raw_payload,
                    expected_count=question_count,
                )

                logger.info(
                    "AIService.generate_quiz validated",
                    extra={
                        "attempt": attempt,
                        "question_count": len(validated_payload["questions"]),
                    },
                )

                return validated_payload

            except (ValueError, QuizValidationError) as e:
                last_error = e
                logger.warning(
                    f"AIService.generate_quiz attempt {attempt} failed",
                    extra={
                        "attempt": attempt,
                        "error_type": type(e).__name__,
                        "error_message": str(e)[:200],
                        "will_retry": attempt < QUIZ_MAX_RETRIES,
                    },
                )

                if attempt < QUIZ_MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * QUIZ_RETRY_BACKOFF, QUIZ_RETRY_MAX_DELAY)

            except TimeoutError as e:
                last_error = e
                logger.warning(
                    f"AIService.generate_quiz attempt {attempt} timed out",
                    extra={
                        "attempt": attempt,
                        "timeout_seconds": timeout_seconds,
                        "will_retry": attempt < QUIZ_MAX_RETRIES,
                    },
                )

                if attempt < QUIZ_MAX_RETRIES:
                    await asyncio.sleep(delay)
                    delay = min(delay * QUIZ_RETRY_BACKOFF, QUIZ_RETRY_MAX_DELAY)

        logger.error(
            "AIService.generate_quiz failed after all retries",
            extra={
                "total_attempts": QUIZ_MAX_RETRIES,
                "final_error_type": type(last_error).__name__,
                "final_error_message": str(last_error)[:200],
            },
        )

        raise HTTPException(
            status_code=502,
            detail=f"Quiz generation failed after {QUIZ_MAX_RETRIES} attempts. Please try again.",
        )

    async def generate_quiz(
        self,
        profile_context: dict,
        subject: str,
        topic: str,
        level: str,
        question_count: int = 3,
        context: str = "",
    ) -> dict:
        """Generate quiz with retries and validation. Returns guaranteed valid payload."""
        timer = time.perf_counter()
        age_group = profile_context["age_group"]
        llm = build_llm_for_profile(age_group, streaming=False)
        chain = chain_builder.build_quiz_chain(llm)

        invoke_payload = self._build_quiz_input(
            profile_context, subject, topic, level, question_count, context
        )

        timeout_seconds = settings.AI_QUIZ_TIMEOUT_SECONDS

        logger.info(
            "AIService.generate_quiz started",
            extra={
                "age_group": age_group,
                "subject": subject,
                "topic": topic,
                "level": level,
                "question_count": question_count,
                "timeout_seconds": timeout_seconds,
                "max_retries": QUIZ_MAX_RETRIES,
            },
        )

        try:
            validated_payload = await self._generate_quiz_with_retry(
                chain=chain,
                invoke_payload=invoke_payload,
                timeout_seconds=timeout_seconds,
                question_count=question_count,
            )

            elapsed = time.perf_counter() - timer
            logger.info(
                "AIService.generate_quiz completed",
                extra={
                    "elapsed_seconds": round(elapsed, 3),
                    "question_count": len(validated_payload["questions"]),
                },
            )

            validated_payload["quiz_id"] = str(uuid4())
            validated_payload["subject"] = subject
            validated_payload["topic"] = topic
            validated_payload["level"] = level

            return validated_payload

        except OpenAIRateLimitError as e:
            raise HTTPException(status_code=429, detail="AI service rate limit exceeded")
        except HTTPException:
            raise
        except Exception as e:
            elapsed = time.perf_counter() - timer
            logger.exception(
                "AIService.generate_quiz failed unexpectedly",
                extra={
                    "elapsed_seconds": round(elapsed, 3),
                    "error_type": type(e).__name__,
                },
            )
            raise HTTPException(status_code=502, detail="Quiz generation failed unexpectedly")


ai_service = AIService()
