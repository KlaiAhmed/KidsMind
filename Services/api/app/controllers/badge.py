"""
Badge Controller

Responsibility: Coordinates badge operations between routers and service layer.
Layer: Controller
Domain: Children / Badges
"""

from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from models.user import User
from schemas.badge_schema import BadgeCatalogResponse
from services.badge_service import BadgeService
from utils.logger import logger


async def get_badge_catalog_controller(
    *,
    child_id: UUID,
    current_user: User,
    db: Session,
    limit: int = 100,
    offset: int = 0,
) -> BadgeCatalogResponse:
    try:
        badge_service = BadgeService(db)
        return badge_service.get_badge_catalog(child_id, current_user.id, limit=limit, offset=offset)
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception(
            "Database error fetching badge catalog",
            extra={"child_id": str(child_id), "parent_id": str(current_user.id)},
        )
        raise HTTPException(status_code=500, detail="Failed to load badge catalog")
    except Exception:
        logger.exception(
            "Unexpected error fetching badge catalog",
            extra={"child_id": str(child_id), "parent_id": str(current_user.id)},
        )
        raise HTTPException(status_code=500, detail="Internal Server Error")
