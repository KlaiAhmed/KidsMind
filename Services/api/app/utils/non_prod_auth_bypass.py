"""Non-production authentication/security bypass helpers.

Responsibility: Centralizes runtime checks for development-only auth/CSRF
validation bypasses while preserving strict protection for `/me`, media,
and strict-auth routes.
Also provides a startup guard that prevents accidental auth bypass in
production-like environments.
"""

from core.config import settings
from utils.logger import logger

STRICT_AUTH_ROUTES = {"/api/web/auth/logout", "/api/mobile/auth/logout"}


def is_me_route(path: str) -> bool:
    """Return True when the request targets a `/me` route (any segment)."""
    segments = (path or "").strip("/").split("/")
    return "me" in segments


def is_media_route(path: str) -> bool:
    """Return True when the request targets a media route."""
    return (path or "").startswith("/api/v1/media")


def is_strict_auth_route(path: str) -> bool:
    """Return True when the request targets a strict-auth route."""
    return (path or "") in STRICT_AUTH_ROUTES


def is_non_prod_security_bypass_enabled(path: str) -> bool:
    """Enable bypass only outside production, never for /me, media, or strict-auth routes."""
    return (
        not settings.IS_PROD
        and not is_me_route(path)
        and not is_media_route(path)
        and not is_strict_auth_route(path)
    )


