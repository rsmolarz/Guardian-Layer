from sqlmodel import SQLModel, create_engine, Session
from config import settings
import logging

logger = logging.getLogger(__name__)

# Support both PostgreSQL and SQLite (SQLite for local dev on Replit free tier)
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args=connect_args,
)


def create_db_and_tables():
    """Create all tables on startup."""
    SQLModel.metadata.create_all(engine)
    logger.info("Database tables created/verified.")


def get_session():
    """FastAPI dependency for DB sessions."""
    with Session(engine) as session:
        yield session
