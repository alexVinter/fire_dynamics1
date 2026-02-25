import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg://user:password@localhost:5432/fire_dynamics",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
