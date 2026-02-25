"""add composite index on technique(manufacturer, model, series)

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_technique_mfr_model_series",
        "technique",
        ["manufacturer", "model", "series"],
    )


def downgrade() -> None:
    op.drop_index("ix_technique_mfr_model_series", table_name="technique")
