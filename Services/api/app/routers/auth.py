from fastapi import APIRouter, Body, Depends, Request, Response 
from sqlalchemy.orm import Session
import time

from controllers.auth import login_controller
from core.config import settings
from schemas.auth_schema import UserLogin
from services.auth_service import AuthService
from utils.get_db import get_db
from utils.limiter import limiter
from utils.logger import logger


router = APIRouter()


@router.post("/login")
@limiter.limit(settings.RATE_LIMIT)
async def login(
    request: Request,
    response: Response,
    payload: UserLogin = Body(...),
    client_type: str = Body(default="web", embed=True),
    db: Session= Depends(get_db)
    ):
    timer = time.perf_counter()

    logger.info(f"Login request received from {request.client.host} for email: {payload.email} from {client_type} client")

    res = await login_controller(payload, client_type, response, db)

    timer= time.perf_counter() - timer

    logger.info(f"Login request processed in {timer:.3f} seconds")

    return res
