"""
Chat History Service

Responsibility: Handles conversation history persistence in Postgres,
archival to MinIO, and short-term cache management via the AI service.
Layer: Service
Domain: Chat
"""

import io
import json
import time
from datetime import datetime, timedelta, timezone
from functools import partial

import httpx
from anyio import from_thread
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from core.config import settings
from core.storage import minio_client
from models.chat_history import ChatHistory
from utils.file_name import generate_chat_history_storage_path
from utils.logger import logger


class ChatHistoryService:
    async def _cache_get_conversation_history(
        self,
        user_id: str,
        child_id: str,
        session_id: str,
        client: httpx.AsyncClient,
        timeout: int = 30,
    ) -> dict:
        """Retrieve conversation history from AI service for one session."""
        url = f"{settings.AI_SERVICE_URL}/v1/ai/history/{user_id}/{child_id}/{session_id}"

        logger.info(
            "Fetching conversation history",
            extra={"user_id": user_id, "child_id": child_id, "session_id": session_id},
        )

        start_time = time.perf_counter()
        res = await client.get(url, timeout=timeout)
        elapsed = time.perf_counter() - start_time

        res.raise_for_status()

        logger.info(
            "Conversation history retrieved",
            extra={
                "user_id": user_id,
                "child_id": child_id,
                "session_id": session_id,
                "duration_seconds": round(elapsed, 3),
            },
        )

        return res.json()

    async def _cache_clear_conversation_history(
        self,
        user_id: str,
        child_id: str,
        session_id: str,
        client: httpx.AsyncClient,
        timeout: int = 30,
    ) -> dict:
        """Clear conversation history in AI service for one session."""
        url = f"{settings.AI_SERVICE_URL}/v1/ai/history/{user_id}/{child_id}/{session_id}"

        logger.info(
            "Clearing conversation history",
            extra={"user_id": user_id, "child_id": child_id, "session_id": session_id},
        )

        start_time = time.perf_counter()
        res = await client.delete(url, timeout=timeout)
        elapsed = time.perf_counter() - start_time

        res.raise_for_status()

        logger.info(
            "Conversation history cleared",
            extra={
                "user_id": user_id,
                "child_id": child_id,
                "session_id": session_id,
                "duration_seconds": round(elapsed, 3),
            },
        )

        return res.json()

    def _db_save_turn_to_db(
        self,
        db: Session,
        child_id: str,
        session_id: str,
        user_message: str,
        ai_response: str,
    ) -> None:
        """Persist one user+assistant chat turn in Postgres.

        Caller is responsible for passing an open DB session.
        """
        logger.info(
            "Persisting chat turn to database",
            extra={
                "child_id": child_id,
                "session_id": session_id,
                "user_message_length": len(user_message),
                "assistant_message_length": len(ai_response),
            },
        )

        try:
            user_row = ChatHistory(
                child_id=child_id,
                session_id=session_id,
                role="user",
                content=user_message,
            )
            assistant_row = ChatHistory(
                child_id=child_id,
                session_id=session_id,
                role="assistant",
                content=ai_response,
            )

            db.add_all(
                [
                    user_row,
                    assistant_row,
                ]
            )

            db.flush()

            logger.info(
                "Chat turn flushed to database session",
                extra={
                    "child_id": child_id,
                    "session_id": session_id,
                    "user_row_id": user_row.id,
                    "assistant_row_id": assistant_row.id,
                },
            )

            db.commit()

            logger.info(
                "Chat turn persisted to database",
                extra={
                    "child_id": child_id,
                    "session_id": session_id,
                    "user_row_id": user_row.id,
                    "assistant_row_id": assistant_row.id,
                },
            )

        except Exception as exc:
            db.rollback()

            table_exists = None
            try:
                table_exists = inspect(db.get_bind()).has_table(ChatHistory.__tablename__)
            except Exception:
                logger.exception(
                    "Failed inspecting chat_history table after persistence error",
                    extra={"child_id": child_id, "session_id": session_id},
                )

            logger.exception(
                "Failed to persist chat turn to database",
                extra={
                    "child_id": child_id,
                    "session_id": session_id,
                    "error_type": type(exc).__name__,
                    "table_exists": table_exists,
                },
            )
            raise

    def _db_archive_session_to_minio(
        self,
        db: Session,
        child_id: str,
        session_id: str,
    ) -> bool:
        """Archive one session from Postgres into MinIO as JSONL.

        Caller is responsible for passing an open DB session.
        """
        bucket_name = "chat-archive"

        try:
            rows = (
                db.query(ChatHistory)
                .filter(
                    ChatHistory.child_id == child_id,
                    ChatHistory.session_id == session_id,
                )
                .order_by(ChatHistory.created_at.asc())
                .all()
            )

            if not rows:
                logger.info(
                    "No persisted chat rows found for archive",
                    extra={"child_id": child_id, "session_id": session_id},
                )
                return True

            object_key = generate_chat_history_storage_path(child_id, session_id)
            payload_lines = [
                json.dumps(
                    {
                        "role": row.role,
                        "content": row.content,
                        "created_at": row.created_at.isoformat() if row.created_at else None,
                    }
                )
                for row in rows
            ]
            payload = ("\n".join(payload_lines) + "\n").encode("utf-8")
            data = io.BytesIO(payload)

            minio_client.put_object(
                bucket_name=bucket_name,
                object_name=object_key,
                data=data,
                length=len(payload),
                content_type="application/x-ndjson",
            )

            logger.info(
                "Chat session archived to storage",
                extra={
                    "child_id": child_id,
                    "session_id": session_id,
                    "storage_path": object_key,
                    "message_count": len(rows),
                },
            )
            return True
        except Exception:
            logger.exception(
                "Failed to archive chat session",
                extra={"child_id": child_id, "session_id": session_id},
            )
            return False

    def _db_delete_session_from_db(
        self,
        db: Session,
        child_id: str,
        session_id: str,
        user_id: str,
        client: httpx.AsyncClient,
    ) -> None:
        """Delete session rows from Postgres, then clear Redis conversation history.

        Caller is responsible for passing an open DB session and shared HTTP client.
        """
        logger.info(
            "Deleting persisted chat session from database",
            extra={"child_id": child_id, "session_id": session_id},
        )

        try:
            deleted_rows = (
                db.query(ChatHistory)
                .filter(
                    ChatHistory.child_id == child_id,
                    ChatHistory.session_id == session_id,
                )
                .delete(synchronize_session=False)
            )
            db.flush()

            from_thread.run(
                partial(
                    self._cache_clear_conversation_history,
                    user_id=user_id,
                    child_id=child_id,
                    session_id=session_id,
                    client=client,
                )
            )

            db.commit()
        except Exception:
            db.rollback()
            logger.exception(
                "Failed deleting persisted chat session from database",
                extra={"child_id": child_id, "session_id": session_id},
            )
            raise

        logger.info(
            "Persisted chat session deleted from database",
            extra={
                "child_id": child_id,
                "session_id": session_id,
                "deleted_rows": deleted_rows,
            },
        )

        logger.info(
            "Conversation history cache cleared after database delete",
            extra={"child_id": child_id, "session_id": session_id},
        )

    def _db_archive_and_delete_expired_sessions(
        self,
        db: Session,
        user_id: str,
        client: httpx.AsyncClient,
    ) -> dict:
        """Archive and delete sessions older than 90 days.

        Caller is responsible for passing an open DB session and shared HTTP client.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=90)
        archived_count = 0
        failed_count = 0

        expired_sessions = (
            db.query(ChatHistory.child_id, ChatHistory.session_id)
            .filter(ChatHistory.created_at < cutoff)
            .distinct()
            .all()
        )

        logger.info(
            "Starting expired chat session archive job",
            extra={"expired_session_count": len(expired_sessions), "cutoff": cutoff.isoformat()},
        )

        for child_id, session_id in expired_sessions:
            archived = self._db_archive_session_to_minio(
                db=db,
                child_id=child_id,
                session_id=session_id,
            )
            if not archived:
                failed_count += 1
                continue

            try:
                self._db_delete_session_from_db(
                    db=db,
                    child_id=child_id,
                    session_id=session_id,
                    user_id=user_id,
                    client=client,
                )
                archived_count += 1
            except Exception:
                failed_count += 1
                logger.exception(
                    "Failed deleting archived chat session",
                    extra={"child_id": child_id, "session_id": session_id},
                )

        result = {"archived": archived_count, "failed": failed_count}
        logger.info("Expired chat session archive job completed", extra=result)
        return result

    async def save_turn_to_db(
        self,
        db: Session,
        child_id: str,
        session_id: str,
        user_message: str,
        ai_response: str,
    ) -> None:
        """Persist one user+assistant chat turn in Postgres.

        Caller is responsible for passing an open DB session.
        """
        await run_in_threadpool(
            self._db_save_turn_to_db,
            db=db,
            child_id=child_id,
            session_id=session_id,
            user_message=user_message,
            ai_response=ai_response,
        )

    async def archive_session_to_minio(
        self,
        db: Session,
        child_id: str,
        session_id: str,
    ) -> bool:
        """Archive one session from Postgres into MinIO as JSONL.

        Caller is responsible for passing an open DB session.
        """
        return await run_in_threadpool(
            self._db_archive_session_to_minio,
            db=db,
            child_id=child_id,
            session_id=session_id,
        )

    async def delete_session_from_db(
        self,
        db: Session,
        child_id: str,
        session_id: str,
        user_id: str,
        client: httpx.AsyncClient,
    ) -> None:
        """Delete session rows from Postgres then clear short-term cache.

        Caller is responsible for passing an open DB session and shared HTTP client.
        """
        await run_in_threadpool(
            self._db_delete_session_from_db,
            db=db,
            child_id=child_id,
            session_id=session_id,
            user_id=user_id,
            client=client,
        )

    async def archive_and_delete_expired_sessions(
        self,
        db: Session,
        user_id: str,
        client: httpx.AsyncClient,
    ) -> dict:
        """Archive then delete sessions older than the retention threshold.

        Caller is responsible for passing an open DB session and shared HTTP client.
        """
        return await run_in_threadpool(
            self._db_archive_and_delete_expired_sessions,
            db=db,
            user_id=user_id,
            client=client,
        )


chat_history_service = ChatHistoryService()
