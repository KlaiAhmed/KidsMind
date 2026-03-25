from core.database import SessionLocal

def get_db():
    """Yield a database session for request-scoped dependencies.

    Args:
        None.

    Returns:
        A generator yielding an active SQLAlchemy session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()