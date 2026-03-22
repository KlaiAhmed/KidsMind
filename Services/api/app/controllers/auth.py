from fastapi import HTTPException
from sqlalchemy.orm import Session

from services.auth_service import AuthService
from schemas.auth_schema import UserLogin
from utils.logger import logger



def login(payload: UserLogin, db: Session):
    try:
        # Initialize the AuthService with the database session
        auth_service = AuthService(db)

        # Call the login method of the AuthService
        res = auth_service.login(payload)

        return res
    
    except Exception as e:
        logger.error(f"Error occurred while logging in: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")