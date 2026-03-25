from fastapi import HTTPException, Response
from sqlalchemy.orm import Session

from services.auth_service import AuthService
from schemas.auth_schema import UserLogin
from utils.logger import logger


async def login_controller(payload: UserLogin, client_type: str, response: Response, db: Session):
    try:
        # Initialize the AuthService with the database session
        auth_service = AuthService(client_type, response, db)

        # Call the login method of the AuthService
        return await auth_service.login(payload)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error occurred while logging in: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")