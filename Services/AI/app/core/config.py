from pydantic import model_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

from utils.logger import logger


def _validate_explicit_dev_mode(is_prod: bool, explicit_dev_mode: str, service_name: str) -> None:
    """Validate that dev mode is intentional.

    Raises:
        RuntimeError: If IS_PROD is False and EXPLICIT_DEV_MODE is not "true".
    """
    if is_prod:
        return

    explicit = explicit_dev_mode.strip().lower()
    if explicit != "true":
        raise RuntimeError(
            f"Dev mode is active for {service_name} (IS_PROD=False). "
            f"Set EXPLICIT_DEV_MODE=true to confirm this is intentional. "
            "Never use in production."
        )

    logger.critical(
        f"\n"
        f"================================================================\n"
        f" WARNING: DEV MODE IS ACTIVE — IS_PROD=False\n"
        f" Service: {service_name}\n"
        f" EXPLICIT_DEV_MODE=true confirmed.\n"
        f"================================================================"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service
    SERVICE_NAME: str = "AI-service"

    # App State - defaults to True (safe), overridden by IS_PROD env var
    IS_PROD: bool = True

    # Required when IS_PROD=False — confirms dev mode is intentional
    EXPLICIT_DEV_MODE: str = "false"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Main AI API (Required)
    MODEL_NAME: str
    API_KEY: str
    BASE_URL: str

    # Guard / Production Credentials
    GUARD_API_KEY: Optional[str] = None
    GUARD_API_URL: Optional[str] = None
    GUARD_MODEL_NAME: Optional[str] = None

    # Dev Credentials
    DEV_GUARD_API_KEY: Optional[str] = None
    DEV_GUARD_API_URL: Optional[str] = None
    DEV_API_USER: Optional[str] = None

    # Cache & History
    CACHE_PASSWORD: Optional[str] = None
    CACHE_SERVICE_ENDPOINT: str = "redis://cache:6379"
    MAX_HISTORY_MESSAGES: int = 40
    MAX_LOADED_HISTORY_MESSAGES: int = 10
    MAX_HISTORY_TOKENS: int = 1500
    HISTORY_TTL: int = Field(default=3600, alias="HISTORY_TTL_SECONDS")

    # LOGGING
    LOG_LEVEL: str = "INFO"

    # AUTH TOKEN
    SERVICE_TOKEN: str = ""

    @model_validator(mode="after")
    def validate_environment(self) -> "Settings":
        # Validate explicit dev mode confirmation
        _validate_explicit_dev_mode(
            self.IS_PROD,
            self.EXPLICIT_DEV_MODE,
            self.SERVICE_NAME
        )

        # Handle the Production vs Dev logic
        if self.IS_PROD:
            if not all([self.GUARD_API_KEY, self.GUARD_API_URL, self.GUARD_MODEL_NAME]):
                raise ValueError("In PROD, GUARD_API credentials must be provided!")
        else:
            if not all([self.DEV_GUARD_API_KEY, self.DEV_GUARD_API_URL, self.DEV_API_USER]):
                raise ValueError("In DEV, DEV_GUARD credentials must be provided!")

        # Build the Redis URL dynamically if a password exists
        if self.CACHE_PASSWORD and "@" not in self.CACHE_SERVICE_ENDPOINT:
            self.CACHE_SERVICE_ENDPOINT = f"redis://:{self.CACHE_PASSWORD}@cache:6379"

        return self

settings = Settings()
