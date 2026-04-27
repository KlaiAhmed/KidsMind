import threading

from langchain_openai import ChatOpenAI
from core.config import settings

_llm: ChatOpenAI | None = None
_llm_streaming: ChatOpenAI | None = None
_lock = threading.Lock()


def _build_llm(streaming: bool) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.API_KEY,
        base_url=settings.BASE_URL,
        temperature=0.3,
        max_tokens=1500,
        timeout=60,
        max_retries=2,
        streaming=streaming,
    )


def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        with _lock:
            if _llm is None:
                _llm = _build_llm(streaming=False)
    return _llm


def get_llm_streaming() -> ChatOpenAI:
    global _llm_streaming
    if _llm_streaming is None:
        with _lock:
            if _llm_streaming is None:
                _llm_streaming = _build_llm(streaming=True)
    return _llm_streaming
