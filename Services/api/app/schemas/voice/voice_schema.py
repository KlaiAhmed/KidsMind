from pydantic import BaseModel, ConfigDict


class TranscribeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcription_id: str
    text: str
    language: str
    duration_seconds: float


class SpeechToSpeechTranscription(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcription_id: str
    text: str
    language: str
    duration_seconds: float


class SpeechToSpeechMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: str
    child_id: str
    session_id: str
    content: str


class SpeechToSpeechTts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    language: str
    media_type: str = "audio/mpeg"


class SpeechToSpeechResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcription: SpeechToSpeechTranscription
    message: SpeechToSpeechMessage
    tts: SpeechToSpeechTts
