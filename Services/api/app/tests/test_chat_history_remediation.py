from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest

from controllers.chat import DEFAULT_CHAT_HISTORY_LIMIT, get_history_controller
from models.chat_history import ChatHistory
from models.child_profile import ChildProfile
from models.user import User, UserRole
from services.chat_history import chat_history_service
from utils.child_profile_logic import EducationStage


pytestmark = pytest.mark.anyio


def _create_parent_and_child(db_session):
    parent = User(
        email="parent@example.com",
        username="parent-user",
        hashed_password="hashed-password",
        role=UserRole.PARENT,
        consent_terms=True,
        consent_data_processing=True,
    )
    db_session.add(parent)
    db_session.flush()

    child = ChildProfile(
        id=uuid4(),
        parent_id=parent.id,
        nickname="Nour",
        birth_date=date(2018, 1, 1),
        education_stage=EducationStage.PRIMARY,
        is_accelerated=False,
        is_below_expected_stage=False,
        languages=["en"],
    )
    db_session.add(child)
    db_session.commit()
    return parent, child


def _insert_history_rows(
    db_session,
    *,
    child_id: str,
    session_id: str,
    count: int,
    start_at: datetime | None = None,
):
    base_time = start_at or datetime(2024, 1, 1, tzinfo=timezone.utc)
    rows = [
        ChatHistory(
            child_id=child_id,
            session_id=session_id,
            role="user" if index % 2 == 0 else "assistant",
            content=f"message-{index}",
            created_at=base_time + timedelta(seconds=index),
        )
        for index in range(count)
    ]
    db_session.add_all(rows)
    db_session.commit()
    return rows


async def test_get_history_controller_returns_empty_history(db_session):
    parent, child = _create_parent_and_child(db_session)

    result = await get_history_controller(
        db=db_session,
        user_id=str(parent.id),
        child_id=child.id,
    )

    assert result["child_id"] == str(child.id)
    assert result["sessions"] == []
    assert result["pagination"] == {
        "limit": DEFAULT_CHAT_HISTORY_LIMIT,
        "offset": 0,
        "has_more": False,
    }


async def test_get_history_controller_accepts_uuid_child_id_for_small_history(db_session):
    parent, child = _create_parent_and_child(db_session)
    _insert_history_rows(
        db_session,
        child_id=str(child.id),
        session_id="session-small",
        count=2,
    )

    result = await get_history_controller(
        db=db_session,
        user_id=str(parent.id),
        child_id=child.id,
        session_id="session-small",
    )

    assert result["child_id"] == str(child.id)
    assert [session["session_id"] for session in result["sessions"]] == ["session-small"]
    assert [message["content"] for message in result["sessions"][0]["messages"]] == [
        "message-0",
        "message-1",
    ]
    assert result["pagination"]["has_more"] is False


async def test_get_history_controller_bounds_large_history_queries(db_session):
    parent, child = _create_parent_and_child(db_session)
    _insert_history_rows(
        db_session,
        child_id=str(child.id),
        session_id="session-large",
        count=250,
    )

    result = await get_history_controller(
        db=db_session,
        user_id=str(parent.id),
        child_id=child.id,
        session_id="session-large",
    )

    messages = result["sessions"][0]["messages"]

    assert len(messages) == DEFAULT_CHAT_HISTORY_LIMIT
    assert messages[0]["content"] == "message-50"
    assert messages[-1]["content"] == "message-249"
    assert result["pagination"] == {
        "limit": DEFAULT_CHAT_HISTORY_LIMIT,
        "offset": 0,
        "has_more": True,
    }


async def test_archive_session_to_minio_writes_jsonl_payload(db_session, monkeypatch):
    _, child = _create_parent_and_child(db_session)
    _insert_history_rows(
        db_session,
        child_id=str(child.id),
        session_id="archive-me",
        count=2,
    )

    captured: dict[str, object] = {}

    def fake_put_object(*, bucket_name, object_name, data, length, content_type):
        captured["bucket_name"] = bucket_name
        captured["object_name"] = object_name
        captured["payload"] = data.getvalue().decode("utf-8")
        captured["length"] = length
        captured["content_type"] = content_type

    monkeypatch.setattr("services.chat_history.minio_client.put_object", fake_put_object)

    archived = await chat_history_service.archive_session_to_minio(
        db=db_session,
        child_id=str(child.id),
        session_id="archive-me",
    )

    payload_lines = captured["payload"].strip().splitlines()

    assert archived is True
    assert captured["bucket_name"] == "chat-archive"
    assert captured["object_name"] == f"chat-history/{child.id}/archive-me.jsonl"
    assert captured["content_type"] == "application/x-ndjson"
    assert len(payload_lines) == 2
    assert '"content": "message-0"' in payload_lines[0]
    assert '"content": "message-1"' in payload_lines[1]


async def test_delete_session_from_db_rolls_back_when_cache_clear_fails(db_session, monkeypatch):
    parent, child = _create_parent_and_child(db_session)
    _insert_history_rows(
        db_session,
        child_id=str(child.id),
        session_id="rollback-session",
        count=2,
    )

    async def fail_cache_clear(*args, **kwargs):
        raise RuntimeError("cache unavailable")

    monkeypatch.setattr(chat_history_service, "_cache_clear_conversation_history", fail_cache_clear)

    with pytest.raises(RuntimeError, match="cache unavailable"):
        await chat_history_service.delete_session_from_db(
            db=db_session,
            child_id=str(child.id),
            session_id="rollback-session",
            user_id=str(parent.id),
            client=object(),
        )

    remaining_rows = (
        db_session.query(ChatHistory)
        .filter(
            ChatHistory.child_id == str(child.id),
            ChatHistory.session_id == "rollback-session",
        )
        .count()
    )

    assert remaining_rows == 2
