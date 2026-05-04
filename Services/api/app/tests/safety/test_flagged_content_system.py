import asyncio
import os
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.responses import StreamingResponse

os.environ.setdefault("DB_PASSWORD", "test-password")
os.environ.setdefault("STORAGE_ROOT_PASSWORD", "test-password")
os.environ.setdefault("CACHE_PASSWORD", "test-password")

from core.config import settings
from controllers.chat import chat as chat_module
from services.safety.moderation import check_moderation
from services.safety.safe_response_service import build_safe_child_message


class DummyDb:
    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None


class DummyBackgroundTasks:
    def add_task(self, *args, **kwargs) -> None:
        return None


async def collect_stream(response: StreamingResponse) -> str:
    chunks: list[str] = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode("utf-8") if isinstance(chunk, bytes) else str(chunk))
    return "".join(chunks)


@pytest.fixture(autouse=True)
def _restore_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "IS_PROD", True, raising=False)


def test_safe_response_uses_age_specific_copy() -> None:
    message = build_safe_child_message(age_group="7-11", language="en")

    assert "safer question" in message


def test_moderation_fails_closed_when_prod_api_key_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "GUARD_API_KEY", None, raising=False)
    monkeypatch.setattr(settings, "GUARD_API_URL", "https://example.invalid/moderation", raising=False)
    monkeypatch.setattr(settings, "GUARD_MODEL_NAME", "test-model", raising=False)

    result = asyncio.run(check_moderation("unsafe text", "context", client=SimpleNamespace()))

    assert result["blocked"] is True
    assert result["failure_kind"] == "config_missing"
    assert result["category"] == "moderation_unavailable"


def test_chat_message_controller_blocks_flagged_input(monkeypatch: pytest.MonkeyPatch) -> None:
    child_id = uuid4()
    session_id = uuid4()
    parent_id = uuid4()
    child_profile = SimpleNamespace(id=child_id, is_paused=False, parent_id=parent_id)
    chat_session = SimpleNamespace(id=session_id)
    calls: list[str] = []

    async def fake_load_context(**kwargs):
        return child_profile, {"age_group": "7-11", "language": "en"}

    async def fake_resolve_session(*args, **kwargs):
        return chat_session

    async def fake_moderation(**kwargs):
        calls.append("moderation")
        return {
            "blocked": True,
            "category": "sexual",
            "reason": "blocked",
            "score": 0.9,
            "threshold": 0.25,
            "raw": {"flagged": True},
            "failure_kind": None,
        }

    monkeypatch.setattr(chat_module, "_load_owned_child_profile_context", fake_load_context)
    monkeypatch.setattr(chat_module, "_resolve_or_create_session", fake_resolve_session)
    monkeypatch.setattr(chat_module, "get_moderation_service", lambda: fake_moderation)
    monkeypatch.setattr(chat_module, "save_flagged_chat_message", lambda *args, **kwargs: SimpleNamespace(id=123))
    monkeypatch.setattr(chat_module, "update_session_flag_counters", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "persist_flagged_message_and_notify_parent", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "write_audit_log", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "_run_gamification", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "ai_service", SimpleNamespace(stream_chat_text=lambda **kwargs: (_ for _ in ()).throw(AssertionError("AI should not be called for flagged input"))))

    result = asyncio.run(
        chat_module.chat_message_controller(
            db=DummyDb(),
            redis=SimpleNamespace(),
            user_id=parent_id,
            child_id=child_id,
            session_id=session_id,
            text="unsafe text",
            context="",
            input_source="keyboard",
            stream=False,
            external_client=SimpleNamespace(),
            background_tasks=DummyBackgroundTasks(),
        )
    )

    assert calls == ["moderation"]
    assert result["type"] == "flagged"
    assert result["flagged"] is True
    assert "can't help" in result["content"].lower()


def test_chat_message_controller_streams_flagged_input_and_terminates(monkeypatch: pytest.MonkeyPatch) -> None:
    child_id = uuid4()
    session_id = uuid4()
    parent_id = uuid4()
    child_profile = SimpleNamespace(id=child_id, is_paused=False, parent_id=parent_id)
    chat_session = SimpleNamespace(id=session_id)

    async def fake_load_context(**kwargs):
        return child_profile, {"age_group": "7-11", "language": "en"}

    async def fake_resolve_session(*args, **kwargs):
        return chat_session

    async def fake_moderation(**kwargs):
        return {
            "blocked": True,
            "category": "violence",
            "reason": "blocked",
            "score": 0.95,
            "threshold": 0.25,
            "raw": {"flagged": True},
            "failure_kind": None,
        }

    monkeypatch.setattr(chat_module, "_load_owned_child_profile_context", fake_load_context)
    monkeypatch.setattr(chat_module, "_resolve_or_create_session", fake_resolve_session)
    monkeypatch.setattr(chat_module, "get_moderation_service", lambda: fake_moderation)
    monkeypatch.setattr(chat_module, "save_flagged_chat_message", lambda *args, **kwargs: SimpleNamespace(id=123))
    monkeypatch.setattr(chat_module, "update_session_flag_counters", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "persist_flagged_message_and_notify_parent", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "write_audit_log", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "ai_service", SimpleNamespace(stream_chat_text=lambda **kwargs: (_ for _ in ()).throw(AssertionError("AI should not be called for flagged input"))))

    result = asyncio.run(
        chat_module.chat_message_controller(
            db=DummyDb(),
            redis=SimpleNamespace(),
            user_id=parent_id,
            child_id=child_id,
            session_id=session_id,
            text="unsafe text",
            context="",
            input_source="keyboard",
            stream=True,
            external_client=SimpleNamespace(),
            background_tasks=DummyBackgroundTasks(),
        )
    )

    assert isinstance(result, StreamingResponse)
    payload = asyncio.run(collect_stream(result))

    assert "event: start" in payload
    assert "event: flagged" in payload
    assert '"type": "flagged"' in payload
    assert '"flagged": true' in payload
    assert "event: delta" in payload
    assert "event: end" in payload


def test_chat_message_controller_streams_flagged_output_and_terminates(monkeypatch: pytest.MonkeyPatch) -> None:
    child_id = uuid4()
    session_id = uuid4()
    parent_id = uuid4()
    child_profile = SimpleNamespace(id=child_id, is_paused=False, parent_id=parent_id)
    chat_session = SimpleNamespace(id=session_id)
    moderation_calls: list[str] = []
    persisted: list[str] = []

    async def fake_load_context(**kwargs):
        return child_profile, {"age_group": "7-11", "language": "en"}

    async def fake_resolve_session(*args, **kwargs):
        return chat_session

    async def fake_moderation(**kwargs):
        moderation_calls.append(kwargs["message"])
        if len(moderation_calls) == 1:
            return {
                "blocked": False,
                "category": None,
                "reason": None,
                "score": None,
                "threshold": None,
                "raw": {"flagged": False},
                "failure_kind": None,
            }
        return {
            "blocked": True,
            "category": "self-harm",
            "reason": "blocked output",
            "score": 0.96,
            "threshold": 0.25,
            "raw": {"flagged": True},
            "failure_kind": None,
        }

    async def fake_stream_chat_text(*, user, profile_context, text, context):
        yield "unsafe"
        yield " output"

    def fake_save_turn(*args, **kwargs):
        persisted.append(kwargs["ai_response"])
        return SimpleNamespace(id=1), SimpleNamespace(id=456)

    monkeypatch.setattr(chat_module, "_load_owned_child_profile_context", fake_load_context)
    monkeypatch.setattr(chat_module, "_resolve_or_create_session", fake_resolve_session)
    monkeypatch.setattr(chat_module, "get_moderation_service", lambda: fake_moderation)
    monkeypatch.setattr(chat_module.ai_service, "stream_chat_text", fake_stream_chat_text)
    monkeypatch.setattr(chat_module, "save_chat_turn_with_optional_flag", fake_save_turn)
    monkeypatch.setattr(chat_module, "update_session_flag_counters", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "persist_flagged_message_and_notify_parent", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "write_audit_log", lambda *args, **kwargs: None)
    monkeypatch.setattr(chat_module, "_run_gamification", lambda *args, **kwargs: None)

    result = asyncio.run(
        chat_module.chat_message_controller(
            db=DummyDb(),
            redis=SimpleNamespace(),
            user_id=parent_id,
            child_id=child_id,
            session_id=session_id,
            text="hello",
            context="",
            input_source="keyboard",
            stream=True,
            external_client=SimpleNamespace(),
            background_tasks=DummyBackgroundTasks(),
        )
    )

    assert isinstance(result, StreamingResponse)
    payload = asyncio.run(collect_stream(result))

    assert moderation_calls == ["hello", "unsafe output"]
    assert persisted == ["unsafe output"]
    assert "event: flagged" in payload
    assert '"flagged": true' in payload
    assert "unsafe output" not in payload
    assert "event: end" in payload


def test_chat_message_controller_stream_error_emits_error_event(monkeypatch: pytest.MonkeyPatch) -> None:
    child_id = uuid4()
    session_id = uuid4()
    parent_id = uuid4()
    child_profile = SimpleNamespace(id=child_id, is_paused=False, parent_id=parent_id)
    chat_session = SimpleNamespace(id=session_id)

    async def fake_load_context(**kwargs):
        return child_profile, {"age_group": "7-11", "language": "en"}

    async def fake_resolve_session(*args, **kwargs):
        return chat_session

    async def fake_moderation(**kwargs):
        return {
            "blocked": False,
            "category": None,
            "reason": None,
            "score": None,
            "threshold": None,
            "raw": {"flagged": False},
            "failure_kind": None,
        }

    async def fake_stream_chat_text(*, user, profile_context, text, context):
        raise RuntimeError("stream exploded")
        yield ""

    monkeypatch.setattr(chat_module, "_load_owned_child_profile_context", fake_load_context)
    monkeypatch.setattr(chat_module, "_resolve_or_create_session", fake_resolve_session)
    monkeypatch.setattr(chat_module, "get_moderation_service", lambda: fake_moderation)
    monkeypatch.setattr(chat_module.ai_service, "stream_chat_text", fake_stream_chat_text)
    monkeypatch.setattr(chat_module, "write_audit_log", lambda *args, **kwargs: None)

    result = asyncio.run(
        chat_module.chat_message_controller(
            db=DummyDb(),
            redis=SimpleNamespace(),
            user_id=parent_id,
            child_id=child_id,
            session_id=session_id,
            text="hello",
            context="",
            input_source="keyboard",
            stream=True,
            external_client=SimpleNamespace(),
            background_tasks=DummyBackgroundTasks(),
        )
    )

    assert isinstance(result, StreamingResponse)
    payload = asyncio.run(collect_stream(result))

    assert "event: start" in payload
    assert "event: error" in payload
    assert "Stream interrupted" in payload


def test_chat_message_controller_persists_clean_turn(monkeypatch: pytest.MonkeyPatch) -> None:
    child_id = uuid4()
    session_id = uuid4()
    parent_id = uuid4()
    child_profile = SimpleNamespace(id=child_id, is_paused=False, parent_id=parent_id)
    chat_session = SimpleNamespace(id=session_id)
    moderation_calls: list[str] = []
    saved_turns: list[tuple[str, str]] = []

    async def fake_load_context(**kwargs):
        return child_profile, {"age_group": "7-11", "language": "en"}

    async def fake_resolve_session(*args, **kwargs):
        return chat_session

    async def fake_moderation(**kwargs):
        moderation_calls.append(kwargs["message"])
        return {
            "blocked": False,
            "category": None,
            "reason": None,
            "score": None,
            "threshold": None,
            "raw": {"flagged": False},
            "failure_kind": None,
        }

    async def fake_save_turn_to_db(*, db, session_id, user_message, ai_response):
        saved_turns.append((user_message, ai_response))

    async def fake_gamification(*args, **kwargs):
        return None

    async def fake_stream_chat_text(*, user, profile_context, text, context):
        yield "Hello"
        yield " world"

    monkeypatch.setattr(chat_module, "_load_owned_child_profile_context", fake_load_context)
    monkeypatch.setattr(chat_module, "_resolve_or_create_session", fake_resolve_session)
    monkeypatch.setattr(chat_module, "get_moderation_service", lambda: fake_moderation)
    monkeypatch.setattr(chat_module.chat_history_service, "save_turn_to_db", fake_save_turn_to_db)
    monkeypatch.setattr(chat_module, "_run_gamification", fake_gamification)
    monkeypatch.setattr(chat_module.ai_service, "stream_chat_text", fake_stream_chat_text)
    monkeypatch.setattr(chat_module, "write_audit_log", lambda *args, **kwargs: None)

    result = asyncio.run(
        chat_module.chat_message_controller(
            db=DummyDb(),
            redis=SimpleNamespace(),
            user_id=parent_id,
            child_id=child_id,
            session_id=session_id,
            text="hello there",
            context="",
            input_source="keyboard",
            stream=False,
            external_client=SimpleNamespace(),
            background_tasks=DummyBackgroundTasks(),
        )
    )

    assert moderation_calls == ["hello there", "Hello world"]
    assert saved_turns == [("hello there", "Hello world")]
    assert result["content"] == "Hello world"
