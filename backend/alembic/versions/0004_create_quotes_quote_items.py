"""create quotes and quote_items

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quotes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_quotes_created_by", "quotes", ["created_by"])
    op.create_index("ix_quotes_status", "quotes", ["status"])

    op.create_table(
        "quote_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("quote_id", sa.Integer, sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("technique_id", sa.Integer, sa.ForeignKey("technique.id"), nullable=False),
        sa.Column("engine_option_id", sa.Integer, sa.ForeignKey("engine_option.id"), nullable=True),
        sa.Column("engine_text", sa.String(255), nullable=True),
        sa.Column("year", sa.Integer, nullable=True),
        sa.Column("qty", sa.Integer, nullable=False, server_default="1"),
        sa.Column("params_json", sa.Text, nullable=True),
    )
    op.create_index("ix_quote_items_quote_id", "quote_items", ["quote_id"])


def downgrade() -> None:
    op.drop_table("quote_items")
    op.drop_table("quotes")
