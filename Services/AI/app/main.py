import uvicorn
from fastapi import FastAPI, HTTPException

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}