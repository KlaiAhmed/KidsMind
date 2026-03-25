from core.config import settings


def build_service_headers() -> dict[str, str]:
    """Build default headers for upstream inter-service requests.

    Args:
        None.

    Returns:
        Header dictionary containing `X-Service-Token` when configured.
    """
    headers = {}
    if settings.SERVICE_TOKEN:
        headers["X-Service-Token"] = settings.SERVICE_TOKEN
    return headers
