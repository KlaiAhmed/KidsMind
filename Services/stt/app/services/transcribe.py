from functools import partial
from faster_whisper import WhisperModel
import asyncio
import io


def _transcribe_sync(model: WhisperModel, audio_file: io.BytesIO, language: str | None , initial_prompt: str | None ) -> str:
    """
    Synchronous transcription  runs in a thread pool.
    """
    segments, _ = model.transcribe(
        audio_file,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        condition_on_previous_text=False,
        language=language,
        initial_prompt=initial_prompt,
    )
    return " ".join(segment.text for segment in segments).strip()


async def transcribe_audio(main_model: WhisperModel, audio_file:io.BytesIO, language: str | None, initial_prompt: str | None = None) -> str :
    """
    Async wrapper around the synchronous transcription function.
    """

    fn = partial(_transcribe_sync, main_model, audio_file, language, initial_prompt)
    text = await asyncio.to_thread(fn)

    return text