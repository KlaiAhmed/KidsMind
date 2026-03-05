from fastapi import Request
import httpx

def get_client(request: Request) -> httpx.AsyncClient:
    """Provide HTTP client from the app state."""
    return request.app.state.http_client
