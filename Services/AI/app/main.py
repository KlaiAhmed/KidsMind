import uvicorn
from fastapi import FastAPI, HTTPException
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()

Instrumentator().instrument(app).expose(app)

@app.get("/health")
def health_check():
    return {"status": "ok"}