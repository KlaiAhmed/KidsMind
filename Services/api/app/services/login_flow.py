"""login_flow

Responsibility: Centralize shared login challenge and credential verification.
Layer: Service
Domain: Auth
"""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import settings
from models.user import User
from services.auth_service import (
    clear_login_failure_state,
    ensure_account_is_active_for_login,
    ensure_account_not_locked,
    enforce_login_challenge,
    register_login_failure,
    require_existing_user_or_reject,
    reset_login_security_state,
    resolved_login_failure_threshold,
    resolved_login_lockout_ttl_seconds,
    verify_password_or_apply_lockout,
)


async def authenticate_user_with_challenge(
    *,
    db: Session,
    email: str,
    password: str,
    client_ip: str | None,
    captcha_token: str | None,
    pow_token: str | None,
) -> User:
    """Authenticate a user while enforcing challenge and lockout rules."""
    await enforce_login_challenge(
        client_ip=client_ip,
        captcha_token=captcha_token,
        pow_token=pow_token,
    )

    now = datetime.now(timezone.utc)

    try:
        user = require_existing_user_or_reject(db, email, password)
        ensure_account_is_active_for_login(user, email)
        ensure_account_not_locked(user, now, email)
        verify_password_or_apply_lockout(db, user, password, now, email)
    except HTTPException as exc:
        if exc.status_code != 401 or exc.detail != "Invalid credentials":
            raise
        failed_attempts = await register_login_failure(client_ip=client_ip)
        if failed_attempts >= resolved_login_failure_threshold():
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts",
                headers={"Retry-After": str(resolved_login_lockout_ttl_seconds())},
            )
        if failed_attempts >= settings.LOGIN_CAPTCHA_THRESHOLD:
            raise HTTPException(status_code=429, detail={"captcha_required": True})
        raise

    reset_login_security_state(user, now)
    await clear_login_failure_state(client_ip=client_ip)
    return user
