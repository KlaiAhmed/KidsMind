from core.config import STORAGE_ROOT_USER, STORAGE_ROOT_PASSWORD, STORAGE_SERVICE_ENDPOINT
from minio import Minio

minio_client = Minio(
    STORAGE_SERVICE_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=STORAGE_ROOT_USER,
    secret_key=STORAGE_ROOT_PASSWORD,
    secure=False
)