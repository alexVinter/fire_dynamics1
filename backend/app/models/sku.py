from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SKU(Base):
    __tablename__ = "sku"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version_tag: Mapped[str | None] = mapped_column(String(50), nullable=True)
