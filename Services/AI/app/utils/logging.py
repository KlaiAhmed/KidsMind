import logging
from typing import Optional

def setup_logging(level: int = logging.INFO, fmt: Optional[str] = None) -> None:
    """
    Minimal console logging setup.
    Called once at program start.
    """
    root = logging.getLogger()
    if root.handlers:
        return

    if fmt is None:
        fmt = "%(asctime)s %(levelname)s %(name)s: %(message)s"

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt))

    root.setLevel(level)
    root.addHandler(handler)