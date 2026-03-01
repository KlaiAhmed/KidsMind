import tiktoken
from fastapi import HTTPException, status
from core.config import MODEL_NAME

def validate_token_limit(text: str, limit: int = 2000) -> bool:
    """ Validates that the input text does not exceed the specified token limit (TikToken).
    Returns True if within limit, False if it exceeds the limit. """
    try:
        encoding = tiktoken.encoding_for_model(MODEL_NAME)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base") # Default for gpt-4 +
    
    num_tokens = len(encoding.encode(text))
    
    if num_tokens > limit:
        return False
    return True