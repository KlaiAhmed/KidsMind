from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Request
from core.config import STT_SERVICE_URL, STORAGE_SERVICE_URL

router = APIRouter(prefix="/chat", tags=["AI"])

def get_http_client(request: Request):
    return request.app.state.http_client

@router.post("/voice/message/{child_id}")
async def generate_content(child_id: str, audio_file: UploadFile = File(...), context: str = Form("")):
    try:
        file_content = await audio_file.read()

        # Upload to Storage
        storage_payload = {"file": (audio_file.filename, file_content, audio_file.content_type)}
        
        storage_response = await client.post(f"{STORAGE_SERVICE_URL}/upload", files=storage_payload, timeout=30.0)
        
        if storage_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to upload audio to storage")
        storage_data = storage_response.json()
        download_url = storage_data.get("url")
        if not download_url:
            raise HTTPException(status_code=500, detail="Storage service did not return a URL")
        # Send to STT Service
        stt_payload = {"audio_url": download_url, "child_id": child_id, "context": context}
        stt_response = await client.post(f"{STT_SERVICE_URL}/stt/transcribe", json=stt_payload,timeout=60.0)
        if stt_response.status_code != 200:
            raise HTTPException(status_code=500, detail="STT service failed")
        ai_response = "Placeholder for AI-generated content based on transcribed text and context."
        
        return {"message": ai_response}

    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Service communication error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/minio/health")
async def minio_health(request: Request):
    client = get_http_client(request)
    minio_check= await client.get(f"http://storage-service:9000/minio/health/ready", timeout=5.0)
    
    if minio_check.status_code != 200:
        raise HTTPException(status_code=503, detail="Storage service is not ready")

    return {"status": "ok"}