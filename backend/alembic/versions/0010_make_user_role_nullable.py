"""make user role nullable

Revision ID: 0010
Revises: 0009
Create Date: 2026-02-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "role", existing_type=sa.String(50), nullable=True, server_default=None)


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'manager' WHERE role IS NULL")
    op.alter_column("users", "role", existing_type=sa.String(50), nullable=False, server_default=sa.text("'manager'"))
