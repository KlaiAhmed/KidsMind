from fastapi import APIRouter, HTTPException, Depends
# Local Imports
from controllers.chat_controller import chat_controller
from schemas.ChatRequest import ChatRequest
from utils.get_client import get_client
from utils.logger import logger

router = APIRouter(tags=["chat with ai router"])

@router.post("/chat")
async def chat_with_ai(
    payload: ChatRequest,
    client = Depends(get_client),
    ):
    try:    
        response = await chat_controller(payload, client)

        return {"response": response}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")