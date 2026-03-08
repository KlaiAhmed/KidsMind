import os
from utils.require_env_var import _require

# Is the app running in production ? Default is False (development mode).
IS_PROD = os.getenv("IS_PROD", "False").strip().lower() == "true"

# AI API credentials and configuration
MODEL_NAME = _require("MODEL_NAME")
API_KEY = _require("API_KEY")
BASE_URL = _require("BASE_URL")

# Guard API credentials and configuration
GUARD_API_KEY = os.getenv("GUARD_API_KEY")
GUARD_API_URL = os.getenv("GUARD_API_URL")
GUARD_MODEL_NAME = os.getenv("GUARD_MODEL_NAME")

# Dev Guard API credentials and configuration (used in development mode for testing purposes)
DEV_GUARD_API_KEY = os.getenv("DEV_GUARD_API_KEY")
DEV_GUARD_API_URL = os.getenv("DEV_GUARD_API_URL")
DEV_API_USER = os.getenv("DEV_API_USER")

# APP configuration
RATE_LIMIT = os.getenv("RATE_LIMIT", "100/minute")
