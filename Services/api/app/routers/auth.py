from fastapi import APIRouter, Body, Request, Depends
from sqlalchemy.orm import Session
import time

from controllers.auth import login
from core.config import settings
from schemas.auth_schema import UserLogin
from services.auth_service import AuthService
from utils.get_db import get_db
from utils.limiter import limiter
from utils.logger import logger


router = APIRouter()


@router.get("/login")
@limiter.limit(settings.RATE_LIMIT)
async def login(
    request: Request, 
    payload: UserLogin = Body(...),
    db: Session= Depends(get_db)):

    timer = time.perf_counter()

    res = await login(payload, db)

    timer= time.perf_counter() - timer
    logger.info(f"Login request processed in {timer:.3f} seconds")
    return res
