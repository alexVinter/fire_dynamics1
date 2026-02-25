from sqlalchemy import Boolean, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Technique(Base):
    __tablename__ = "technique"
    __table_args__ = (
        Index("ix_technique_mfr_model_series", "manufacturer", "model", "series"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manufacturer: Mapped[str] = mapped_column(String(255), nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    series: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
