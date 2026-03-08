import json
from utils.logger import logger

def parse_llm_response(response) -> dict:
    raw = response.content
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("LLM returned non-JSON response, wrapping as plain text")
        parsed = {"explanation": raw, "example": "", "exercise": "", "encouragement": ""}
    return parsed