import os

MODEL_NAME = os.getenv("MODEL_NAME")
BASE_URL = os.getenv("BASE_URL")
API_KEY = os.getenv("API_KEY")
GUARD_API_KEY = os.getenv("GUARD_API_KEY")
GUARD_API_URL = os.getenv("GUARD_API_URL")
GUARD_MODEL_NAME = os.getenv("GUARD_MODEL_NAME")
CONTENT_LENGTH_LIMIT = os.getenv("CONTENT_LENGTH_LIMIT", 1 * 1024 * 1024)
RATE_LIMIT = "5/minute" if os.getenv("IS_PROD") == "True" else "100/minute"
