"""
Child Profile Schemas

Responsibility: Defines normalized Pydantic request/response schemas for
               child profile, rules, allowed subjects, and week schedule APIs.
Layer: Schema
Domain: Children
"""

import re
from datetime import date, datetime, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from schemas.media.media_schema import AvatarResponse
from utils.child.child_profile_logic import (
    MAX_PROFILE_AGE,
    MIN_PROFILE_AGE,
    EducationStage,
    derive_student_profile_fields,
    get_age,
    get_age_group,
)


class ChildSubject(str, Enum):
    MATH = "math"
    FRENCH = "french"
    ENGLISH = "english"
    SCIENCE = "science"
    HISTORY = "history"
    ART = "art"


class ChildWeekday(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


ALLOWED_LANGUAGE_CODES = {
    "ar",
    "en",
    "es",
    "fr",
    "it",
    "zh",
}

LANGUAGE_CODE_ALIASES = {
    "ch": "zh",
}


def _normalize_subject(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized:
        raise ValueError("subject cannot be blank")
    return normalized


class ChildAllowedSubjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=64)

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: str) -> str:
        return _normalize_subject(value)


class AccessWindowSubjectIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=64)

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, value: str) -> str:
        return _normalize_subject(value)


class AccessWindowIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day_of_week: int = Field(ge=0, le=6, description="ISO weekday index where 0=Monday and 6=Sunday")
    access_window_start: time
    access_window_end: time
    daily_cap_seconds: int = Field(ge=1)
    subjects: list[AccessWindowSubjectIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_time_window(self) -> "AccessWindowIn":
        if self.access_window_start >= self.access_window_end:
            raise ValueError("access_window_start must be earlier than access_window_end; overnight windows are not supported")
        return self

    @field_validator("subjects")
    @classmethod
    def validate_subjects_unique(cls, value: list[AccessWindowSubjectIn]) -> list[AccessWindowSubjectIn]:
        normalized_subjects = [_normalize_subject(item.subject) for item in value]
        if len(normalized_subjects) != len(set(normalized_subjects)):
            raise ValueError("subjects cannot contain duplicate values")
        return value


class ChildRulesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    default_language: str | None = Field(default=None, min_length=2, max_length=10)
    homework_mode_enabled: bool = False
    voice_mode_enabled: bool = False
    audio_storage_enabled: bool = False
    conversation_history_enabled: bool = True

    @field_validator("default_language")
    @classmethod
    def validate_default_language(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        normalized = LANGUAGE_CODE_ALIASES.get(normalized, normalized)
        if normalized not in ALLOWED_LANGUAGE_CODES:
            raise ValueError(
                f"Unsupported language code '{normalized}'. Allowed values: {', '.join(sorted(ALLOWED_LANGUAGE_CODES))}"
            )
        return normalized


class ChildRulesUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    default_language: str | None = Field(default=None, min_length=2, max_length=10)
    homework_mode_enabled: bool | None = None
    voice_mode_enabled: bool | None = None
    audio_storage_enabled: bool | None = None
    conversation_history_enabled: bool | None = None
    allowed_subjects: list[ChildAllowedSubjectIn] | None = None
    week_schedule: list[AccessWindowIn] | None = None
    parent_pin: str | None = Field(default=None, alias="parentPin", min_length=4, max_length=4)

    @field_validator("default_language")
    @classmethod
    def validate_default_language(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip().lower()
        normalized = LANGUAGE_CODE_ALIASES.get(normalized, normalized)
        if normalized not in ALLOWED_LANGUAGE_CODES:
            raise ValueError(
                f"Unsupported language code '{normalized}'. Allowed values: {', '.join(sorted(ALLOWED_LANGUAGE_CODES))}"
            )
        return normalized

    @field_validator("parent_pin")
    @classmethod
    def validate_parent_pin_digits(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not re.fullmatch(r"\d{4}", normalized):
            raise ValueError("parent pin must be exactly 4 digits")
        return normalized

    @field_validator("week_schedule")
    @classmethod
    def validate_unique_days(cls, value: list[AccessWindowIn] | None) -> list[AccessWindowIn] | None:
        if value is None:
            return value
        days = [entry.day_of_week for entry in value]
        if len(days) != len(set(days)):
            raise ValueError("week_schedule cannot contain duplicate day_of_week values")
        return value


class ChildProfileCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(min_length=1, max_length=64)
    birth_date: date
    education_stage: EducationStage
    is_accelerated: bool = False
    is_below_expected_stage: bool = False
    avatar_id: UUID | None = None
    rules: ChildRulesIn = Field(default_factory=ChildRulesIn)
    allowed_subjects: list[ChildAllowedSubjectIn] = Field(default_factory=list)
    week_schedule: list[AccessWindowIn] = Field(default_factory=list)

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("nickname cannot be blank")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("birth_date cannot be in the future")
        age = get_age(value)
        if age < MIN_PROFILE_AGE or age > MAX_PROFILE_AGE:
            raise ValueError("birth_date must correspond to an age between 3 and 15")
        return value

    @field_validator("week_schedule")
    @classmethod
    def validate_unique_days(cls, value: list[AccessWindowIn]) -> list[AccessWindowIn]:
        days = [entry.day_of_week for entry in value]
        if len(days) != len(set(days)):
            raise ValueError("week_schedule cannot contain duplicate day_of_week values")
        return value

    @model_validator(mode="after")
    def validate_derived_stage_alignment(self) -> "ChildProfileCreateIn":
        derive_student_profile_fields(
            education_stage=self.education_stage,
            birth_date=self.birth_date,
            age=None,
            age_group=None,
            input_is_accelerated=self.is_accelerated,
            input_is_below_expected_stage=self.is_below_expected_stage,
        )
        return self


class ChildProfileUpdateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str | None = Field(default=None, min_length=1, max_length=64)
    birth_date: date | None = None
    education_stage: EducationStage | None = None
    is_accelerated: bool | None = None
    is_below_expected_stage: bool | None = None
    avatar_id: UUID | None = None

    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("nickname cannot be blank")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date | None) -> date | None:
        if value is None:
            return value
        if value > date.today():
            raise ValueError("birth_date cannot be in the future")
        age = get_age(value)
        if age < MIN_PROFILE_AGE or age > MAX_PROFILE_AGE:
            raise ValueError("birth_date must correspond to an age between 3 and 15")
        return value

    @model_validator(mode="after")
    def validate_boolean_exclusivity(self) -> "ChildProfileUpdateIn":
        if self.is_accelerated and self.is_below_expected_stage:
            raise ValueError("is_accelerated and is_below_expected_stage cannot both be true")
        return self


class ChildRulesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_profile_id: UUID
    default_language: str | None
    homework_mode_enabled: bool
    voice_mode_enabled: bool
    audio_storage_enabled: bool
    conversation_history_enabled: bool
    created_at: datetime
    updated_at: datetime


class AccessWindowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    day_of_week: int = Field(description="ISO weekday index where 0=Monday and 6=Sunday")
    access_window_start: time
    access_window_end: time
    daily_cap_seconds: int
    subjects: list[str] = Field(default_factory=list)


class ChildProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID
    nickname: str
    birth_date: date
    education_stage: EducationStage
    is_accelerated: bool
    is_below_expected_stage: bool
    avatar_id: UUID | None
    avatar: AvatarResponse | None = None
    xp: int
    is_paused: bool = False
    rules: ChildRulesOut | None = None
    allowed_subjects: list[str] = Field(default_factory=list)
    week_schedule: list[AccessWindowOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def age(self) -> int:
        return get_age(self.birth_date)

    @computed_field
    @property
    def age_group(self) -> str:
        return get_age_group(self.birth_date)


ChildProfileCreate = ChildProfileCreateIn
ChildProfileUpdate = ChildProfileUpdateIn
ChildProfileRead = ChildProfileOut
ChildRulesCreate = ChildRulesIn
ChildRulesUpdate = ChildRulesUpdateIn
ChildRulesRead = ChildRulesOut
