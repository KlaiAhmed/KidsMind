from fastapi import Request
import httpx

def get_client(request: Request) -> httpx.AsyncClient:
    """ Provides an HTTP client for making external API requests."""
    return request.app.state.http_client
