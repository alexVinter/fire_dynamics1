from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuoteResultLine(Base):
    __tablename__ = "quote_result_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    sku_id: Mapped[int] = mapped_column(Integer, ForeignKey("sku.id"), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    availability_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    availability_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
