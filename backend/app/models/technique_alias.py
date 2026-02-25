from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TechniqueAlias(Base):
    __tablename__ = "technique_alias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alias_text: Mapped[str] = mapped_column(String(255), nullable=False)
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
