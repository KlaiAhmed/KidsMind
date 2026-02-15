import asyncio
from fastapi import FastAPI, HTTPException, Request
import httpx
from contextlib import asynccontextmanager
from core.config import STT_SERVICE_URL, STORAGE_SERVICE_URL, AI_SERVICE_URL

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient(timeout=5.0) as client:
        app.state.http_client = client
        yield

def create_app() -> FastAPI:
    app = FastAPI(title="Core API", lifespan=lifespan)
    return app

app = create_app()

@app.get("/health")
def health_check():
    return {"status": "ok"}

async def check_service(client: httpx.AsyncClient, name: str, url: str):
    try:
        response = await client.get(url, timeout=2.0)
        return name, "healthy" if response.status_code == 200 else "unhealthy"
    except Exception:
        return name, "down"

@app.get("/monitor")
async def monitor(request: Request):
    client = request.app.state.http_client
    
    services_to_check = [
        ("storage", f"{STORAGE_SERVICE_URL}/minio/health/ready"),
        ("stt", f"{STT_SERVICE_URL}/health"),
        ("ai", f"{AI_SERVICE_URL}/health"),
    ]

    tasks = [check_service(client, name, url) for name, url in services_to_check]
    results = await asyncio.gather(*tasks)

    health_status = {name: status for name, status in results}
    
    is_fully_healthy = all(status == "healthy" for status in health_status.values())

    if not is_fully_healthy:
        raise HTTPException(
            status_code=503, 
            detail={"message": "One or more services are unavailable", "report": health_status}
        )

    return {"status": "all services healthy", "report": health_status}