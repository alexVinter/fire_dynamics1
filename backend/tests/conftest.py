import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User
from app.services.auth import hash_password

engine_test = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine_test, autocommit=False, autoflush=False)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(engine_test)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine_test)


@pytest.fixture(autouse=True)
def override_get_db(db: Session):
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture()
def admin_user(db: Session) -> User:
    user = User(login="admin", password_hash=hash_password("admin123"), role="admin")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def manager_user(db: Session) -> User:
    user = User(login="manager", password_hash=hash_password("mgr123"), role="manager")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def warehouse_user(db: Session) -> User:
    user = User(login="warehouse", password_hash=hash_password("wh123"), role="warehouse")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
