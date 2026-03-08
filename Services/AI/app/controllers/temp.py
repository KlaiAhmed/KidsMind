from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional
from pydantic import BaseModel, Field
import time


# Local Imports
from services.chains import build_chain
from services.moderation import check_moderation
from services.dev_moderation import dev_check_moderation

from utils.validate_token_limit import validate_token_limit
from utils.age_guidelines import age_guidelines
from utils.get_client import get_client
from utils.get_moderation_service import get_moderation_service
from utils.logger import logger

from core.config import IS_PROD


router = APIRouter(tags=["AI"])


# Build the AI chain once at startup to reuse across requests
chain = build_chain()

class ChatRequest(BaseModel):
    text: str = Field(..., max_length=10000, description="The text to send by user to the AI")
    context: Optional[str] = Field(None,  max_length=1000, description="Optional context for the AI")
    age_group: Optional[str] = Field("3-15", max_length=5, description="The Kid Age group for content guidelines")


@router.post("/chat")
async def chat_with_ai(
    request: Request,
    payload: ChatRequest,
    client = Depends(get_client)
    moderate = Depends(get_moderation_service)
    ):
    try:    
        start_time = time.time()

        # Validate token limits for text and context
        validation_payload = { "text": payload.text, "context": payload.context }

        validate_token_limit_result = validate_token_limit(validation_payload)
        if not validate_token_limit_result:
            logger.warning("Token limit validation failed.")
            raise HTTPException(status_code=400, detail="text or context exceeds token limits.")

        # Calling External Moderation API to check if user input is appropriate for kids
        safe_content = await moderate(payload.text, payload.context or "", client=client)

        # If content is not safe, return a 400 error with appropriate text
        if not safe_content:
            logger.warning("text failed moderation checks.")
            raise HTTPException(status_code=400, detail="text contains inappropriate content for your age.")

        # Get age-specific guidelines for the AI response based on the provided age group
        guidelines = age_guidelines(payload.age_group)
                
        # Invoke the AI chain
        response = await chain.ainvoke({
            "age_group": payload.age_group,
            "age_guidelines": guidelines,
            "context": payload.context,
            "input": payload.text,
            "history": []  # Placeholder for conversation history, yet to be implemented in future
        })

        # Calling External Moderation API to check if LLM response is appropriate for kids
        safe_content = await moderate(response.content, payload.context or "", client=client)
        
        duration = time.time()-start_time    
        
        return {"response": response.content, "processing_time": duration}
    
    except HTTPException as e:
        logger.warning(f"HTTPException: {e.detail}")
        raise e
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")