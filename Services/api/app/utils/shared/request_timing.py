"""Reusable timing decorator for async request handlers."""

import functools
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from utils.shared.logger import logger


F = TypeVar("F", bound=Callable[..., Awaitable[Any]])


def timed_handler(operation_name: str) -> Callable[[F], F]:
    """Log elapsed duration for an async route handler."""

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            started = time.perf_counter()
            result = await func(*args, **kwargs)
            elapsed = time.perf_counter() - started
            logger.info(
                "request completed",
                extra={
                    "operation": operation_name,
                    "duration_seconds": round(elapsed, 3),
                },
            )
            return result

        return wrapper  # type: ignore[return-value]

    return decorator
