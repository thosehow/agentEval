from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings


_ENGINE: Engine | None = None
_SESSION_FACTORY: sessionmaker[Session] | None = None
_AGENT_ENGINE: Engine | None = None


def _sqlite_connect_args(url: str) -> dict[str, object]:
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is None:
        settings = get_settings()
        _ENGINE = create_engine(
            settings.database_url,
            future=True,
            pool_pre_ping=True,
            echo=settings.sqlalchemy_echo,
            connect_args=_sqlite_connect_args(settings.database_url),
        )
    return _ENGINE


def get_agent_engine() -> Engine:
    global _AGENT_ENGINE
    if _AGENT_ENGINE is None:
        settings = get_settings()
        _AGENT_ENGINE = create_engine(
            settings.agent_database_url,
            future=True,
            pool_pre_ping=True,
            connect_args=_sqlite_connect_args(settings.agent_database_url),
        )
    return _AGENT_ENGINE


def get_session_factory() -> sessionmaker[Session]:
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _SESSION_FACTORY = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SESSION_FACTORY


def get_db() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
