from fastapi import FastAPI, Request
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter
from utils.logging import setup_logging, RequestTracingMiddleware

setup_logging()

from contextlib import asynccontextmanager
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
    
    # Add request tracing middleware
    app.add_middleware(RequestTracingMiddleware)

    # Set up rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Include the chat router
    app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat"])

    # Instrumentation for Prometheus
    Instrumentator().instrument(app).expose(app)

    return app

app = create_app()


@app.get("/")
@limiter.limit("10/minute")
def health_check(request: Request):
    return {"status": "ok"}
