from fastapi import Request
import httpx

def get_client(request: Request) -> httpx.AsyncClient:
    """Return the shared AsyncClient stored on FastAPI app state.

    Args:
        request: Incoming FastAPI request used to access app state.

    Returns:
        The initialized httpx async client.

    Raises:
        RuntimeError: If the client was not initialized during app lifespan.
    """
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("HTTP client not initialized — lifespan may not have run")
    return client
