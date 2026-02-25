"""create quote_result_lines

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quote_result_lines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("quote_id", sa.Integer, sa.ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sku_id", sa.Integer, sa.ForeignKey("sku.id"), nullable=False),
        sa.Column("qty", sa.Integer, nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("availability_status", sa.String(50), nullable=True),
        sa.Column("availability_comment", sa.Text, nullable=True),
    )
    op.create_index("ix_quote_result_lines_quote_id", "quote_result_lines", ["quote_id"])


def downgrade() -> None:
    op.drop_table("quote_result_lines")
