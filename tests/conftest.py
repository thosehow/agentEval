import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


TEST_DB_PATH = Path(__file__).resolve().parent / "test.sqlite3"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["AGENT_DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["APP_SECRET_KEY"] = "test-secret"

from app.core.config import get_settings  # noqa: E402
from app.db.base import metadata  # noqa: E402
from app.db.session import get_engine, get_session_factory  # noqa: E402
from app.main import app  # noqa: E402
from app.services.seed import seed_base_data  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
  get_settings.cache_clear()
  engine = get_engine()
  metadata.drop_all(bind=engine)
  metadata.create_all(bind=engine)
  session = get_session_factory()()
  try:
    seed_base_data(session)
  finally:
    session.close()
  yield


@pytest.fixture
def client():
  with TestClient(app) as test_client:
    yield test_client
