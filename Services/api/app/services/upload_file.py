from fastapi import UploadFile, File, HTTPException
from core.storage import minio_client
from minio import Minio
from minio.error import S3Error
from utils.file_name import generate_storage_path
import time
from datetime import timedelta


def upload_audio(file: UploadFile = File(...), user_id: str = "", child_id: str = "", store_audio: bool = True):
    bucket_name = "media-private"

    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        filename = generate_storage_path(file.filename, user_id=user_id, child_id=child_id, store_audio=store_audio)

        metadata = {
            "user_id": str(user_id),
            "child_id": str(child_id),
            "original_filename": file.filename,
            "content_type": file.content_type,
            "file_size": str(file_size),
        }

        minio_client.put_object(
            bucket_name=bucket_name,
            object_name=filename,
            data=file.file,
            length=file_size,
            content_type=file.content_type,
            metadata=metadata
        )

        url = minio_client.presigned_get_object(
            bucket_name,
            filename,
            expires= timedelta(minutes=15)
        )
        
        return {
            "message": "Audio file uploaded successfully!", 
            "filename": filename,
            "url": url
        }

    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Storage Error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

def remove_audio(filename: str):
    bucket_name = "media-private"
    try:
        minio_client.remove_object(bucket_name, filename)
        return {"message": "Audio file removed successfully!"}
    except S3Error as e:
        raise HTTPException(status_code=500, detail=f"Storage Error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")