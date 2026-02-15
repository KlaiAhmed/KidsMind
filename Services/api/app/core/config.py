from os import getenv

STT_SERVICE_URL = getenv("STT_SERVICE_URL", "http://stt-service-container:8002")
STORAGE_SERVICE_URL = getenv("STORAGE_SERVICE_URL", "http://storage-service-container:9000")
AI_SERVICE_URL = getenv("AI_SERVICE_URL", "http://ai-service-container:8000")
DB_SERVICE_URL = getenv("DB_SERVICE_URL", "http://db-service-container:5432")

SERVICE_NAME = "KidsMind API Service"