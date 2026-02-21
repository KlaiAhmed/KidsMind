from fastapi import Request
import httpx

def get_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client
