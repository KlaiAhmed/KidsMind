from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from models.user import User
from utils.get_db import get_db
from utils.manage_tokens import verify_token


def get_client_type(x_client_type: str | None = Header(default=None, alias="X-Client-Type"), device_type: str | None = None) -> str:
    """Resolve and validate the client type.

    Priority order:
    1) `X-Client-Type` header
    2) `device_type` fallback
    3) default `mobile`

    Raises:
        HTTPException: If the resolved value is not `web` or `mobile`.
    """
    candidate = (x_client_type or device_type or "mobile").lower()
    if candidate not in ("web", "mobile"):
        raise HTTPException(status_code=400, detail="Invalid X-Client-Type header")
    return candidate


def get_current_user(
    request: Request,
    authorization: str | None = Header(default=None),
    x_client_type: str | None = Header(default=None, alias="X-Client-Type"),
    db: Session = Depends(get_db),
) -> User:
    """Return the authenticated active user from cookie/header access token.

    - `web` clients: read `access_token` from HttpOnly cookie.
    - `mobile` clients: read Bearer token from `Authorization` header.

    Raises:
        HTTPException: 401 when token is missing/invalid or user is inactive.
    """
    client_type = get_client_type(x_client_type=x_client_type)
    if client_type == "web":
        token = request.cookies.get("access_token")
    else:
        token = authorization.split(" ", 1)[1].strip() if authorization and authorization.lower().startswith("bearer ") else None

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = verify_token(token, "access")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id), User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
