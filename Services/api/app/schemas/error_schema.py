"""
Error response schemas.

Responsibility: Define a consistent API error payload for all exception handlers.
"""

from pydantic import BaseModel, Field


class ErrorItem(BaseModel):
    field: str | None = None
    message: str
    type: str | None = None


class ErrorResponse(BaseModel):
    message: str
    error_code: str
    errors: list[ErrorItem] = Field(default_factory=list)
