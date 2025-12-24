import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db import session as db_session


@pytest.fixture(name="session")
def session_fixture():
    # In-memory SQLite (no file = no Windows locking issues)
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # keeps same in-memory DB across connections
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        yield session

    app.dependency_overrides[db_session.get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
