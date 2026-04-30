"""
Chat Schemas

Responsibility: Defines Pydantic request schemas for chat endpoints.
Layer: Schema
Domain: Chat
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TextChatRequest(BaseModel):
    """Request schema for text chat endpoint."""

    model_config = ConfigDict(extra="forbid")

    text: str
    context: str = ""
    input_source: Literal["voice", "keyboard"] | None = None
    stream: bool = False


class ChatSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    child_profile_id: UUID
    access_window_id: UUID | None = None
    started_at: datetime | None = None


class ChatSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    child_profile_id: UUID
    access_window_id: UUID | None
    started_at: datetime
    ended_at: datetime | None
    created_at: datetime


class ChatSessionClose(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ended_at: datetime | None = None
