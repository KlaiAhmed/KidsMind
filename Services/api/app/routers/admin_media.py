"""
Admin Media Router

Responsibility: Exposes admin avatar management endpoints.
Layer: Router
Domain: Media / Administration
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from controllers.media import (
    delete_media_controller,
    list_media_controller,
    update_avatar_thresholds_controller,
    update_media_controller,
)
from dependencies.auth import get_current_admin_or_super_admin
from dependencies.infrastructure import get_db, get_redis
from models.user import User
from schemas.media_schema import (
    AvatarListResponse,
    AvatarResponse,
    AvatarTierResponse,
    AvatarTierUpdateRequest,
    AvatarUpdateRequest,
)


router = APIRouter(dependencies=[Depends(get_current_admin_or_super_admin)])


@router.get("/avatars", response_model=AvatarListResponse)
async def list_avatars(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AvatarListResponse:
    items = await list_media_controller(
        include_inactive=True,
        db=db,
    )
    return AvatarListResponse(items=items)


@router.patch("/avatars/{avatar_id}", response_model=AvatarResponse)
async def update_avatar(
    avatar_id: UUID,
    payload: AvatarUpdateRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_admin_or_super_admin),
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    return await update_media_controller(
        media_id=avatar_id,
        payload=payload,
        current_user=current_user,
        db=db,
        redis=redis,
    )


@router.delete("/avatars/{avatar_id}", status_code=204)
async def delete_avatar(
    avatar_id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    await delete_media_controller(media_id=avatar_id, db=db, redis=redis)


@router.patch("/avatar-thresholds", response_model=list[AvatarTierResponse])
async def update_avatar_thresholds(
    payload: AvatarTierUpdateRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> list[AvatarTierResponse]:
    rows = await update_avatar_thresholds_controller(
        thresholds=payload.tiers,
        db=db,
        redis=redis,
    )
    return [AvatarTierResponse.model_validate(row) for row in rows]


# TODO: Badge management must be redesigned because media_assets was replaced by avatars.
@router.get("/badges")
async def list_badges(
    request: Request,
    response: Response,
):
    raise HTTPException(status_code=501, detail="Badge management endpoint requires schema redesign")


# TODO: Badge management must be redesigned because media_assets was replaced by avatars.
@router.patch("/badges/{media_id}")
async def update_badge(
    media_id: int,
    request: Request,
    response: Response,
):
    del media_id
    raise HTTPException(status_code=501, detail="Badge management endpoint requires schema redesign")


# TODO: Badge management must be redesigned because media_assets was replaced by avatars.
@router.delete("/badges/{media_id}", status_code=501)
async def delete_badge(
    media_id: int,
    request: Request,
    response: Response,
):
    del media_id
    raise HTTPException(status_code=501, detail="Badge management endpoint requires schema redesign")
