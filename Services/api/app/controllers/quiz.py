"""
Quiz Controller

Responsibility: Orchestrate quiz submission workflows with server-side answer
validation and gamification hooks.
Layer: Controller
Domain: Quiz / Gamification
"""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from models.child_profile import ChildProfile
from models.quiz import Quiz
from models.quiz_question import QuizQuestion
from models.quiz_result import QuizResult
from models.user import User
from schemas.badge_schema import BadgeRead
from schemas.quiz_schema import QuizSubmitRequest
from services.badge_award_service import evaluate_and_award
from services.gamification_service import process_quiz_completion
from utils.logger import logger


def _normalize_answer(answer: str, question_type: str) -> str:
    normalized = answer.strip().lower()
    if question_type == "true_false":
        if normalized in (
            "true", "vrai", "صحيح", "verdadero", "wahr",
            "yes", "oui", "نعم", "sí", "ja",
            "1", "correct", "juste",
        ):
            return "true"
        if normalized in (
            "false", "faux", "خطأ", "falso", "falsch",
            "no", "non", "لا",
            "0", "incorrect", "wrong",
        ):
            return "false"
    return normalized


def _run_gamification(
    db: Session,
    child_id: UUID,
    parent_id: UUID,
    correct_count: int,
    total_questions: int,
    subject: str | None,
) -> tuple:
    gamification = None
    newly_earned: list = []

    try:
        gamification = process_quiz_completion(
            db=db,
            child_id=child_id,
            subject=subject,
            correct_count=correct_count,
            total_questions=total_questions,
        )
        db.commit()

        newly_earned = evaluate_and_award(db, child_id, parent_id)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception(
            "Gamification processing failed during quiz submission — quiz result unaffected",
            extra={"child_id": str(child_id)},
        )

    return gamification, newly_earned


async def submit_quiz_controller(
    *,
    db: Session,
    child_id: UUID,
    current_user: User,
    payload: QuizSubmitRequest,
) -> dict:
    child = db.query(ChildProfile).filter(
        ChildProfile.id == child_id,
        ChildProfile.parent_id == current_user.id,
    ).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child profile not found")

    quiz = db.query(Quiz).filter(Quiz.id == UUID(payload.quiz_id)).first()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.child_profile_id != child_id:
        raise HTTPException(status_code=403, detail="Forbidden.")

    result = db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id)
    )
    questions = result.scalars().all()

    if not questions:
        raise HTTPException(status_code=422, detail="Quiz has no questions.")

    correct_answers: dict[int, tuple[str, str]] = {
        q.id: (q.answer.strip(), q.type) for q in questions
    }

    correct_count = 0
    total_questions = len(questions)
    for submission in payload.answers:
        entry = correct_answers.get(submission.question_id)
        if entry is None:
            continue
        expected_raw, q_type = entry
        expected = _normalize_answer(expected_raw, q_type)
        submitted = _normalize_answer(submission.answer, q_type)
        if submitted == expected:
            correct_count += 1

    existing_result = db.query(QuizResult).filter(
        QuizResult.quiz_id == quiz.id
    ).first()
    if existing_result:
        raise HTTPException(status_code=409, detail="Quiz already submitted.")

    quiz_result = QuizResult(
        quiz_id=quiz.id,
        score=correct_count,
        total_questions=total_questions,
        duration_seconds=payload.duration_seconds,
    )
    db.add(quiz_result)
    db.flush()

    gamification, newly_earned = _run_gamification(
        db=db,
        child_id=child_id,
        parent_id=current_user.id,
        correct_count=correct_count,
        total_questions=total_questions,
        subject=payload.subject or quiz.subject,
    )

    return {
        "correct_count": correct_count,
        "total_questions": total_questions,
        "score_percentage": round(correct_count / total_questions * 100, 1) if total_questions > 0 else 0.0,
        "gamification": gamification.model_dump() if gamification else None,
        "newly_earned_badges": [BadgeRead.model_validate(b) for b in newly_earned],
    }
