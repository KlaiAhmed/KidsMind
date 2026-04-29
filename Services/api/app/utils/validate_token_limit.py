from fastapi import HTTPException
from utils.token_count import get_token_count
from utils.logger import logger

VOICE_TEXT_TOKEN_LIMIT = 300
DEFAULT_TEXT_TOKEN_LIMIT = 600
DEFAULT_CONTEXT_TOKEN_LIMIT = 600

def validate_token_limit_by_source(
    text: str,
    context: str = "",
    input_source: str | None = None,
    context_limit: int = DEFAULT_CONTEXT_TOKEN_LIMIT,
):
    text_limit = VOICE_TEXT_TOKEN_LIMIT if input_source == "voice" else DEFAULT_TEXT_TOKEN_LIMIT

    text_tokens = get_token_count(text)
    if text_tokens > text_limit:
        logger.warning(
            "Text token count exceeds limit",
            extra={
                "token_count": text_tokens,
                "limit": text_limit,
                "input_source": input_source,
            },
        )
        raise HTTPException(status_code=422, detail=f"text exceeds token limit of {text_limit}.")

    if context:
        context_tokens = get_token_count(context)
        if context_tokens > context_limit:
            logger.warning(
                "Context token count exceeds limit",
                extra={
                    "token_count": context_tokens,
                    "limit": context_limit,
                },
            )
            raise HTTPException(status_code=422, detail=f"context exceeds token limit of {context_limit}.")
