from fastapi import Request
import httpx

def get_client(request: Request) -> httpx.AsyncClient:
    """Dependency — provides an HTTP client for making external API requests."""
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("HTTP client not initialized — lifespan may not have run")
    return client
