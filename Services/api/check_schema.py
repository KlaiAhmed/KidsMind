#!/usr/bin/env python3
"""Quick schema check to see what columns exist in the database vs ORM."""

import sys
sys.path.insert(0, 'app')

from core.database import engine, SessionLocal
from sqlalchemy import inspect, text

inspector = inspect(engine)
tables = inspector.get_table_names()

print('=== CHAT_SESSIONS TABLE ===')
if 'chat_sessions' in tables:
    columns = inspector.get_columns('chat_sessions')
    for col in columns:
        print(f'  {col["name"]}: {col["type"]}')
else:
    print('  Table does not exist')

print()
print('=== CHAT_HISTORY TABLE ===')
if 'chat_history' in tables:
    columns = inspector.get_columns('chat_history')
    for col in columns:
        print(f'  {col["name"]}: {col["type"]}')
else:
    print('  Table does not exist')

print()
print('=== ALEMBIC_VERSION ===')
if 'alembic_version' in tables:
    db = SessionLocal()
    result = db.execute(text('SELECT version_num FROM alembic_version ORDER BY version_num DESC LIMIT 5'))
    rows = result.fetchall()
    for row in rows:
        print(f'  {row[0]}')
    db.close()
