from fastapi import APIRouter, Depends, Request
import time

from core.config import settings
from models.user import User
from schemas.user_schema import UserFullResponse, UserSummaryResponse
from utils.auth_dependencies import get_current_user
from utils.limiter import limiter
from utils.logger import logger


router = APIRouter()


@router.get("/me", response_model=UserFullResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_current_user_full_data(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    timer = time.perf_counter()
    logger.info(f"User full profile requested by user_id={current_user.id}")

    timer = time.perf_counter() - timer
    logger.info(f"User full profile response generated in {timer:.3f} seconds")

    return current_user


@router.get("/me/summary", response_model=UserSummaryResponse)
@limiter.limit(settings.RATE_LIMIT)
async def get_current_user_summary_data(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    timer = time.perf_counter()
    logger.info(f"User summary profile requested by user_id={current_user.id}")

    timer = time.perf_counter() - timer
    logger.info(f"User summary profile response generated in {timer:.3f} seconds")

    return current_user
