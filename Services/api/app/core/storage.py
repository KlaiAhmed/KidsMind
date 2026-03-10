from core.config import settings
from minio import Minio

minio_client = Minio(
    settings.STORAGE_SERVICE_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=settings.STORAGE_ROOT_USERNAME,
    secret_key=settings.STORAGE_ROOT_PASSWORD,
    secure=False
)