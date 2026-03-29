"""
Admin Users Router

Responsibility: Handles admin-only user management endpoints.
Layer: Router
Domain: Users Administration
"""

import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from dependencies.authentication import get_current_admin_or_super_admin
from dependencies.infrastructure import get_db
from models.user import User
from schemas.user_schema import DeleteAccountResponse, UserFullResponse
from services.user_service import get_all_users, get_user_by_id, hard_delete_user_account_by_id
from utils.limiter import limiter
from utils.logger import logger


router = APIRouter(dependencies=[Depends(get_current_admin_or_super_admin)])


@router.get("/", response_model=list[UserFullResponse])
@limiter.limit("60/minute")
async def get_all_users_endpoint(
    request: Request,
    db: Session = Depends(get_db),
) -> list[User]:
    """Return all users. Restricted to admin/super_admin roles."""
    timer = time.perf_counter()
    users = get_all_users(db, include_child_profiles=True)

    timer = time.perf_counter() - timer
    logger.info(f"All users data requested and returned in {timer:.3f} seconds")

    return users


@router.get("/{user_id}", response_model=UserFullResponse)
@limiter.limit("60/minute")
async def get_user_by_id_endpoint(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Return a single user by id. Restricted to admin/super_admin roles."""
    timer = time.perf_counter()
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    timer = time.perf_counter() - timer
    logger.info(f"User id={user_id} full profile requested and returned in {timer:.3f} seconds")

    return user


@router.delete("/{user_id}/hard", response_model=DeleteAccountResponse)
@limiter.limit("60/minute")
async def hard_delete_user_by_id_endpoint(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Hard-delete a user by id, including owned child profiles."""
    timer = time.perf_counter()
    actor_id = getattr(request.state, "access_token_payload", {}).get("sub", "unknown")
    logger.info(f"Hard delete requested for target_user_id={user_id} by actor={actor_id}")

    result = hard_delete_user_account_by_id(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    timer = time.perf_counter() - timer
    logger.info(f"Hard delete completed for target_user_id={user_id} in {timer:.3f} seconds")

    return result
