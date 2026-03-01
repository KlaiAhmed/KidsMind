from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional
from pydantic import BaseModel, Field
import time
import logging

# Local Imports
from ai.chains import build_chain
from ai.moderation import check_moderation

from utils.validate_token_limit import validate_token_limit
from utils.age_guidelines import age_guidelines
from utils.get_client import get_client

from core.config import RATE_LIMIT


router = APIRouter(tags=["AI"])

logger = logging.getLogger(__name__)

# Set up rate limiting per IP address
limiter = Limiter(key_func=get_remote_address)

# Build the AI chain once at startup to reuse across requests
chain = build_chain()

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=10000, description="The message to send by user to the AI")
    context: Optional[str] = Field(None,  max_length=1000, description="Optional context for the AI")
    age_group: Optional[str] = Field("3-15", max_length=5, description="The Kid Age group for content guidelines")


@router.post("/chat")
@limiter.limit(RATE_LIMIT)
async def chat_with_ai(
    request: Request,
    payload: ChatRequest):
    try:    
        start_time = time.time()

        if not validate_token_limit(payload.message):
            logger.warning("Message exceeds token limit.")
            raise HTTPException(status_code=413, detail="Message is too long. Please shorten it and try again.")
        
        if payload.context:
            if not validate_token_limit(payload.context, 1000):
                logger.warning("Context exceeds token limit.")
                raise HTTPException(status_code=413, detail="Context is too long. Please shorten it and try again.")

        logger.info("Starting moderation check for chat request.")
        safe_content = await check_moderation(payload.message, payload.context or "", client=get_client(request))
        logger.info(f"Moderation check completed with result: {safe_content}.")
        if not safe_content:
            logger.warning("Message failed moderation checks.")
            raise HTTPException(status_code=400, detail="Message contains inappropriate content for your age.")

        guidelines = age_guidelines(payload.age_group)
                
        response = await chain.ainvoke({
            "age_group": payload.age_group,
            "age_guidelines": guidelines,
            "context": payload.context,
            "message": payload.message
        })
        
        duration = time.time()-start_time    
        
        return {"response": response.content, "processing_time": duration}
    
    except HTTPException as e:
        logger.warning(f"HTTPException: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")