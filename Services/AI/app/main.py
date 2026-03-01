from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from utils.logging import setup_logging

setup_logging()

from routers.ai import router as ai_router
from contextlib import asynccontextmanager
import httpx


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the HTTP client for the app's lifespan."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        app.state.http_client = client
        yield

def create_app() -> FastAPI:
    app = FastAPI(title="AI Service", lifespan=lifespan)
    app.include_router(ai_router, prefix="/v1/ai", tags=["AI"])
    Instrumentator().instrument(app).expose(app)
    return app

app = create_app()


@app.get("/")
def health_check():
    return {"status": "ok"}