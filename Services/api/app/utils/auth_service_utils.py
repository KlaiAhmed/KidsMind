import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response
from sqlalchemy.orm import Session

from core.config import settings
from models.refresh_token_session import RefreshTokenSession
from models.user import User
from utils.logger import logger
from utils.manage_pwd import verify_password
from utils.manage_tokens import verify_token


def get_cookie_config() -> dict:
    """Return runtime cookie configuration for auth cookies."""
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE or settings.IS_PROD,
        "samesite": settings.COOKIE_SAMESITE,
        "domain": settings.COOKIE_DOMAIN,
    }


def hash_token(token: str) -> str:
    """Return a SHA-256 digest for secure token persistence."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def build_user_data(user: User) -> dict:
    """Build a minimal serialized user payload for auth responses."""
    return {
        "id": user.id,
        "email": user.email,
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set access and refresh HttpOnly cookies on the response."""
    cookie_config = get_cookie_config()
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        path="/",
        **cookie_config,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_SECONDS,
        path="/api/v1/auth/refresh",
        **cookie_config,
    )


def clear_auth_cookies(response: Response) -> None:
    """Expire auth cookies for browser logout."""
    cookie_config = get_cookie_config()
    response.set_cookie(key="access_token", value="", max_age=0, path="/", **cookie_config)
    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        path="/api/v1/auth/refresh",
        **cookie_config,
    )


def deliver_tokens(
    response: Response,
    client_type: str,
    user: User,
    access_token: str,
    refresh_token: str,
    message: str,
) -> dict:
    """Deliver tokens through cookies for web or JSON for mobile clients."""
    if client_type == "web":
        set_auth_cookies(response, access_token, refresh_token)
        return {
            "message": message,
            "user": build_user_data(user),
        }

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        "user": build_user_data(user),
    }


def extract_refresh_token(
    client_type: str,
    request: Request | None,
    refresh_token: str | None,
    authorization: str | None,
) -> str | None:
    """Extract a refresh token from cookies, auth header, or body fallback."""
    if client_type == "web":
        return request.cookies.get("refresh_token") if request else None

    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()

    return refresh_token


def verify_refresh_payload(token: str) -> dict:
    """Validate refresh token and ensure required token lineage claims exist."""
    payload = verify_token(token, "refresh")
    refresh_jti = payload.get("jti")
    token_family = payload.get("family")

    if not refresh_jti or not token_family:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return payload


def find_refresh_session(db: Session, refresh_jti: str) -> RefreshTokenSession | None:
    """Load a refresh session by token JTI."""
    return db.query(RefreshTokenSession).filter(RefreshTokenSession.jti == refresh_jti).first()


def create_refresh_session(db: Session, user_id: int, refresh_token: str, refresh_jti: str, token_family: str) -> None:
    """Persist a new refresh token session record for rotation and revocation."""
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRE_SECONDS)
    session = RefreshTokenSession(
        user_id=user_id,
        jti=refresh_jti,
        token_family=token_family,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
        revoked=False,
    )
    db.add(session)


def revoke_token_family(db: Session, user_id: int, token_family: str) -> None:
    """Revoke every active refresh token session in the same token family."""
    sessions = (
        db.query(RefreshTokenSession)
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


def require_existing_user_or_reject(db: Session, email: str, password: str) -> User:
    """Load a user by email or raise a uniform invalid-credentials error."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user

    logger.warning(f"Login attempt with non-existent email: {email}")
    verify_password(password, settings.DUMMY_HASH)
    raise HTTPException(status_code=401, detail="Invalid credentials")


def ensure_account_not_locked(user: User, now: datetime, email: str) -> None:
    """Reject login when the account is still in lockout window."""
    if user.locked_until and user.locked_until > now:
        time_remaining = int((user.locked_until - now).total_seconds() // 60)
        logger.warning(f"Login attempt for locked account: {email} time remaining: {time_remaining} more minutes")
        raise HTTPException(status_code=403, detail=f"Account is locked. Please try again in {time_remaining} minutes.")


def verify_password_or_apply_lockout(db: Session, user: User, password: str, now: datetime, email: str) -> None:
    """Validate password and apply progressive lockout on failed attempts."""
    if verify_password(password, user.hashed_password):
        return

    user.failed_login_attempts += 1
    logger.warning(f"Failed login attempt for user: {email}. Attempt #{user.failed_login_attempts}")

    if user.failed_login_attempts >= 10:
        user.locked_until = now + timedelta(hours=24)
        logger.warning(f"Suspicious activity detected for user: {user.email}")
    elif user.failed_login_attempts >= 8:
        user.locked_until = now + timedelta(hours=12)
    elif user.failed_login_attempts >= 5:
        user.locked_until = now + timedelta(minutes=30)

    db.commit()
    raise HTTPException(status_code=401, detail="Invalid credentials")


def reset_login_security_state(user: User, now: datetime) -> None:
    """Reset lockout and failed-attempt counters after successful authentication."""
    user.failed_login_attempts = 0
    user.last_login_at = now
    user.locked_until = None


def get_active_user_by_id(db: Session, user_id: int) -> User:
    """Return an active user by id or raise unauthorized."""
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user
