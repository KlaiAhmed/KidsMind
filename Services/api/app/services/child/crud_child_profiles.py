"""
CRUD operations for child profiles.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from models.child.child_profile import ChildProfile
from models.gamification.child_gamification_stats import ChildGamificationStats
from utils.child.child_profile_logic import StudentProfileDerivation


def create_child_profile(
    db: Session,
    *,
    parent_id: UUID,
    nickname: str,
    avatar_id: UUID | None,
    derivation: StudentProfileDerivation,
) -> ChildProfile:
    child_profile = ChildProfile(
        parent_id=parent_id,
        nickname=nickname,
        birth_date=derivation.birth_date,
        education_stage=derivation.education_stage,
        is_accelerated=derivation.is_accelerated,
        is_below_expected_stage=derivation.is_below_expected_stage,
        avatar_id=avatar_id,
    )
    db.add(child_profile)
    db.flush()

    stats = ChildGamificationStats(child_profile_id=child_profile.id)
    db.add(stats)
    db.flush()

    return child_profile


def list_children_for_parent(db: Session, *, parent_id: UUID) -> list[ChildProfile]:
    return (
        db.query(ChildProfile)
        .filter(ChildProfile.parent_id == parent_id)
        .order_by(ChildProfile.id.asc())
        .all()
    )


def delete_child_profile(db: Session, *, child_profile: ChildProfile) -> None:
    db.delete(child_profile)
    db.flush()
