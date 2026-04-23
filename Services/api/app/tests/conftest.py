import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


APP_ROOT = Path(__file__).resolve().parents[1]

if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))


os.environ.setdefault("IS_PROD", "false")
os.environ.setdefault("CORS_ORIGINS", '["*"]')
os.environ.setdefault("DB_PASSWORD", "test-db-password")
os.environ.setdefault("STORAGE_ROOT_PASSWORD", "test-storage-password")
os.environ.setdefault("CACHE_PASSWORD", "test-cache-password")
os.environ.setdefault("DUMMY_HASH", "dummy-hash")
os.environ.setdefault("SECRET_ACCESS_KEY", "test-secret-access")
os.environ.setdefault("SECRET_REFRESH_KEY", "test-secret-refresh")


@pytest.fixture()
def db_session():
    from core.database import Base
    import models.avatar
    import models.avatar_tier_threshold
    import models.chat_history
    import models.child_allowed_subject
    import models.child_profile
    import models.child_rules
    import models.child_schedule_subject
    import models.child_week_schedule
    import models.media_asset
    import models.refresh_token_session
    import models.user

    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
    )

    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()
