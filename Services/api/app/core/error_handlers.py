"""
Global exception handlers.

Responsibility: Normalize framework and validation exceptions into one API error shape.
"""

from collections.abc import Iterable

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.requests import Request

from schemas.error_schema import ErrorItem, ErrorResponse


def _build_error_response(
    *,
    status_code: int,
    message: str,
    error_code: str,
    errors: Iterable[ErrorItem] | None = None,
) -> JSONResponse:
    payload = ErrorResponse(
        message=message,
        error_code=error_code,
        errors=list(errors or []),
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())


def _normalize_http_detail(detail: object) -> tuple[str, list[ErrorItem]]:
    if isinstance(detail, str):
        return detail, []

    if isinstance(detail, dict):
        message = detail.get("message") or detail.get("detail") or "Request failed"
        return str(message), []

    if isinstance(detail, list):
        errors: list[ErrorItem] = []
        for item in detail:
            if isinstance(item, dict):
                loc = item.get("loc")
                field = ".".join(str(part) for part in loc) if isinstance(loc, (tuple, list)) else None
                errors.append(
                    ErrorItem(
                        field=field,
                        message=str(item.get("msg") or item.get("message") or "Invalid value"),
                        type=item.get("type"),
                    )
                )

        if errors:
            return errors[0].message, errors

    return "Request failed", []


async def request_validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    validation_errors: list[ErrorItem] = []
    for error in exc.errors():
        loc = error.get("loc")
        field = ".".join(str(part) for part in loc) if isinstance(loc, (tuple, list)) else None
        validation_errors.append(
            ErrorItem(
                field=field,
                message=str(error.get("msg") or "Invalid value"),
                type=error.get("type"),
            )
        )

    return _build_error_response(
        status_code=422,
        message="Validation failed",
        error_code="VALIDATION_ERROR",
        errors=validation_errors,
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    message, errors = _normalize_http_detail(exc.detail)
    return _build_error_response(
        status_code=exc.status_code,
        message=message,
        error_code=f"HTTP_{exc.status_code}",
        errors=errors,
    )
