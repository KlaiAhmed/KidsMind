import httpx
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Form, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from controllers.voice.voice import voice_speech_to_speech_controller, voice_transcribe_controller, voice_tts_controller
from dependencies.auth.auth import get_current_user
from dependencies.infrastructure.infrastructure import get_client, get_db, get_external_client, get_redis
from dependencies.media.media import validate_audio_file
from dependencies.voice.voice import check_voice_mode_enabled
from models.user.user import User
from schemas.voice.voice_schema import SpeechToSpeechResponse, TranscribeResponse


router = APIRouter()


@router.post(
    "/{user_id}/{child_id}/{session_id}/transcribe",
    summary="Transcribe audio with optional streaming",
    description="Upload audio and receive either a JSON transcription or normalized SSE events.",
    response_model=None,
)
async def transcribe_stream_route(
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = Depends(validate_audio_file),
    context: str = Form(""),
    content_type: str = Form(...),
    stream: bool = Query(False),
    current_user: User = Depends(get_current_user),
    profile_context: dict = Depends(check_voice_mode_enabled),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    stt_client: httpx.AsyncClient = Depends(get_client),
):
    controller_result = voice_transcribe_controller(
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
        stream=stream,
    )
    if stream:
        return StreamingResponse(
            controller_result,
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            background=background_tasks,
        )
    return await controller_result


# Deprecated temporary alias kept for mobile voiceService.ts compatibility.
@router.post(
    "/{user_id}/{child_id}/{session_id}/transcribe/sync",
    response_model=TranscribeResponse,
    summary="Synchronous audio transcription",
    description="Deprecated alias for the unified transcription endpoint.",
)
async def transcribe_sync_route(
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = Depends(validate_audio_file),
    context: str = Form(""),
    content_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    profile_context: dict = Depends(check_voice_mode_enabled),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    stt_client: httpx.AsyncClient = Depends(get_client),
) -> TranscribeResponse:
    payload = await voice_transcribe_controller(
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
    return TranscribeResponse(**payload)


@router.post(
    "/{user_id}/{child_id}/{session_id}/speech-to-speech",
    summary="Transcribe audio, generate an AI answer, and prepare TTS playback",
    description="Upload audio and receive either a JSON AI answer or normalized SSE text events. Audio playback uses the existing binary TTS endpoint.",
    response_model=None,
)
async def speech_to_speech_route(
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    background_tasks: BackgroundTasks,
    audio_file: UploadFile = Depends(validate_audio_file),
    context: str = Form(""),
    content_type: str = Form(...),
    stream: bool = Query(False),
    current_user: User = Depends(get_current_user),
    profile_context: dict = Depends(check_voice_mode_enabled),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    stt_client: httpx.AsyncClient = Depends(get_client),
    external_client: httpx.AsyncClient = Depends(get_external_client),
):
    controller_result = voice_speech_to_speech_controller(
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
        stream=stream,
    )
    if stream:
        return StreamingResponse(
            controller_result,
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
            background=background_tasks,
        )

    payload = await controller_result
    return SpeechToSpeechResponse(**payload)


@router.post(
    "/{user_id}/{child_id}/{session_id}/tts",
    summary="Synthesize text to speech with optional streaming",
    description="Upload text and receive either a binary MP3 file or streamed MP3 chunks.",
    response_model=None,
)
async def tts_route(
    user_id: UUID,
    child_id: UUID,
    session_id: UUID,
    text: str = Form(...),
    language: str = Form("en"),
    stream: bool = Query(False),
    current_user: User = Depends(get_current_user),
    stt_client: httpx.AsyncClient = Depends(get_client),
) -> Response | StreamingResponse:
    controller_result = await voice_tts_controller(
        user_id=user_id,
        child_id=child_id,
        session_id=session_id,
        current_user_id=current_user.id,
        text=text,
        language=language,
        stt_client=stt_client,
        stream=stream,
    )
    return controller_result
