from fastapi import HTTPException, Depends
import time

from services.ai_service import ai_service
from schemas.ChatRequest import ChatRequest
from utils.get_moderation_service import get_moderation_service
from utils.validate_token_limit import validate_token_limit
from utils.logger import logger

async def chat_controller(payload: ChatRequest, client) -> str:
    try:    
        start_time = time.time()

        # Validate token limits for text and context
        validate_token_limit(payload)

        #
        moderate = get_moderation_service()

        # Calling External Moderation API to check if user input is appropriate for kids
        await moderate(payload.text, payload.context or "", client=client)

        # Call the AI service
        response_text = await ai_service.get_response(payload)

        # Calling External Moderation API to check if AI output is appropriate for kids
        await moderate(response_text, payload.context or "", client=client)

        duration = time.time() - start_time
        logger.info(f"Chat processing completed in {duration:.2f} seconds.")

        return response_text
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Chat_controller: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")