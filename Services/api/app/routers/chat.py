from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from fastapi.concurrency import run_in_threadpool
from core.config import STT_SERVICE_ENDPOINT, STORAGE_SERVICE_ENDPOINT
from services.upload_file import upload_audio, remove_audio
from utils.get_client import get_client
from middlewares.vallidate_audio_file import validate_audio_file
import httpx

router = APIRouter(prefix="/chat", tags=["AI"])

@router.post("/voice/message/{user_id}/{child_id}")
async def generate_content(user_id: str, child_id: str, audio_file: UploadFile = Depends(validate_audio_file), context: str = Form(""), store_audio: bool = Form(True)):
    filename = None
    try:
        # Upload the audio to the storage service
        upload_result =await run_in_threadpool(upload_audio, audio_file, user_id=user_id, child_id=child_id, store_audio=store_audio)
        filename = upload_result["filename"]
        audio_url = upload_result["url"]
        
        print(f"Audio uploaded to: {audio_url}")

        # Send the audio URL and context to the STT service
        async with httpx.AsyncClient() as client:
            stt_response = await client.post(f"{STT_SERVICE_ENDPOINT}/stt/transcribe", json={"audio_url": audio_url, "context": context}, timeout=30.0)
        stt_response.raise_for_status()
        stt_data = stt_response.json()
        print(f"STT response: {stt_data}")


    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to contact STT service: {e}")
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Storage service returned unexpected payload: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")
    
    finally:
        if filename and not store_audio:
            await run_in_threadpool(remove_audio, filename)

    return {"message": "Audio file processed successfully!"}
