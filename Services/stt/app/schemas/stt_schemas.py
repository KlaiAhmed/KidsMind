from pydantic import BaseModel, HttpUrl, Field
from typing import Optional


class TranscriptionRequest(BaseModel):
    audio_url: HttpUrl
    initial_prompt: Optional[str] = Field(default=None,description="Optional text passed to the model as context for the transcription.")


class TranscriptionResult(BaseModel):
    text: str = Field(description="The transcribed text.")
    language: Optional[str] = Field(default=None,description="The detected language of the audio.")
    duration_seconds: float = Field(description="Total time taken for language detection + transcription.")