from faster_whisper.audio import decode_audio as decode
from pathlib import PurePosixPath
from urllib.parse import urlparse
import httpx
import io

from core.config import settings
from utils.logger import logger
from exceptions import (
    AudioDecodeError,
    AudioFetchError,
    AudioTooLargeError,
    UnsupportedAudioFormatError,
)


def validate_audio_extension(url: str) -> str:
    """
    Extracts and validates the file extension from the URL path.
    Returns the extension if supported.
    Raises UnsupportedAudioFormatError if not.
    """
    path = PurePosixPath(urlparse(url).path)
    extension = path.suffix.lower()

    if not extension:
        logger.warning("Audio URL has no file extension", extra={"url": url})
        raise UnsupportedAudioFormatError(
            "Could not determine audio format: URL has no file extension."
        )

    if extension not in settings.SUPPORTED_AUDIO_EXTENSIONS:
        logger.warning("Audio URL has unsupported file extension", extra={"url": url, "extension": extension})
        raise UnsupportedAudioFormatError(
            f"Unsupported audio format '{extension}'. "
            f"Supported formats: {', '.join(sorted(settings.SUPPORTED_AUDIO_EXTENSIONS))}"
        )

    return extension

def validate_audio_size(content_length: str | None, audio_bytes: bytes) -> int:
    """
    Checks audio file size 
    Returns the size if valid
    Raises AudioTooLargeError if not
    """
    if content_length and int(content_length) > settings.MAX_AUDIO_BYTES:
        logger.warning("Audio file size exceeds the limit", extra={"content length": int(content_length)})
        raise AudioTooLargeError("Audio file exceeds the limit.")
    
    audio_size = len(audio_bytes)

    if audio_size > settings.MAX_AUDIO_BYTES:
        logger.warning("Audio file size exceeds the limit", extra={"size_bytes": audio_size})
        raise AudioTooLargeError("Audio file exceeds the limit.")

    return audio_size


async def fetch_audio(audio_url, client: httpx.AsyncClient):
    """
        - Validates the audio URL extension
        - Fetches the audio file using the provided HTTP client
        - Validates the audio file size
        - Returns the audio bytes if successful
        - Raises appropriate exceptions for various failure scenarios
    """
    audio_url = str(audio_url)

    validate_audio_extension(audio_url)

    try: 
        response = await client.get(audio_url, timeout=30.0)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error while fetching audio: {e.response.status_code} {e.response.reason_phrase}", extra={"audio_url": audio_url})
        raise AudioFetchError(f"Failed to fetch audio: {e.response.status_code} {e.response.reason_phrase}")
    except httpx.RequestError as e:
        logger.error(f"Request error while fetching audio: {e}", extra={"audio_url": audio_url})
        raise AudioFetchError(f"Failed to fetch audio: {e}")

    content_length = response.headers.get("content-length")
    audio_bytes = response.content

    validate_audio_size(content_length ,audio_bytes)
    
    return audio_bytes


def decode_audio(audio_bytes: bytes) -> bytes:
    """ Decodes audio bytes into raw audio data."""
    try:
        audio_file = decode(io.BytesIO(audio_bytes))

        return  audio_file
    except Exception as e:
        logger.error(f"Audio decoding failed: {e}")
        raise AudioDecodeError(f"Failed to decode audio: {e}")