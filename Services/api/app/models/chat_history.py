"""
Chat History Model

Responsibility: Defines the ChatHistory ORM model for persisted chat turns.
Layer: Model
Domain: Chat
"""

from sqlalchemy import Column, DateTime, Index, Integer, String, Text, func

from core.database import Base


class ChatHistory(Base):
    """
    SQLAlchemy ORM model representing persisted child/assistant chat messages.

    Attributes:
        id: Primary key identifier.
        child_id: Child identifier linked to the conversation.
        session_id: Conversation session identifier.
        role: Message role ("user" or "assistant").
        content: Message content body.
        created_at: Message creation timestamp used for retention/archival.
    """

    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(String(64), nullable=False, index=True)
    session_id = Column(String(64), nullable=False, index=True)
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index("ix_chat_history_child_session_created_at", "child_id", "session_id", "created_at"),
    )
