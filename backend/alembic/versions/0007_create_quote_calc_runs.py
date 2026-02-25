"""create quote_calc_runs

Revision ID: 0007
Revises: 0006
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quote_calc_runs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("quote_id", sa.Integer, sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("matched_rule_ids", sa.Text, nullable=False),
        sa.Column("debug_note", sa.Text, nullable=True),
    )
    op.create_index("ix_quote_calc_runs_quote_id", "quote_calc_runs", ["quote_id"])


def downgrade() -> None:
    op.drop_table("quote_calc_runs")
