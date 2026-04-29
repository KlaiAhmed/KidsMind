import threading

from langchain_openai import ChatOpenAI
from core.config import settings

_llm: ChatOpenAI | None = None
_llm_streaming: ChatOpenAI | None = None
_lock = threading.Lock()

_llm_profile_cache: dict[str, ChatOpenAI] = {}
_llm_profile_cache_lock = threading.Lock()


def _age_group_max_tokens(age_group: str) -> int:
    return settings.LLM_AGE_GROUP_MAX_TOKENS.get(age_group, 600)


def _build_llm(streaming: bool) -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.MODEL_NAME,
        api_key=settings.API_KEY,
        base_url=settings.BASE_URL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
        timeout=settings.LLM_TIMEOUT_SECONDS,
        max_retries=settings.LLM_MAX_RETRIES,
        streaming=streaming,
    )


def build_llm_for_profile(age_group: str, streaming: bool = True) -> ChatOpenAI:
    """Return a cached ChatOpenAI instance for the given age group and streaming mode.

    Instances are created once per (age_group, streaming) combination and reused,
    preserving the underlying httpx connection pool. ChatOpenAI is thread-safe
    for concurrent use — the SDK manages connection pooling internally.
    """
    cache_key = f"{age_group}:{streaming}"
    if cache_key in _llm_profile_cache:
        return _llm_profile_cache[cache_key]
    with _llm_profile_cache_lock:
        if cache_key in _llm_profile_cache:
            return _llm_profile_cache[cache_key]
        instance = ChatOpenAI(
            model=settings.MODEL_NAME,
            api_key=settings.API_KEY,
            base_url=settings.BASE_URL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=_age_group_max_tokens(age_group),
            timeout=settings.LLM_TIMEOUT_SECONDS,
            max_retries=settings.LLM_MAX_RETRIES,
            streaming=streaming,
        )
        _llm_profile_cache[cache_key] = instance
        return instance


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
