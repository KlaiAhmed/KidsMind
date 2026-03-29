"""
Users Router

Responsibility: Handles HTTP endpoints for user profile retrieval and
               admin user listing operations.
Layer: Router
Domain: Users
"""

import time

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.config import settings
from dependencies.authentication import get_current_admin_or_super_admin_if_prod, get_current_user
from dependencies.infrastructure import get_db
from models.user import User
from schemas.user_schema import DeleteAccountResponse, UserFullResponse, UserSummaryResponse
from services.user_service import get_all_users, get_user_by_id, hard_delete_user_account_by_id, soft_delete_user_account
from utils.token_blocklist import blocklist_access_token_jti
from utils.limiter import limiter
from utils.logger import logger

router = APIRouter()


@router.get("/me", response_model=UserFullResponse)
@limiter.limit("60/minute")
async def get_current_user_full_data(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Return the full profile of the currently authenticated user.

    Args:
        request: Incoming FastAPI request (required for rate limiter).
        current_user: Authenticated user from dependency.

    Returns:
        Full user profile data.
    """
    timer = time.perf_counter()
    logger.info(f"User full profile requested by user_id={current_user.id}")

    timer = time.perf_counter() - timer
    logger.info(f"User full profile response generated in {timer:.3f} seconds")

    return current_user


@router.get("/me/summary", response_model=UserSummaryResponse)
@limiter.limit("60/minute")
async def get_current_user_summary_data(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Return summary profile of the currently authenticated user.

    Args:
        request: Incoming FastAPI request (required for rate limiter).
        current_user: Authenticated user from dependency.

    Returns:
        Summary user profile data.
    """
    timer = time.perf_counter()
    logger.info(f"User summary profile requested by user_id={current_user.id}")

    timer = time.perf_counter() - timer
    logger.info(f"User summary profile response generated in {timer:.3f} seconds")

    return current_user


@router.delete("/me", response_model=DeleteAccountResponse)
@limiter.limit("60/minute")
async def soft_delete_my_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Soft-delete the authenticated account and schedule hard deletion in 30 days."""
    timer = time.perf_counter()
    logger.info(f"Soft delete requested for user_id={current_user.id}")

    access_token_payload = getattr(request.state, "access_token_payload", None)
    if not isinstance(access_token_payload, dict):
        raise HTTPException(status_code=401, detail="Invalid token")

    token_jti = access_token_payload.get("jti")
    token_exp = access_token_payload.get("exp")
    if not token_jti or token_exp is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    await blocklist_access_token_jti(token_jti, token_exp)

    result = soft_delete_user_account(db, current_user)

    timer = time.perf_counter() - timer
    logger.info(f"Soft delete completed for user_id={current_user.id} in {timer:.3f} seconds")

    return result


@router.delete("/{user_id}/hard", response_model=DeleteAccountResponse)
@limiter.limit("60/minute")
async def hard_delete_user_by_id_endpoint(
    user_id: int,
    request: Request,
    admin_user: User | None = Depends(get_current_admin_or_super_admin_if_prod),
    db: Session = Depends(get_db),
) -> dict:
    """Hard-delete a user by id, including owned child profiles.

    In production, this endpoint is restricted to admin/super_admin roles.
    """
    timer = time.perf_counter()
    actor = admin_user.id if admin_user else "non-prod-bypass"
    logger.info(f"Hard delete requested for target_user_id={user_id} by actor={actor}")

    result = hard_delete_user_account_by_id(db, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    timer = time.perf_counter() - timer
    logger.info(f"Hard delete completed for target_user_id={user_id} in {timer:.3f} seconds")

    return result


@router.get("/", response_model=list[UserFullResponse])
@limiter.limit("60/minute")
async def get_all_users_endpoint(
    request: Request,
    _: User | None = Depends(get_current_admin_or_super_admin_if_prod),
    db: Session = Depends(get_db),
) -> list[User]:
    """
    Return all users. Requires admin privileges in production.

    Args:
        request: Incoming FastAPI request (required for rate limiter).
        _: Admin authorization check (unused but enforces permission).
        db: Database session dependency.

    Returns:
        List of all user profiles.
    """
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
    _: User | None = Depends(get_current_admin_or_super_admin_if_prod),
    db: Session = Depends(get_db),
) -> User:
    """
    Return a single user by ID. Requires admin privileges in production.

    Args:
        user_id: Numeric user identifier.
        request: Incoming FastAPI request (required for rate limiter).
        _: Admin authorization check (unused but enforces permission).
        db: Database session dependency.

    Returns:
        User profile data.

    Raises:
        HTTPException: 404 if user not found.
    """
    timer = time.perf_counter()
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    timer = time.perf_counter() - timer
    logger.info(f"User id={user_id} full profile requested and returned in {timer:.3f} seconds")

    return user
