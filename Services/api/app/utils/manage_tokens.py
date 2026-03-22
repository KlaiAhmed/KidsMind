from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import jwt

from core.config import settings


def generate_tokens(user_id: int, role: str):
    """Generate access and refresh tokens for a given user ID and role."""
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
    to_encode = payload.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({
        "iat": now,
        "exp": now + expires_delta
    })
    return jwt.encode(to_encode, secret, algorithm="HS256")


def verify_token(token: str, token_type: str):
    """
    Verify the given JWT token and return the decoded payload if valid, otherwise return an error message.
    Args:        
        token (str): The JWT token to verify.
        token_type (str): The type of token to verify. Expected values are "access" or "refresh".
    Returns:
        payload if valid, otherwise raises an HTTPException.
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

