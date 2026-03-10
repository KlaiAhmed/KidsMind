from fastapi import APIRouter, HTTPException, Request, UploadFile, Form, Depends
from fastapi.concurrency import run_in_threadpool
import httpx
from utils.logger import logger

# Local imports
from core.config import settings
from services.upload_file import upload_audio, remove_audio
from middlewares.vallidate_audio_file import validate_audio_file
from utils.get_client import get_client
from utils.limiter import limiter
import time

router = APIRouter()


@router.post("/voice/{user_id}/{child_id}/{session_id}")
@limiter.limit(settings.RATE_LIMIT)
async def generate_content(
    request: Request,
    user_id: str,
    child_id: str,
    session_id: str,
    audio_file: UploadFile = Depends(validate_audio_file),
    context: str = Form(""),
    store_audio: bool = Form(True),
    client: httpx.AsyncClient = Depends(get_client),
):
    filename = None
    try:
        duration = time.time()
        # Upload audio file to storage and get URL
        upload_result = await run_in_threadpool(
            upload_audio, audio_file, user_id=user_id, child_id=child_id, session_id=session_id, store_audio=store_audio
        )
        filename = upload_result["filename"]
        audio_url = upload_result["url"]

        # Send audio URL to STT Service
        stt_response = await client.post(
            f"{settings.STT_SERVICE_ENDPOINT}/v1/stt/transcriptions",
            json={"audio_url": audio_url, "context": context},
            timeout=30.0,
        )
        stt_response.raise_for_status()

        text = stt_response.json().get("text", "")
        if not text:
            logger.warning("STT Service did not return text")
            raise HTTPException(status_code=500, detail="STT Service did not return text")

        # Send Response to AI Service
        ai_response = await client.post(
            f"{settings.AI_SERVICE_ENDPOINT}/v1/ai/chat/{user_id}/{child_id}/{session_id}",
            json={"text": text, "context": context},
            timeout=30.0,
        )
        ai_response.raise_for_status()

        duration = time.time() - duration
        logger.info(f"Content generation completed in {duration:.2f} seconds")
        return {
            "ai_data": ai_response.json(),
        }

    except httpx.RequestError as e:
        # Network error (e.g., connection issues, timeouts)
        logger.error(f"Network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach upstream service")

    except httpx.HTTPStatusError as e:
        # Service responded with an error code
        logger.error(f"Service returned error {e.response.status_code}: {e.response.text}")
        raise HTTPException(status_code=502, detail="Upstream service returned an error")

    except KeyError as e:
        # Unexpected response format
        logger.error(f"Unexpected payload: {e}")
        raise HTTPException(status_code=500, detail="Unexpected response from service")

    except Exception as e:
        # Catch-all for any other exceptions
        logger.exception("Unhandled error in generate_content")
        raise HTTPException(status_code=500, detail="Internal Server Error")

    finally:
        # Clean up uploaded audio file if parent disabled storing audio
        if filename and not store_audio:
            await run_in_threadpool(remove_audio, filename)