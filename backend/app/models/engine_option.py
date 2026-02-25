from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class EngineOption(Base):
    __tablename__ = "engine_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"), nullable=False)
    engine_name: Mapped[str] = mapped_column(String(255), nullable=False)
    year_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    year_to: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
