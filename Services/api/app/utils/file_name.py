import uuid
from datetime import datetime
from pathlib import Path

def generate_storage_path(original_filename: str, user_id: str = "", child_id: str = "", store_audio: bool = True) -> str:
    now = datetime.now()
    date_path = now.strftime("%Y/%m/%d")
    
    unique_id = uuid.uuid4()

    extension = Path(original_filename).suffix 

    storage_type = "permanent" if store_audio else "temp"
    
    return f"voice-messages/{storage_type}/{user_id}/{child_id}/{date_path}/{unique_id}{extension}"