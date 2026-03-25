from fastapi import HTTPException, Response 
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

# Local imports
from models.user import User
from core.config import settings
from utils.manage_pwd import hash_password, verify_password
from utils.manage_tokens import generate_tokens, verify_token
from utils.logger import logger

class AuthService:
    def __init__(self, client_type: str, response: Response, db: Session):
       self.db = db
       self.client_type = client_type
       self.response = response

    async def login(self, payload):
        user = self.db.query(User).filter(User.email == payload.email).first()

        now = datetime.now(timezone.utc)

        if not user:
            logger.warning(f"Login attempt with non-existent email: {payload.email}")

            # A dummy password verification to mitigate timing attacks
            verify_password(payload.password, settings.DUMMY_HASH)

            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if user.locked_until and user.locked_until > now:
            time_remaining = (user.locked_until - now).total_seconds() // 60
            logger.warning(f"Login attempt for locked account: {payload.email} time remaining: {time_remaining} more minutes")
            raise HTTPException(status_code=403, detail=f"Account is locked. Please try again in {time_remaining} minutes.")

        if not verify_password(payload.password, user.hashed_password):
            user.failed_login_attempts += 1
            logger.warning(f"Failed login attempt for user: {payload.email}. Attempt #{user.failed_login_attempts}")

            # Lock account after n failed attempts
            if user.failed_login_attempts >= 10:
                user.locked_until = now + timedelta(hours=24)
                # TODO: Send notification email to user about suspicious activity
                logger.warning(f"Suspicious activity detected for user: {user.email}")
            elif user.failed_login_attempts >= 8:
                user.locked_until = now + timedelta(hours=12)
            elif user.failed_login_attempts >= 5:
                user.locked_until = now + timedelta(minutes=30)

            self.db.commit()

            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Reset failed attempts and lock status on successful login
        user.failed_login_attempts = 0
        user.last_login_at = now
        user.locked_until = None
        self.db.commit()

        access_token, refresh_token = generate_tokens(user.id, user.role)
        


        return {"message": "Login successful", "user": user.username}
    

    async def register(self, payload):
        # Implement the actual registration logic here, e.g., create user in database, hash password, etc.
        # This is a placeholder implementation.
        return {"message": "Registration successful", "user": payload.email}
    
    async def refresh_token(self, payload):
        # Implement the actual token refresh logic here, e.g., verify refresh token, generate new access token, etc.
        # This is a placeholder implementation.
        return {"message": "Token refreshed successfully", "user": payload.email}
    
    async def logout(self, payload):
        # Implement the actual logout logic here, e.g., invalidate tokens, clear sessions, etc.
        # This is a placeholder implementation.
        return {"message": "Logout successful", "user": payload.email}
    
    async def get_user_info(self, user_id):
        # Implement the actual logic to retrieve user information here, e.g., query database, etc.
        # This is a placeholder implementation.
        return {"message": "User info retrieved successfully", "user_id": user_id}
    

