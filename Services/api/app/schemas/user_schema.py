"""
User Schemas

Responsibility: Defines Pydantic response schemas for user profile endpoints.
Layer: Schema
Domain: Users
"""

import enum
import re

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from models.user import UserRole


class AccountDeletionMode(str, enum.Enum):
    """Supported account deletion modes."""

    SOFT = "soft"
    HARD = "hard"


class UserSummaryResponse(BaseModel):
    """Summary response schema for basic user information."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    username: str
    role: UserRole
    is_active: bool
    pin_configured: bool


class UserFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    username: str
    role: UserRole
    is_active: bool

    country: str | None
    timezone: str

    consent_terms: bool

    last_login_at: datetime | None
    failed_login_attempts: int
    locked_until: datetime | None
    pin_configured: bool

    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None


class ParentPinSetupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    parent_pin: str = Field(alias="parentPin", min_length=4, max_length=4)

    @field_validator("parent_pin")
    @classmethod
    def validate_parent_pin_digits(cls, value: str) -> str:
        normalized = value.strip()
        if not re.fullmatch(r"\d{4}", normalized):
            raise ValueError("parent pin must be exactly 4 digits")
        return normalized


class ParentPinSetupResponse(BaseModel):
    message: str
    pin_configured: bool


class DeleteAccountResponse(BaseModel):
    """Response schema for user account deletion operations."""

    message: str
    mode: AccountDeletionMode
    deleted_at: datetime
    scheduled_hard_delete_at: datetime | None


class DeleteChildResponse(BaseModel):
    """Response schema for child profile deletion operations."""

    message: str
    mode: str
    child_id: UUID
    parent_id: UUID
    deleted_at: datetime


class AdminUserUpdate(BaseModel):
    """Schema for admin patching user fields."""

    model_config = ConfigDict(extra="forbid")

    username: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None
    country: str | None = None
    timezone: str | None = None
