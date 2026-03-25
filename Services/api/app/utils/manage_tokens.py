from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import jwt

from core.config import settings


def generate_tokens(user_id: int, role: str):
    """Create signed access and refresh JWTs for a user.

    Args:
        user_id: Numeric user identifier.
        role: User role claim for the access token.

    Returns:
        A tuple of `(access_token, refresh_token)`.
    """
    access_token = _create_token(
        payload={"sub": str(user_id), "role": role},
        expires_delta=timedelta(minutes=15),
        secret=settings.SECRET_ACCESS_KEY
    )
    
    refresh_token = _create_token(
        payload={"sub": str(user_id)},
        expires_delta=timedelta(days=7),
        secret=settings.SECRET_REFRESH_KEY
    )

    return access_token, refresh_token


def _create_token(payload: dict, expires_delta: timedelta, secret: str):
    """Build and sign a JWT with issued-at and expiration claims.

    Args:
        payload: Base claims to include in the token.
        expires_delta: Token lifetime duration.
        secret: Signing secret for HS256.

    Returns:
        Encoded JWT string.
    """
    to_encode = payload.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({
        "iat": now,
        "exp": now + expires_delta
    })
    return jwt.encode(to_encode, secret, algorithm="HS256")


def verify_token(token: str, token_type: str):
    """Decode and validate a JWT, raising HTTP 401 on failure.

    Args:
        token: JWT string to validate.
        token_type: Token kind (`"access"` or `"refresh"`) used to choose the secret.

    Returns:
        Decoded token payload as a dictionary.
    """
    secret = settings.SECRET_REFRESH_KEY if token_type == "refresh" else settings.SECRET_ACCESS_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

