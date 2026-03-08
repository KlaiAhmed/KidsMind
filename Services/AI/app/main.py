from utils.logging_setup import setup_logging, RequestTracingMiddleware

setup_logging()

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from routers.chat_router import router as chat_router
from contextlib import asynccontextmanager
import httpx


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes the HTTP client for the app's lifespan."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        app.state.http_client = client
        yield

def create_app() -> FastAPI:
    app = FastAPI(title="AI Service", lifespan=lifespan)
    app.add_middleware(RequestTracingMiddleware)
    app.include_router(chat_router, prefix="/v1/ai")
    Instrumentator().instrument(app).expose(app)
    return app

app = create_app()


@app.get("/")
def health_check():
    return {"status": "ok"}
