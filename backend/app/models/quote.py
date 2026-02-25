from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    zones_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items: Mapped[list["QuoteItem"]] = relationship(back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    technique_id: Mapped[int] = mapped_column(Integer, ForeignKey("technique.id"), nullable=False)
    engine_option_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("engine_option.id"), nullable=True)
    engine_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    params_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    quote: Mapped["Quote"] = relationship(back_populates="items")
