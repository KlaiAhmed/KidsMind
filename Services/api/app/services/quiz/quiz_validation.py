"""
Quiz Validation Service

Responsibility: Validates quiz payloads against strict requirements.
                Ensures deterministic, reliable quiz generation.
Layer: Service
Domain: Quiz / Validation
"""

import hashlib
from typing import Any

from fastapi import HTTPException

VALID_QUESTION_TYPES = {"mcq", "true_false", "short_answer"}
REQUIRED_QUIZ_FIELDS = {"intro", "questions"}
REQUIRED_QUESTION_FIELDS = {"type", "prompt", "answer", "explanation"}


class QuizValidationError(HTTPException):
    def __init__(self, detail: str, status_code: int = 502):
        super().__init__(status_code=status_code, detail=detail)


def _validate_question_structure(question: Any, index: int) -> dict:
    if not isinstance(question, dict):
        raise QuizValidationError(
            f"Question {index}: must be a JSON object, got {type(question).__name__}"
        )

    for field in REQUIRED_QUESTION_FIELDS:
        if field not in question:
            raise QuizValidationError(
                f"Question {index}: missing required field '{field}'"
            )

    q_type = str(question.get("type", "")).strip()
    if q_type not in VALID_QUESTION_TYPES:
        raise QuizValidationError(
            f"Question {index}: type must be one of {VALID_QUESTION_TYPES}, got '{q_type}'"
        )

    prompt = str(question.get("prompt", "")).strip()
    if not prompt:
        raise QuizValidationError(f"Question {index}: prompt cannot be empty")

    answer = str(question.get("answer", "")).strip()
    if not answer:
        raise QuizValidationError(f"Question {index}: answer cannot be empty")

    explanation = str(question.get("explanation", "")).strip()
    if not explanation:
        raise QuizValidationError(f"Question {index}: explanation cannot be empty")

    if q_type in {"mcq", "true_false"}:
        options = question.get("options")
        if not isinstance(options, list) or len(options) == 0:
            raise QuizValidationError(
                f"Question {index}: MCQ/true_false must have non-empty 'options' array"
            )
        options_str = [str(o).strip() for o in options]
        if not all(options_str):
            raise QuizValidationError(
                f"Question {index}: all options must be non-empty strings"
            )
        if answer not in options_str:
            raise QuizValidationError(
                f"Question {index}: answer '{answer}' not found in options"
            )
    else:
        if question.get("options") is not None:
            raise QuizValidationError(
                f"Question {index}: short_answer questions must have options=null"
            )

    return {
        "type": q_type,
        "prompt": prompt,
        "answer": answer,
        "explanation": explanation,
        "options": options if q_type in {"mcq", "true_false"} else None,
    }


def _detect_duplicates(questions: list[dict]) -> list[int]:
    seen_hashes = {}
    duplicates = []

    for idx, q in enumerate(questions):
        prompt_hash = hashlib.sha256(
            q["prompt"].lower().strip().encode("utf-8")
        ).hexdigest()

        if prompt_hash in seen_hashes:
            duplicates.append(idx)
        else:
            seen_hashes[prompt_hash] = idx

    return duplicates


def validate_quiz_payload(
    payload: Any,
    *,
    expected_count: int = 10,
    require_mcq_min: int | None = None,
    require_true_false_min: int | None = None,
    require_short_answer_min: int | None = None,
) -> dict:
    """
    Validate quiz payload against strict requirements.
    
    Raises QuizValidationError (502) if invalid.
    Returns normalized payload if valid.
    """
    if not isinstance(payload, dict):
        raise QuizValidationError(
            f"Quiz payload must be a JSON object, got {type(payload).__name__}"
        )

    for field in REQUIRED_QUIZ_FIELDS:
        if field not in payload:
            raise QuizValidationError(f"Quiz payload missing required field '{field}'")

    intro = str(payload.get("intro", "")).strip()
    if not intro:
        intro = "Here is a quiz for you."

    raw_questions = payload.get("questions")
    if not isinstance(raw_questions, list):
        raise QuizValidationError(
            f"'questions' must be an array, got {type(raw_questions).__name__}"
        )

    if len(raw_questions) != expected_count:
        raise QuizValidationError(
            f"Expected exactly {expected_count} questions, got {len(raw_questions)}"
        )

    if require_mcq_min is None:
        require_mcq_min = 1 if expected_count >= 3 else 0
    if require_true_false_min is None:
        require_true_false_min = 1 if expected_count >= 3 else 0
    if require_short_answer_min is None:
        require_short_answer_min = 1 if expected_count >= 3 else 0

    validated_questions = []
    for idx, raw_question in enumerate(raw_questions):
        try:
            validated = _validate_question_structure(raw_question, idx + 1)
            validated_questions.append(validated)
        except QuizValidationError:
            raise

    duplicate_indices = _detect_duplicates(validated_questions)
    if duplicate_indices:
        raise QuizValidationError(
            f"Quiz contains duplicate questions at indices: {duplicate_indices}"
        )

    type_counts = {"mcq": 0, "true_false": 0, "short_answer": 0}
    for q in validated_questions:
        type_counts[q["type"]] += 1

    if type_counts["mcq"] < require_mcq_min:
        raise QuizValidationError(
            f"Need at least {require_mcq_min} MCQ questions, got {type_counts['mcq']}"
        )
    if type_counts["true_false"] < require_true_false_min:
        raise QuizValidationError(
            f"Need at least {require_true_false_min} true/false questions, got {type_counts['true_false']}"
        )
    if type_counts["short_answer"] < require_short_answer_min:
        raise QuizValidationError(
            f"Need at least {require_short_answer_min} short_answer questions, got {type_counts['short_answer']}"
        )

    return {
        "intro": intro,
        "questions": validated_questions,
    }
