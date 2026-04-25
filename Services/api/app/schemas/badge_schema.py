"""
Badge Schemas

Responsibility: Defines response schemas for badge endpoints.
Layer: Schema
Domain: Children / Badges
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    condition: str | None
    icon_key: str | None
    is_active: bool
    sort_order: int


class ChildBadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_profile_id: UUID
    badge_id: UUID
    earned: bool
    earned_at: datetime | None
    progress_percent: float | None
    badge: BadgeRead


class BadgeCatalogItem(BaseModel):
    id: UUID
    name: str
    description: str | None
    earned: bool
    earned_at: datetime | None
    progress_percent: float | None
    icon_key: str | None
    condition: str | None


class BadgeCatalogResponse(BaseModel):
    items: list[BadgeCatalogItem]
    total_earned: int = 0
    total_count: int = 0
    limit: int = 100
    offset: int = 0
