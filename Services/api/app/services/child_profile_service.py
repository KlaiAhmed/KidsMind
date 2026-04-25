"""
Child Profile Service

Responsibility: Implements business logic for child profile CRUD operations.
Layer: Service
Domain: Children
"""

from collections import defaultdict
from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, func, insert
from sqlalchemy.orm import Session

from crud.crud_child_profiles import create_child_profile, list_children_for_parent
from crud.crud_child_rules import upsert_child_rules
from models.avatar import Avatar
from models.access_window import AccessWindow
from models.access_window_subject import AccessWindowSubject
from models.child_allowed_subject import ChildAllowedSubject
from models.child_profile import ChildProfile
from models.child_rules import ChildRules
from models.user import User
from schemas.child_profile_schema import (
    AccessWindowIn,
    AccessWindowOut,
    AccessWindowSubjectIn,
    ChildAllowedSubjectIn,
    ChildProfileCreate,
    ChildProfileRead,
    ChildProfileUpdate,
    ChildRulesRead,
    ChildRulesUpdate,
)
from schemas.media_schema import AvatarResponse
from utils.child_profile_logic import derive_student_profile_fields
from utils.manage_pwd import hash_password


class ChildProfileService:
    MAX_CHILD_PROFILES_PER_PARENT = 5

    RULE_FIELD_NAMES = {
        "default_language",
        "homework_mode_enabled",
        "voice_mode_enabled",
        "audio_storage_enabled",
        "conversation_history_enabled",
    }

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    def count_children_for_parent(self, parent_id: UUID) -> int:
        """Return how many child profiles currently exist for a parent account."""
        return int(
            self.db.query(func.count(ChildProfile.id))
            .filter(ChildProfile.parent_id == parent_id)
            .scalar()
            or 0
        )

    def _get_child_by_id(self, child_id: UUID) -> ChildProfile | None:
        return self.db.query(ChildProfile).filter(ChildProfile.id == child_id).first()

    def _require_parent_ownership(self, child_profile: ChildProfile, parent_id: UUID) -> None:
        if child_profile.parent_id != parent_id:
            raise HTTPException(status_code=403, detail="Access denied")

    def _get_child_for_parent_or_raise(self, child_id: UUID, parent_id: UUID) -> ChildProfile:
        child_profile = self._get_child_by_id(child_id)
        if not child_profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
        self._require_parent_ownership(child_profile, parent_id)
        return child_profile

    def _ensure_avatar_exists(self, avatar_id: UUID | None) -> None:
        if avatar_id is None:
            return
        avatar_exists = self.db.query(Avatar.id).filter(Avatar.id == avatar_id).first()
        if not avatar_exists:
            raise HTTPException(status_code=422, detail="avatar_id does not reference an existing avatar")

    @staticmethod
    def _extract_unique_subjects(
        items: Sequence[ChildAllowedSubjectIn | AccessWindowSubjectIn],
    ) -> list[str]:
        seen: set[str] = set()
        ordered_subjects: list[str] = []
        for item in items:
            if item.subject in seen:
                continue
            seen.add(item.subject)
            ordered_subjects.append(item.subject)
        return ordered_subjects

    def _replace_allowed_subjects_rows(
        self,
        *,
        child_profile_id: UUID,
        allowed_subjects: Sequence[ChildAllowedSubjectIn],
    ) -> None:
        self.db.execute(
            delete(ChildAllowedSubject).where(ChildAllowedSubject.child_profile_id == child_profile_id)
        )
        self.db.flush()

        unique_subjects = self._extract_unique_subjects(allowed_subjects)
        if not unique_subjects:
            return

        rows = [
            {
                "child_profile_id": child_profile_id,
                "subject": subject,
            }
            for subject in unique_subjects
        ]
        self.db.execute(insert(ChildAllowedSubject), rows)

    def _replace_all_week_schedule_rows(
        self,
        *,
        child_profile_id: UUID,
        week_schedule: Sequence[AccessWindowIn],
    ) -> None:
        self.db.execute(
            delete(AccessWindow).where(AccessWindow.child_profile_id == child_profile_id)
        )
        self.db.flush()

        if not week_schedule:
            return

        all_subject_rows: list[dict[str, object]] = []
        for schedule in week_schedule:
            inserted_schedule = self.db.execute(
                insert(AccessWindow)
                .values(
                    child_profile_id=child_profile_id,
                    day_of_week=schedule.day_of_week,
                    access_window_start=schedule.access_window_start,
                    access_window_end=schedule.access_window_end,
                    daily_cap_seconds=schedule.daily_cap_seconds,
                )
                .returning(AccessWindow.id)
            ).first()

            if inserted_schedule and schedule.subjects:
                unique_subjects = self._extract_unique_subjects(schedule.subjects)
                for subject in unique_subjects:
                    all_subject_rows.append({"access_window_id": inserted_schedule.id, "subject": subject})

        if all_subject_rows:
            self.db.execute(insert(AccessWindowSubject), all_subject_rows)

    def update_allowed_subjects(
        self,
        *,
        child_id: UUID,
        parent_user: User,
        allowed_subjects: Sequence[ChildAllowedSubjectIn],
    ) -> ChildProfileRead:
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        try:
            self._replace_allowed_subjects_rows(
                child_profile_id=child_profile.id,
                allowed_subjects=allowed_subjects,
            )
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

        return self._serialize_child_profiles([child_profile])[0]

    def replace_schedule_day(
        self,
        *,
        child_id: UUID,
        parent_user: User,
        schedule_day: AccessWindowIn,
    ) -> ChildProfileRead:
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        try:
            existing = (
                self.db.query(AccessWindow)
                .filter(
                    AccessWindow.child_profile_id == child_profile.id,
                    AccessWindow.day_of_week == schedule_day.day_of_week,
                )
                .first()
            )
            if existing:
                self.db.delete(existing)
                self.db.flush()

            inserted_schedule = self.db.execute(
                insert(AccessWindow)
                .values(
                    child_profile_id=child_profile.id,
                    day_of_week=schedule_day.day_of_week,
                    access_window_start=schedule_day.access_window_start,
                    access_window_end=schedule_day.access_window_end,
                    daily_cap_seconds=schedule_day.daily_cap_seconds,
                )
                .returning(AccessWindow.id)
            ).first()

            if inserted_schedule and schedule_day.subjects:
                subject_rows = [
                    {"access_window_id": inserted_schedule.id, "subject": subject}
                    for subject in self._extract_unique_subjects(schedule_day.subjects)
                ]
                if subject_rows:
                    self.db.execute(insert(AccessWindowSubject), subject_rows)

            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

        return self._serialize_child_profiles([child_profile])[0]

    def _serialize_child_profiles(self, profiles: Sequence[ChildProfile]) -> list[ChildProfileRead]:
        if not profiles:
            return []

        child_ids = [profile.id for profile in profiles]

        rules_rows = (
            self.db.query(ChildRules)
            .filter(ChildRules.child_profile_id.in_(child_ids))
            .all()
        )
        rules_by_child_id = {row.child_profile_id: row for row in rules_rows}

        allowed_subject_rows = (
            self.db.query(ChildAllowedSubject)
            .filter(ChildAllowedSubject.child_profile_id.in_(child_ids))
            .order_by(ChildAllowedSubject.subject.asc())
            .all()
        )
        allowed_subjects_by_child_id: dict[UUID, list[str]] = defaultdict(list)
        for row in allowed_subject_rows:
            allowed_subjects_by_child_id[row.child_profile_id].append(row.subject)

        week_schedule_rows = (
            self.db.query(AccessWindow)
            .filter(AccessWindow.child_profile_id.in_(child_ids))
            .order_by(AccessWindow.day_of_week.asc())
            .all()
        )
        week_schedule_by_child_id: dict[UUID, list[AccessWindow]] = defaultdict(list)
        schedule_ids: list[UUID] = []
        for row in week_schedule_rows:
            week_schedule_by_child_id[row.child_profile_id].append(row)
            schedule_ids.append(row.id)

        schedule_subjects_by_schedule_id: dict[UUID, list[str]] = defaultdict(list)
        if schedule_ids:
            schedule_subject_rows = (
                self.db.query(AccessWindowSubject)
                .filter(AccessWindowSubject.access_window_id.in_(schedule_ids))
                .order_by(AccessWindowSubject.subject.asc())
                .all()
            )
            for row in schedule_subject_rows:
                schedule_subjects_by_schedule_id[row.access_window_id].append(row.subject)

        serialized_profiles: list[ChildProfileRead] = []
        for profile in profiles:
            rules_row = rules_by_child_id.get(profile.id)
            week_schedule = [
                AccessWindowOut(
                    id=schedule_row.id,
                    day_of_week=int(schedule_row.day_of_week),
                    access_window_start=schedule_row.access_window_start,
                    access_window_end=schedule_row.access_window_end,
                    daily_cap_seconds=int(schedule_row.daily_cap_seconds),
                    subjects=schedule_subjects_by_schedule_id.get(schedule_row.id, []),
                )
                for schedule_row in week_schedule_by_child_id.get(profile.id, [])
            ]

            serialized_profiles.append(
                ChildProfileRead(
                    id=profile.id,
                    parent_id=profile.parent_id,
                    nickname=profile.nickname,
                    birth_date=profile.birth_date,
                    education_stage=profile.education_stage,
                    is_accelerated=profile.is_accelerated,
                    is_below_expected_stage=profile.is_below_expected_stage,
                    avatar_id=profile.avatar_id,
                    avatar=AvatarResponse.model_validate(profile.avatar) if profile.avatar else None,
                    xp=profile.xp,
                    rules=ChildRulesRead.model_validate(rules_row) if rules_row else None,
                    allowed_subjects=allowed_subjects_by_child_id.get(profile.id, []),
                    week_schedule=week_schedule,
                    created_at=profile.created_at,
                    updated_at=profile.updated_at,
                )
            )

        return serialized_profiles

    def _serialize_single_child_profile(self, profile: ChildProfile) -> ChildProfileRead:
        serialized_profiles = self._serialize_child_profiles([profile])
        if not serialized_profiles:
            raise HTTPException(status_code=404, detail="Child profile not found")
        return serialized_profiles[0]

    def create_child_profile(self, parent_user: User, payload: ChildProfileCreate) -> ChildProfileRead:
        """Create a child profile linked to the authenticated parent."""
        existing_children_count = self.count_children_for_parent(parent_user.id)
        if existing_children_count >= self.MAX_CHILD_PROFILES_PER_PARENT:
            raise HTTPException(
                status_code=403,
                detail="Maximum limit of 5 child profiles per parent reached.",
            )

        try:
            derived = derive_student_profile_fields(
                education_stage=payload.education_stage,
                birth_date=payload.birth_date,
                age=None,
                age_group=None,
                input_is_accelerated=payload.is_accelerated,
                input_is_below_expected_stage=payload.is_below_expected_stage,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        self._ensure_avatar_exists(payload.avatar_id)

        try:
            child_profile = create_child_profile(
                self.db,
                parent_id=parent_user.id,
                nickname=payload.nickname,
                avatar_id=payload.avatar_id,
                derivation=derived,
            )

            upsert_child_rules(
                self.db,
                child_profile_id=child_profile.id,
                payload=payload.rules.model_dump(),
            )

            self._replace_allowed_subjects_rows(
                child_profile_id=child_profile.id,
                allowed_subjects=payload.allowed_subjects,
            )
            self._replace_all_week_schedule_rows(
                child_profile_id=child_profile.id,
                week_schedule=payload.week_schedule,
            )

            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except Exception:
            self.db.rollback()
            raise

        return self._serialize_single_child_profile(child_profile)

    def get_children_for_parent(self, parent_user: User) -> list[ChildProfileRead]:
        """Return all child profiles for the authenticated parent account."""
        children = list_children_for_parent(self.db, parent_id=parent_user.id)
        return self._serialize_child_profiles(children)

    def get_children_for_parent_id(self, parent_id: UUID) -> list[ChildProfileRead]:
        children = list_children_for_parent(self.db, parent_id=parent_id)
        return self._serialize_child_profiles(children)

    def get_child_profile_for_parent(self, child_id: UUID, parent_user: User) -> ChildProfileRead:
        """Return one child profile when it belongs to the authenticated parent."""
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)
        return self._serialize_single_child_profile(child_profile)

    def update_child_profile(self, child_id: UUID, parent_user: User, payload: ChildProfileUpdate) -> ChildProfileRead:
        """Update an existing child profile owned by the authenticated parent."""
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return self._serialize_single_child_profile(child_profile)

        if "nickname" in update_data:
            child_profile.nickname = update_data["nickname"]
        if "avatar_id" in update_data:
            self._ensure_avatar_exists(update_data["avatar_id"])
            child_profile.avatar_id = update_data["avatar_id"]

        has_profile_derivation_input = any(
            key in update_data
            for key in ("birth_date", "education_stage", "is_accelerated", "is_below_expected_stage")
        )

        if has_profile_derivation_input:
            try:
                derived = derive_student_profile_fields(
                    education_stage=update_data.get("education_stage", child_profile.education_stage),
                    birth_date=update_data.get("birth_date", child_profile.birth_date),
                    age=None,
                    age_group=None,
                    input_is_accelerated=update_data.get("is_accelerated"),
                    input_is_below_expected_stage=update_data.get("is_below_expected_stage"),
                )
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            child_profile.birth_date = derived.birth_date
            child_profile.education_stage = derived.education_stage
            child_profile.is_accelerated = derived.is_accelerated
            child_profile.is_below_expected_stage = derived.is_below_expected_stage

        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return self._serialize_single_child_profile(child_profile)

    def update_child_profile_for_admin(
        self,
        *,
        parent_id: UUID,
        child_id: UUID,
        payload: ChildProfileUpdate,
    ) -> ChildProfileRead:
        child_profile = self._get_child_by_id(child_id)
        if not child_profile:
            raise HTTPException(status_code=404, detail="Child profile not found")
        if child_profile.parent_id != parent_id:
            raise HTTPException(status_code=404, detail="Child profile not found")

        update_data = payload.model_dump(exclude_unset=True)
        if not update_data:
            return self._serialize_single_child_profile(child_profile)

        if "nickname" in update_data:
            child_profile.nickname = update_data["nickname"]
        if "avatar_id" in update_data:
            self._ensure_avatar_exists(update_data["avatar_id"])
            child_profile.avatar_id = update_data["avatar_id"]

        has_profile_derivation_input = any(
            key in update_data
            for key in ("birth_date", "education_stage", "is_accelerated", "is_below_expected_stage")
        )

        if has_profile_derivation_input:
            try:
                derived = derive_student_profile_fields(
                    education_stage=update_data.get("education_stage", child_profile.education_stage),
                    birth_date=update_data.get("birth_date", child_profile.birth_date),
                    age=None,
                    age_group=None,
                    input_is_accelerated=update_data.get("is_accelerated"),
                    input_is_below_expected_stage=update_data.get("is_below_expected_stage"),
                )
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc

            child_profile.birth_date = derived.birth_date
            child_profile.education_stage = derived.education_stage
            child_profile.is_accelerated = derived.is_accelerated
            child_profile.is_below_expected_stage = derived.is_below_expected_stage

        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return self._serialize_single_child_profile(child_profile)

    def update_child_rules(self, child_id: UUID, parent_user: User, payload: ChildRulesUpdate) -> ChildRulesRead:
        """Update normalized rule settings for one child profile owned by the parent."""
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        update_data = payload.model_dump(exclude_unset=True)
        parent_pin = update_data.pop("parent_pin", None)
        allowed_subjects_payload = update_data.pop("allowed_subjects", None)
        week_schedule_payload = update_data.pop("week_schedule", None)

        rules_update_payload = {
            key: value for key, value in update_data.items() if key in self.RULE_FIELD_NAMES
        }

        rules = upsert_child_rules(self.db, child_profile_id=child_profile.id, payload=None)

        if rules_update_payload:
            rules = upsert_child_rules(
                self.db,
                child_profile_id=child_profile.id,
                payload=rules_update_payload,
            )

        if allowed_subjects_payload is not None:
            self._replace_allowed_subjects_rows(
                child_profile_id=child_profile.id,
                allowed_subjects=allowed_subjects_payload,
            )

        if week_schedule_payload is not None:
            self._replace_all_week_schedule_rows(
                child_profile_id=child_profile.id,
                week_schedule=week_schedule_payload,
            )

        if parent_pin:
            parent_user.parent_pin_hash = hash_password(parent_pin)
            self.db.add(parent_user)

        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(rules)
        return ChildRulesRead.model_validate(rules)

    def update_child_rules_full(self, child_id: UUID, parent_user: User, payload: ChildRulesUpdate) -> ChildProfileRead:
        """Update child rules and return the full child profile with rules, subjects, and schedule."""
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        update_data = payload.model_dump(exclude_unset=True)
        parent_pin = update_data.pop("parent_pin", None)
        allowed_subjects_payload = update_data.pop("allowed_subjects", None)
        week_schedule_payload = update_data.pop("week_schedule", None)

        rules_update_payload = {
            key: value for key, value in update_data.items() if key in self.RULE_FIELD_NAMES
        }

        rules = upsert_child_rules(self.db, child_profile_id=child_profile.id, payload=None)

        if rules_update_payload:
            rules = upsert_child_rules(
                self.db,
                child_profile_id=child_profile.id,
                payload=rules_update_payload,
            )

        if allowed_subjects_payload is not None:
            self._replace_allowed_subjects_rows(
                child_profile_id=child_profile.id,
                allowed_subjects=allowed_subjects_payload,
            )

        if week_schedule_payload is not None:
            self._replace_all_week_schedule_rows(
                child_profile_id=child_profile.id,
                week_schedule=week_schedule_payload,
            )

        if parent_pin:
            parent_user.parent_pin_hash = hash_password(parent_pin)
            self.db.add(parent_user)

        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        self.db.refresh(child_profile)
        return self._serialize_single_child_profile(child_profile)

    def delete_child_profile(self, child_id: UUID, parent_user: User) -> None:
        """Delete a child profile owned by the authenticated parent.

        Args:
            child_id: Numeric identifier of the child profile to delete.
            parent_user: The authenticated parent user.

        Raises:
            HTTPException: 404 if profile not found or doesn't belong to parent.
        """
        child_profile = self._get_child_for_parent_or_raise(child_id, parent_user.id)

        try:
            self.db.delete(child_profile)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
