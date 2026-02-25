from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuoteCalcRun(Base):
    __tablename__ = "quote_calc_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    quote_id: Mapped[int] = mapped_column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    matched_rule_ids: Mapped[str] = mapped_column(Text, nullable=False)
    debug_note: Mapped[str | None] = mapped_column(Text, nullable=True)
