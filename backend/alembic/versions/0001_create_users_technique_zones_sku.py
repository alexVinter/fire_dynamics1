"""create users, technique, zones, sku

Revision ID: 0001
Revises:
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("login", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="manager"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "technique",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("manufacturer", sa.String(255), nullable=False),
        sa.Column("model", sa.String(255), nullable=False),
        sa.Column("series", sa.String(255), nullable=True),
        sa.Column("meta", sa.Text, nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "zones",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False),
        sa.Column("title_ru", sa.String(255), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "sku",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(100), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("version_tag", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("sku")
    op.drop_table("zones")
    op.drop_table("technique")
    op.drop_table("users")
