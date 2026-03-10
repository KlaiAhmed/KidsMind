class STTBaseError(Exception):
    """Base class for all STT service domain exceptions."""
    pass

class AudioFetchError(STTBaseError):
    """Raised when the audio file cannot be fetched from the given URL."""
    pass

class AudioTooLargeError(STTBaseError):
    """Raised when the audio file exceeds the maximum allowed size."""
    pass

class UnsupportedAudioFormatError(STTBaseError):
    """Raised when the audio file format is not supported."""
    pass

class AudioDecodeError(STTBaseError):
    """Raised when the audio file cannot be decoded."""
    pass

class TranscriptionError(STTBaseError):
    """Raised when transcription fails unexpectedly."""
    pass