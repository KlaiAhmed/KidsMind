import io
import json
from collections.abc import AsyncGenerator
from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from controllers.chat.chat import _resolve_owned_child_profile, chat_message_controller
from core.config import settings
from core.database import SessionLocal
from core.storage import minio_client
from models.chat.chat_session import ChatSession
from models.voice.voice_transcription import VoiceTranscription
from services.chat.chat_session_service import create_session_for_child
from services.child.child_profile_context_cache import get_child_profile_context
from utils.media.file_name import generate_audio_file_storage_path
from utils.shared.logger import logger
from utils.chat.sse import format_chat_delta, format_chat_end, format_chat_error, format_chat_start, format_sse, new_message_id


def _resolve_or_create_chat_session(
    db: Session,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
) -> tuple[object, ChatSession]:
    child_profile = _resolve_owned_child_profile(db=db, user_id=user_id, child_id=child_id)
    if child_profile.is_paused:
        raise HTTPException(status_code=403, detail="Child profile is paused — chat is disabled")

    existing_session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if existing_session and existing_session.child_profile_id != child_profile.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    chat_session = existing_session
    if not chat_session:
        chat_session = create_session_for_child(db=db, child_id=child_profile.id, session_id=session_id)

    return child_profile, chat_session


async def _load_owned_chat_session_context_or_create(
    db: Session,
    redis: object,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict[str, str | bool] | None = None,
) -> tuple[object, ChatSession, dict[str, str | bool]]:
    child_profile, chat_session = await run_in_threadpool(
        _resolve_or_create_chat_session,
        db,
        user_id,
        child_id,
        session_id,
    )
    if profile_context is None:
        profile_context = await get_child_profile_context(child_profile.id, redis, db)
    return child_profile, chat_session, profile_context


def _upload_audio_bytes(
    *,
    audio_bytes: bytes,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    content_type: str,
    filename: str | None,
) -> str:
    object_key = generate_audio_file_storage_path(
        filename or "audio",
        user_id=str(user_id),
        child_id=str(child_id),
        session_id=str(session_id),
        store_audio=True,
    )

    metadata = {
        "user_id": str(user_id),
        "child_id": str(child_id),
        "session_id": str(session_id),
        "original_filename": filename or "",
        "content_type": content_type,
        "file_size": str(len(audio_bytes)),
    }

    minio_client.put_object(
        bucket_name="media-private",
        object_name=object_key,
        data=io.BytesIO(audio_bytes),
        length=len(audio_bytes),
        content_type=content_type,
        metadata=metadata,
    )

    return object_key


def _store_audio_background(
    *,
    transcription_db_id: UUID,
    audio_bytes: bytes,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    content_type: str,
    filename: str | None,
) -> None:
    db = SessionLocal()
    try:
        object_key = _upload_audio_bytes(
            audio_bytes=audio_bytes,
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            content_type=content_type,
            filename=filename,
        )

        record = (
            db.query(VoiceTranscription)
            .filter(VoiceTranscription.id == transcription_db_id)
            .first()
        )
        if not record:
            logger.warning(
                "Voice transcription row missing during audio storage",
                extra={"transcription_id": str(transcription_db_id)},
            )
            return

        record.audio_stored = True
        record.minio_object_key = object_key
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Background audio storage failed")
    finally:
        db.close()


def _persist_transcription_background(
    *,
    session_id: UUID,
    child_id: UUID,
    transcription_id: str,
    text: str,
    language: str,
    duration_seconds: float,
    audio_storage_enabled: bool,
    audio_bytes: bytes,
    user_id: UUID,
    content_type: str,
    filename: str | None,
) -> None:
    db = SessionLocal()
    try:
        record = VoiceTranscription(
            session_id=session_id,
            child_id=child_id,
            transcription_id=transcription_id,
            text=text,
            language=language or None,
            duration_seconds=duration_seconds,
            audio_stored=False,
            minio_object_key=None,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        logger.exception("Background transcription persistence failed")
        db.close()
        return

    if audio_storage_enabled:
        try:
            object_key = _upload_audio_bytes(
                audio_bytes=audio_bytes,
                user_id=user_id,
                child_id=child_id,
                session_id=session_id,
                content_type=content_type,
                filename=filename,
            )
            record.audio_stored = True
            record.minio_object_key = object_key
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Background audio storage failed")

    db.close()


def _map_stt_status_to_error(status_code: int) -> dict[str, str]:
    if status_code == 400:
        return {
            "code": "empty_audio",
            "message": "Could not hear you clearly. Try again in a quiet place.",
        }
    if status_code == 413:
        return {"code": "audio_too_large", "message": "Audio file too large."}
    if status_code == 415:
        return {"code": "unsupported_format", "message": "Unsupported audio format."}
    if status_code == 422:
        return {"code": "decode_error", "message": "Audio decoding failed."}
    if status_code == 503:
        return {"code": "stt_busy", "message": "Voice service busy, try again."}
    return {"code": "stt_unreachable", "message": "Voice service unavailable. Please try again."}


def _map_tts_status_to_error(status_code: int) -> dict[str, str]:
    if status_code == 400:
        return {"code": "invalid_text", "message": "Text is required."}
    if status_code == 413:
        return {"code": "text_too_long", "message": "Text is too long."}
    if status_code == 415:
        return {"code": "unsupported_language", "message": "Unsupported language."}
    if status_code == 422:
        return {"code": "tts_validation_error", "message": "TTS request validation failed."}
    if status_code == 503:
        return {"code": "tts_busy", "message": "Voice service busy, try again."}
    return {"code": "tts_unreachable", "message": "Voice service unavailable. Please try again."}


def _parse_sse_event(event_bytes: bytes) -> tuple[str | None, dict]:
    event_type: str | None = None
    data_lines: list[str] = []
    try:
        text = event_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return None, {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("event:"):
            event_type = line[6:].strip()
        elif line.startswith("data:"):
            data_lines.append(line[5:].strip())

    return event_type, _parse_json_payload("\n".join(data_lines))


def _http_exception_to_sse_error(exc: HTTPException, message_id: str | None = None) -> bytes:
    detail = exc.detail
    if isinstance(detail, dict):
        message = str(detail.get("message") or detail.get("detail") or "Request failed")
    elif isinstance(detail, str):
        message = detail
    else:
        message = "Request failed"
    return format_chat_error(f"http_{exc.status_code}", message, message_id or new_message_id())


def _speech_tts_language(profile_context: dict, transcription_language: str | None = None) -> str:
    language = str(profile_context.get("language") or transcription_language or settings.DEFAULT_LANGUAGE)
    normalized = language.strip().lower()
    return normalized or settings.DEFAULT_LANGUAGE


def voice_transcribe_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
    stream: bool = False,
) -> dict | AsyncGenerator[bytes, None]:
    if stream:
        return _voice_transcribe_stream_controller(
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            profile_context=profile_context,
            audio_file=audio_file,
            context=context,
            content_type=content_type,
            background_tasks=background_tasks,
            db=db,
            redis=redis,
            stt_client=stt_client,
        )

    return _voice_transcribe_sync_controller(
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        profile_context=profile_context,
        audio_file=audio_file,
        context=context,
        content_type=content_type,
        background_tasks=background_tasks,
        db=db,
        redis=redis,
        stt_client=stt_client,
    )


def voice_speech_to_speech_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
    external_client: httpx.AsyncClient,
    stream: bool = False,
) -> dict | AsyncGenerator[bytes, None]:
    if stream:
        return _voice_speech_to_speech_stream_controller(
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            profile_context=profile_context,
            audio_file=audio_file,
            context=context,
            content_type=content_type,
            background_tasks=background_tasks,
            db=db,
            redis=redis,
            stt_client=stt_client,
            external_client=external_client,
        )

    return _voice_speech_to_speech_sync_controller(
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        profile_context=profile_context,
        audio_file=audio_file,
        context=context,
        content_type=content_type,
        background_tasks=background_tasks,
        db=db,
        redis=redis,
        stt_client=stt_client,
        external_client=external_client,
    )


async def voice_tts_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    current_user_id: UUID,
    text: str,
    language: str,
    stt_client: httpx.AsyncClient,
    stream: bool = False,
) -> Response | StreamingResponse:
    if stream:
        return await _voice_tts_stream_controller(
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            current_user_id=current_user_id,
            text=text,
            language=language,
            stt_client=stt_client,
        )

    return await _voice_tts_sync_controller(
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        current_user_id=current_user_id,
        text=text,
        language=language,
        stt_client=stt_client,
    )


async def _voice_speech_to_speech_sync_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
    external_client: httpx.AsyncClient,
) -> dict:
    transcription = await voice_transcribe_controller(
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        profile_context=profile_context,
        audio_file=audio_file,
        context=context,
        content_type=content_type,
        background_tasks=background_tasks,
        db=db,
        redis=redis,
        stt_client=stt_client,
        stream=False,
    )

    transcribed_text = str(transcription.get("text") or "").strip()
    if not transcribed_text:
        raise HTTPException(
            status_code=400,
            detail="Could not hear you clearly. Try again in a quiet place.",
        )

    chat_payload = await chat_message_controller(
        db=db,
        redis=redis,
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        text=transcribed_text,
        context=context,
        input_source="voice",
        stream=False,
        external_client=external_client,
        background_tasks=background_tasks,
    )

    content = str(chat_payload.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=502, detail="AI response was empty. Please try again.")

    language = _speech_tts_language(profile_context, str(transcription.get("language") or ""))

    return {
        "transcription": {
            "transcription_id": str(transcription.get("transcription_id") or ""),
            "text": transcribed_text,
            "language": str(transcription.get("language") or ""),
            "duration_seconds": float(transcription.get("duration_seconds") or 0.0),
        },
        "message": {
            "message_id": str(chat_payload.get("message_id") or new_message_id()),
            "child_id": str(chat_payload.get("child_id") or child_id),
            "session_id": str(chat_payload.get("session_id") or session_id),
            "content": content,
        },
        "tts": {
            "language": language,
            "media_type": "audio/mpeg",
        },
    }


async def _voice_speech_to_speech_stream_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
    external_client: httpx.AsyncClient,
) -> AsyncGenerator[bytes, None]:
    final_text = ""
    transcription_message_id: str | None = None

    try:
        transcription_stream = voice_transcribe_controller(
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            profile_context=profile_context,
            audio_file=audio_file,
            context=context,
            content_type=content_type,
            background_tasks=background_tasks,
            db=db,
            redis=redis,
            stt_client=stt_client,
            stream=True,
        )

        async for chunk in transcription_stream:
            yield chunk
            event_type, payload = _parse_sse_event(chunk)
            if event_type == "start":
                transcription_message_id = str(payload.get("message_id") or "")
            elif event_type == "end":
                final_text = str(payload.get("text") or "").strip()
            elif event_type == "error":
                return
    except HTTPException as exc:
        yield _http_exception_to_sse_error(exc, transcription_message_id)
        return
    except Exception:
        logger.exception(
            "Speech-to-speech transcription stream failed",
            extra={"user_id": str(user_id), "child_id": str(child_id), "session_id": str(session_id)},
        )
        yield format_chat_error(
            "stt_unreachable",
            "Voice service unavailable. Please try again.",
            transcription_message_id or new_message_id(),
        )
        return

    if not final_text:
        yield format_chat_error(
            "empty_audio",
            "Could not hear you clearly. Try again in a quiet place.",
            transcription_message_id or new_message_id(),
        )
        return

    try:
        chat_response = await chat_message_controller(
            db=db,
            redis=redis,
            user_id=user_id,
            child_id=child_id,
            session_id=session_id,
            text=final_text,
            context=context,
            input_source="voice",
            stream=True,
            external_client=external_client,
            background_tasks=background_tasks,
        )
    except HTTPException as exc:
        yield _http_exception_to_sse_error(exc)
        return
    except Exception:
        logger.exception(
            "Speech-to-speech chat stream failed",
            extra={"user_id": str(user_id), "child_id": str(child_id), "session_id": str(session_id)},
        )
        yield format_chat_error("internal_error", "Stream interrupted", new_message_id())
        return

    if not isinstance(chat_response, StreamingResponse):
        yield format_chat_error("internal_error", "Stream interrupted", new_message_id())
        return

    async for chunk in chat_response.body_iterator:
        if isinstance(chunk, bytes):
            yield chunk
        else:
            yield str(chunk).encode("utf-8")


async def _voice_tts_sync_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    current_user_id: UUID,
    text: str,
    language: str,
    stt_client: httpx.AsyncClient,
) -> Response:
    logger.info(
        "TTS request received",
        extra={
            "user_id": str(current_user_id),
            "path_user_id": str(user_id),
            "child_id": str(child_id),
            "session_id": str(session_id),
            "text_length_chars": len(text),
            "language": language,
            "stream": False,
        },
    )

    try:
        response = await stt_client.post(
            f"{settings.VOICE_SERVICE_URL}/v1/tts",
            data={"text": text, "language": language},
            timeout=settings.VOICE_REQUEST_TIMEOUT_SECONDS,
        )
    except httpx.RequestError as exc:
        logger.warning("Voice service request failed", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Voice service unavailable.") from exc

    if response.status_code != 200:
        error_payload = _map_tts_status_to_error(response.status_code)
        raise HTTPException(
            status_code=response.status_code if response.status_code in {400, 413, 415, 422, 503} else 502,
            detail=error_payload["message"],
        )

    return Response(content=response.content, media_type="audio/mpeg")


async def _voice_tts_stream_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    current_user_id: UUID,
    text: str,
    language: str,
    stt_client: httpx.AsyncClient,
) -> StreamingResponse:
    logger.info(
        "TTS streaming request received",
        extra={
            "user_id": str(current_user_id),
            "path_user_id": str(user_id),
            "child_id": str(child_id),
            "session_id": str(session_id),
            "text_length_chars": len(text),
            "language": language,
            "stream": True,
        },
    )

    request = stt_client.build_request(
        "POST",
        f"{settings.VOICE_SERVICE_URL}/v1/tts/stream",
        data={"text": text, "language": language},
    )
    try:
        response = await stt_client.send(request, stream=True)
    except httpx.RequestError as exc:
        logger.warning("Voice service request failed", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Voice service unavailable.") from exc

    if response.status_code != 200:
        error_payload = _map_tts_status_to_error(response.status_code)
        await response.aclose()
        raise HTTPException(status_code=response.status_code if response.status_code in {400, 413, 415, 422, 503} else 502, detail=error_payload["message"])

    async def _audio_stream() -> AsyncGenerator[bytes, None]:
        try:
            async for chunk in response.aiter_bytes(chunk_size=4096):
                yield chunk
        finally:
            await response.aclose()

    return StreamingResponse(
        _audio_stream(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
async def _voice_transcribe_sync_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
) -> dict:
    child_profile, chat_session, profile_context = await _load_owned_chat_session_context_or_create(
        db=db,
        redis=redis,
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        profile_context=profile_context,
    )

    audio_storage_enabled = bool(profile_context.get("audio_storage_enabled", False))

    audio_bytes = await audio_file.read()
    filename = audio_file.filename or "audio"
    request_content_type = content_type or audio_file.content_type or "application/octet-stream"

    try:
        stt_response = await stt_client.post(
            f"{settings.VOICE_SERVICE_URL}/v1/stt/transcriptions",
            files={"audio": (filename, audio_bytes, request_content_type)},
            data={"context": context, "content_type": request_content_type},
            timeout=settings.VOICE_REQUEST_TIMEOUT_SECONDS,
        )
    except httpx.RequestError as exc:
        logger.warning("Voice service request failed", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="Voice service unavailable.") from exc

    if stt_response.status_code != 200:
        error_payload = _map_stt_status_to_error(stt_response.status_code)
        if error_payload["code"] == "empty_audio":
            raise HTTPException(status_code=400, detail=error_payload["message"])
        if stt_response.status_code == 503:
            raise HTTPException(status_code=503, detail=error_payload["message"])
        if stt_response.status_code in {413, 415, 422}:
            raise HTTPException(status_code=stt_response.status_code, detail=error_payload["message"])
        raise HTTPException(status_code=502, detail="Voice service unavailable.")

    payload = stt_response.json()
    text = str(payload.get("text") or "").strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not hear you clearly. Try again in a quiet place.",
        )

    language = str(payload.get("language") or "")
    duration_seconds_value = payload.get("duration_seconds")
    if isinstance(duration_seconds_value, (int, float)):
        duration_seconds = float(duration_seconds_value)
    else:
        duration_seconds = 0.0

    transcription_id = str(uuid4())
    record = VoiceTranscription(
        session_id=chat_session.id,
        child_id=child_profile.id,
        transcription_id=transcription_id,
        text=text,
        language=language or None,
        duration_seconds=duration_seconds,
        audio_stored=False,
        minio_object_key=None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    if audio_storage_enabled:
        background_tasks.add_task(
            _store_audio_background,
            transcription_db_id=record.id,
            audio_bytes=audio_bytes,
            user_id=user_id,
            child_id=child_profile.id,
            session_id=chat_session.id,
            content_type=request_content_type,
            filename=filename,
        )

    return {
        "transcription_id": transcription_id,
        "text": text,
        "language": language,
        "duration_seconds": duration_seconds,
    }


async def _voice_transcribe_stream_controller(
    *,
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    profile_context: dict,
    audio_file: UploadFile,
    context: str,
    content_type: str,
    background_tasks,
    db: Session,
    redis: object,
    stt_client: httpx.AsyncClient,
) -> AsyncGenerator[bytes, None]:
    child_profile, chat_session, profile_context = await _load_owned_chat_session_context_or_create(
        db=db,
        redis=redis,
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        profile_context=profile_context,
    )

    audio_storage_enabled = bool(profile_context.get("audio_storage_enabled", False))

    audio_bytes = await audio_file.read()
    filename = audio_file.filename or "audio"
    request_content_type = content_type or audio_file.content_type or "application/octet-stream"

    transcription_id = str(uuid4())
    yield format_chat_start(message_id=transcription_id, child_id=str(child_id), message_type="transcription")

    had_error = False
    final_text = ""
    final_language = ""
    final_duration = 0.0

    try:
        async with stt_client.stream(
            "POST",
            f"{settings.VOICE_SERVICE_URL}/v1/stt/transcriptions/stream",
            files={"audio": (filename, audio_bytes, request_content_type)},
            data={"context": context, "content_type": request_content_type},
            timeout=settings.VOICE_REQUEST_TIMEOUT_SECONDS,
        ) as stt_response:
            if stt_response.status_code != 200:
                had_error = True
                error_payload = _map_stt_status_to_error(stt_response.status_code)
                yield format_chat_error(error_payload["code"], error_payload["message"], transcription_id)
                return

            buffer_event = None
            buffer_data_lines: list[str] = []

            async for line in stt_response.aiter_lines():
                line = line.strip()
                if not line:
                    if buffer_event:
                        payload_text = "\n".join(buffer_data_lines).strip()

                        if buffer_event == "segment":
                            segment_payload = _parse_json_payload(payload_text)
                            yield format_chat_delta(str(segment_payload.get("text") or ""))
                        elif buffer_event == "final":
                            final_payload = _parse_json_payload(payload_text)
                            final_text = str(final_payload.get("text") or "")
                            final_language = str(final_payload.get("language") or "")
                            duration_value = final_payload.get("duration_seconds")
                            if isinstance(duration_value, (int, float)):
                                final_duration = float(duration_value)
                            else:
                                final_duration = 0.0

                            yield format_sse(
                                "end",
                                {
                                    "message_id": transcription_id,
                                    "finish_reason": "stop",
                                    "text": final_text,
                                    "language": final_language,
                                    "duration_seconds": final_duration,
                                },
                            )
                        elif buffer_event == "error":
                            had_error = True
                            error_payload = _parse_json_payload(payload_text)
                            error_code = str(error_payload.get("code") or "stt_unreachable")
                            error_message = str(error_payload.get("message") or "Voice service unavailable. Please try again.")
                            yield format_chat_error(error_code, error_message, transcription_id)

                        buffer_event = None
                        buffer_data_lines = []
                    continue

                if line.startswith("event:"):
                    buffer_event = line[6:].strip()
                elif line.startswith("data:"):
                    buffer_data_lines.append(line[5:].strip())
    except httpx.RequestError as exc:
        had_error = True
        logger.warning("STT streaming request failed", extra={"error": str(exc)})
        yield format_chat_error(
            "stt_unreachable",
            "Voice service unavailable. Please try again.",
            transcription_id,
        )
        return

    if not had_error and final_text:
        background_tasks.add_task(
            _persist_transcription_background,
            session_id=chat_session.id,
            child_id=child_profile.id,
            transcription_id=transcription_id,
            text=final_text,
            language=final_language,
            duration_seconds=final_duration,
            audio_storage_enabled=audio_storage_enabled,
            audio_bytes=audio_bytes,
            user_id=user_id,
            content_type=content_type,
            filename=filename,
        )
    elif not had_error:
        yield format_chat_error(
            "empty_audio",
            "Could not hear you clearly. Try again in a quiet place.",
            transcription_id,
        )


def _parse_json_payload(payload_text: str) -> dict:
    if not payload_text:
        return {}
    try:
        parsed_payload = json.loads(payload_text)
    except json.JSONDecodeError:
        return {}
    if isinstance(parsed_payload, dict):
        return parsed_payload
    return {}
