from fastapi import FastAPI, HTTPException, Request
from contextlib import asynccontextmanager
from core.config import STT_SERVICE_ENDPOINT, STORAGE_SERVICE_ENDPOINT, AI_SERVICE_ENDPOINT
from prometheus_fastapi_instrumentator import Instrumentator
from routers.chat import router as chat_router
import httpx


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=5.0) as client:
        app.state.http_client = client
        yield

def create_app() -> FastAPI:
    app = FastAPI(title="Core API", lifespan=lifespan)
    app.include_router(chat_router)
    return app

app = create_app()

Instrumentator().instrument(app).expose(app)

@app.get("/health")
def health_check():
    return {"status": "ok"}
