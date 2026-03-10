from fastapi import HTTPException
import httpx
import time

from services.transcribe import transcribe_audio
from services.detect_lang import detect_language
from schemas.stt_schemas import TranscriptionResult, TranscriptionRequest
from utils.process_audio import decode_audio, fetch_audio
from utils.logger import logger


async def stt_controller(request: TranscriptionRequest, client: httpx.AsyncClient, models: tuple) -> TranscriptionResult:
    """
    Accepts : 
    - audio_url: URL to the audio file to be transcribed
    - context: Optional context to assist with transcription (e.g., expected language, domain-specific terms)

    Transcription pipeline:
        1. Fetch audio from URL
        2. Decode raw audio bytes
        3. Detect language (offloaded to thread)
        4. Transcribe (offloaded to thread)
        5. Return a typed result
    """

    try:
        duration = time.perf_counter()

        # Step 1: Fetch audio from URL
        audio_bytes = await fetch_audio(request.audio_url, client)

        # Step 2: Decode raw audio bytes
        audio_file = decode_audio(audio_bytes)

        main_model, tiny_model = models

        # Step 3: Detect language (offloaded to thread)
        detected_language = await detect_language(tiny_model, audio_file) # Optional: U can add threshold default 0.5

        # Step 4: Transcribe (offloaded to thread)
        text = await transcribe_audio(main_model, audio_file, detected_language, request.initial_prompt)

        duration = time.perf_counter() - duration

        logger.info(f"Transcription complete duration_seconds={round(duration, 3)}, detected_language={detected_language}, text_length_chars={len(text)}")

        return TranscriptionResult(
            text=text,
            language=detected_language,
            duration_seconds=round(duration, 3),
        )

    except Exception as e:
        logger.error(f"STT Controller Error: {e}")
        raise HTTPException(status_code=500, detail=f"STT Controller Error: {e}")
    
