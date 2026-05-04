from abc import ABC, abstractmethod
from functools import lru_cache
from typing import AsyncGenerator

from core.config import settings

from services.tts_gtts import GttsTtsProvider


class TtsProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str, language: str | None = None) -> bytes:
        raise NotImplementedError


class UnsupportedTtsProviderError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_tts_provider() -> TtsProvider:
    provider_name = settings.TTS_PROVIDER

    if provider_name == "gtts":
        return GttsTtsProvider(default_language=settings.TTS_DEFAULT_LANGUAGE)

    raise UnsupportedTtsProviderError(f"Unsupported TTS provider: {provider_name}")


def synthesize_tts(text: str, language: str | None = None) -> bytes:
    provider = get_tts_provider()
    return provider.synthesize(text=text, language=language)


async def stream_tts_audio(
    text: str,
    language: str | None = None,
    chunk_size: int = 4096,
) -> AsyncGenerator[bytes, None]:
    audio_bytes = synthesize_tts(text=text, language=language)
    for index in range(0, len(audio_bytes), chunk_size):
        yield audio_bytes[index : index + chunk_size]