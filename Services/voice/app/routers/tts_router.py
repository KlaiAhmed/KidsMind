from fastapi import APIRouter, Depends, Form
from fastapi.responses import StreamingResponse

from controllers.tts_controller import tts_full_controller, tts_stream_controller
from core.config import settings
from utils.auth import verify_service_token


router = APIRouter()


@router.post(
    "",
    dependencies=[Depends(verify_service_token)],
    summary="Synthesize text to MP3",
    description="Return a complete MP3 payload for the requested text and language.",
)
async def synthesize_tts_route(
    text: str = Form(...),
    language: str = Form(settings.TTS_DEFAULT_LANGUAGE),
):
    return tts_full_controller(text=text, language=language)


@router.post(
    "/stream",
    dependencies=[Depends(verify_service_token)],
    summary="Stream synthesized MP3 audio",
    description="Return chunked binary MP3 output for the requested text and language.",
)
async def synthesize_tts_stream_route(
    text: str = Form(...),
    language: str = Form(settings.TTS_DEFAULT_LANGUAGE),
):
    return StreamingResponse(
        tts_stream_controller(text=text, language=language),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )