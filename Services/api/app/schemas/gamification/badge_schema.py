"""
Badge Schemas

Responsibility: Defines response schemas for badge endpoints.
Layer: Schema
Domain: Children / Badges
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    condition: str | None
    file_path: str | None
    is_active: bool
    sort_order: int


class ChildBadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_profile_id: UUID
    badge_id: UUID
    earned: bool
    earned_at: datetime | None
    badge: BadgeRead


class BadgeCatalogItem(BaseModel):
    id: UUID
    name: str
    description: str | None
    earned: bool
    earned_at: datetime | None
    file_path: str | None
    condition: str | None


class BadgeCatalogResponse(BaseModel):
    items: list[BadgeCatalogItem]
    total_earned: int = 0
    total_count: int = 0
    limit: int = 100
    offset: int = 0


class BadgeAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    condition: str | None
    file_path: str | None
    is_active: bool
    sort_order: int
    icon_url: str | None = None
    created_at: datetime
    updated_at: datetime


class BadgeAdminUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    condition: str | None = None
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("name cannot be blank")
        return normalized


class BadgeAdminListResponse(BaseModel):
    items: list[BadgeAdminResponse]
