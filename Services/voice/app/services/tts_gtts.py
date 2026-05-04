from io import BytesIO

from gtts import gTTS


class GttsTtsProvider:
    def __init__(self, default_language: str = "en"):
        self.default_language = default_language

    def synthesize(self, text: str, language: str | None = None) -> bytes:
        selected_language = (language or self.default_language).strip().lower()
        audio_buffer = BytesIO()
        gTTS(text=text, lang=selected_language).write_to_fp(audio_buffer)
        return audio_buffer.getvalue()