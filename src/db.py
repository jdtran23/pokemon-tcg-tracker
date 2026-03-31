"""Database schema and session management."""
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config.settings import DB_PATH

# Allow tests to override DB path via environment variable
_db_path = Path(os.environ.get("TCG_TRACKER_DB_OVERRIDE", str(DB_PATH)))

# Ensure data dir exists
_db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{_db_path}", echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db():
    """Create tables if they don't exist. Import models before calling."""
    import src.models  # noqa: F401 - register tables with Base
    Base.metadata.create_all(engine)
    # Migration: add image_url to cards if missing
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE cards ADD COLUMN image_url VARCHAR(512)"))
            conn.commit()
    except Exception:
        pass  # column already exists
    # Migration: add signal columns for buy/sell markers
    for col_name, col_type in [
        ("signal", "VARCHAR(16)"),
        ("signal_type", "VARCHAR(32)"),
        ("signal_reason", "VARCHAR(256)"),
        ("signal_contributing", "VARCHAR(512)"),
    ]:
        try:
            with engine.connect() as conn:
                # Safe: col_name/col_type are hardcoded literals above, not user input
                conn.execute(text(f"ALTER TABLE cards ADD COLUMN {col_name} {col_type}"))
                conn.commit()
        except Exception:
            pass  # column already exists


def get_session():
    """Return a new session. Caller should close when done."""
    return Session()


__all__ = ["Base", "Session", "engine", "init_db", "get_session"]
