from core.config import settings
from fastapi import UploadFile, File, HTTPException


async def validate_audio_file(audio_file: UploadFile = File(...)):
    """ 
    Validates the uploaded audio file for content type and size.
    Args:     audio_file (UploadFile): The uploaded audio file to validate|
    Raises:   HTTPException: If the file type is unsupported or the file size exceeds the limit.|
    Returns:  UploadFile: The validated audio file.
    """
    if audio_file.content_type not in settings.ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type.")
    
    audio_file.file.seek(0, 2)
    file_size = audio_file.file.tell()
    audio_file.file.seek(0)
    
    if file_size > settings.MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large.")
        
    return audio_file