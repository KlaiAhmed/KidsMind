from os import getenv

STT_SERVICE_URL = getenv("STT_SERVICE_URL", "http://stt-service-container:8002")
STORAGE_SERVICE_URL = getenv("STORAGE_SERVICE_URL", "http://storage-service-container:9000")

SERVICE_NAME = "KidsMind API Service"