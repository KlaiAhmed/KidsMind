from fastapi import HTTPException 
from sqlalchemy.orm import Session

from models.user import User
from utils.manage_pwd import hash_password, verify_password

class AuthService:
    def __init__(self, db: Session):
       self.db = db

    async def login(self, payload):
        user = self.db.query(User).filter(User.email == payload.email).first()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        hashed_password = hash_password(payload.password)
        if not verify_password(payload.password, hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")


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
    

