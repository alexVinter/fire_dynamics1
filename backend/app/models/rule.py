from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"), nullable=False)
    conditions_json: Mapped[str] = mapped_column(Text, nullable=False)
    actions_json: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    active_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    active_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
