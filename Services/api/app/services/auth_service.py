import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response
from sqlalchemy.orm import Session

# Local imports
from models.refresh_token_session import RefreshTokenSession
from models.user import User
from core.config import settings
from utils.manage_pwd import verify_password
from utils.manage_tokens import generate_tokens, verify_token
from utils.logger import logger


COOKIE_CONFIG = {
    "httponly": True,
    "secure": settings.COOKIE_SECURE or settings.IS_PROD,
    "samesite": settings.COOKIE_SAMESITE,
    "domain": settings.COOKIE_DOMAIN,
}


class AuthService:
    def __init__(self, client_type: str, response: Response, db: Session):
        self.db = db
        self.client_type = client_type
        self.response = response

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _build_user_data(user: User) -> dict:
        return {
            "id": user.id,
            "email": user.email,
        }

    def _set_auth_cookies(self, access_token: str, refresh_token: str):
        self.response.set_cookie(
            key="access_token",
            value=access_token,
            max_age=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
            path="/",
            **COOKIE_CONFIG,
        )
        self.response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_SECONDS,
            path="/api/v1/auth/refresh",
            **COOKIE_CONFIG,
        )

    def _clear_auth_cookies(self):
        self.response.set_cookie(key="access_token", value="", max_age=0, path="/", **COOKIE_CONFIG)
        self.response.set_cookie(
            key="refresh_token",
            value="",
            max_age=0,
            path="/api/v1/auth/refresh",
            **COOKIE_CONFIG,
        )

    def _deliver_tokens(self, user: User, access_token: str, refresh_token: str, message: str) -> dict:
        if self.client_type == "web":
            self._set_auth_cookies(access_token, refresh_token)
            return {
                "message": message,
                "user": self._build_user_data(user),
            }

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_SECONDS,
            "user": self._build_user_data(user),
        }

    def _extract_refresh_token(self, request: Request | None, refresh_token: str | None, authorization: str | None) -> str | None:
        if self.client_type == "web":
            return request.cookies.get("refresh_token") if request else None

        if authorization and authorization.lower().startswith("bearer "):
            return authorization.split(" ", 1)[1].strip()

        return refresh_token

    def _revoke_token_family(self, user_id: int, token_family: str):
        sessions = (
            self.db.query(RefreshTokenSession)
            .filter(
                RefreshTokenSession.user_id == user_id,
                RefreshTokenSession.token_family == token_family,
                RefreshTokenSession.revoked.is_(False),
            )
            .all()
        )

        now = datetime.now(timezone.utc)
        for session in sessions:
            session.revoked = True
            session.revoked_at = now

    def _create_refresh_session(self, user_id: int, refresh_token: str, refresh_jti: str, token_family: str):
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRE_SECONDS)
        session = RefreshTokenSession(
            user_id=user_id,
            jti=refresh_jti,
            token_family=token_family,
            token_hash=self._hash_token(refresh_token),
            expires_at=expires_at,
            revoked=False,
        )
        self.db.add(session)

    def _find_refresh_session(self, refresh_jti: str) -> RefreshTokenSession | None:
        return self.db.query(RefreshTokenSession).filter(RefreshTokenSession.jti == refresh_jti).first()

    def _verify_refresh_payload(self, token: str) -> dict:
        payload = verify_token(token, "refresh")
        refresh_jti = payload.get("jti")
        token_family = payload.get("family")

        if not refresh_jti or not token_family:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return payload

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

        access_token, refresh_token, refresh_jti, token_family = generate_tokens(user.id, user.role)
        self._create_refresh_session(user.id, refresh_token, refresh_jti, token_family)
        self.db.commit()
        
        return self._deliver_tokens(user, access_token, refresh_token, "Login successful")
    

    async def register(self, payload):
        # Implement the actual registration logic here, e.g., create user in database, hash password, etc.
        # This is a placeholder implementation.
        return {"message": "Registration successful", "user": payload.email}
    
    async def refresh_token(self, request: Request, refresh_token: str | None = None, authorization: str | None = None):
        provided_refresh_token = self._extract_refresh_token(request, refresh_token, authorization)
        if not provided_refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token is required")

        payload = self._verify_refresh_payload(provided_refresh_token)
        user_id = int(payload["sub"])
        refresh_jti = payload["jti"]
        token_family = payload["family"]

        session = self._find_refresh_session(refresh_jti)
        if not session:
            raise HTTPException(status_code=401, detail="Refresh token session not found")

        now = datetime.now(timezone.utc)
        if session.revoked:
            session.reuse_detected = True
            self._revoke_token_family(user_id, token_family)
            self.db.commit()
            raise HTTPException(status_code=401, detail="Refresh token reuse detected")

        if session.expires_at <= now:
            session.revoked = True
            session.revoked_at = now
            self.db.commit()
            raise HTTPException(status_code=401, detail="Refresh token has expired")

        token_hash = self._hash_token(provided_refresh_token)
        if session.token_hash != token_hash:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user = self.db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found or inactive")

        access_token, new_refresh_token, new_refresh_jti, _ = generate_tokens(
            user.id,
            user.role,
            token_family=token_family,
        )

        session.revoked = True
        session.revoked_at = now
        session.replaced_by_jti = new_refresh_jti

        self._create_refresh_session(user.id, new_refresh_token, new_refresh_jti, token_family)
        self.db.commit()

        return self._deliver_tokens(user, access_token, new_refresh_token, "Token refreshed successfully")
    
    async def logout(self, request: Request, refresh_token: str | None = None, authorization: str | None = None):
        provided_refresh_token = self._extract_refresh_token(request, refresh_token, authorization)
        if not provided_refresh_token and self.client_type == "mobile":
            raise HTTPException(status_code=401, detail="Refresh token is required")

        if provided_refresh_token:
            try:
                payload = self._verify_refresh_payload(provided_refresh_token)
                session = self._find_refresh_session(payload["jti"])
                if session and not session.revoked:
                    session.revoked = True
                    session.revoked_at = datetime.now(timezone.utc)
                    self.db.commit()
            except HTTPException:
                logger.warning("Logout called with invalid refresh token")

        if self.client_type == "web":
            self._clear_auth_cookies()

        return {"message": "Logout successful"}
    
    async def get_user_info(self, user_id):
        # Implement the actual logic to retrieve user information here, e.g., query database, etc.
        # This is a placeholder implementation.
        return {"message": "User info retrieved successfully", "user_id": user_id}
    

