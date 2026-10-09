import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine, event

from app.core.db import Base, get_db
from app.main import app
from app.seed import DEMO_PASSWORD, DEMO_USERNAME, seed


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def _fk(conn, _):
        conn.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with TestSession() as db:
        seed(db)

    def override():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def authed(client):
    r = client.post("/api/auth/login", json={"username": DEMO_USERNAME, "password": DEMO_PASSWORD})
    assert r.status_code == 200
    return client
