from core.config import MAX_SIZE, ALLOWED_CONTENT_TYPES
from fastapi import UploadFile, File, HTTPException


async def validate_audio_file(audio_file: UploadFile = File(...)):
    if audio_file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type.")
    
    audio_file.file.seek(0, 2)
    file_size = audio_file.file.tell()
    audio_file.file.seek(0)
    
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large.")
        
    return audio_file