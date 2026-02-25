"""create technique_alias, engine_option, rules

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "technique_alias",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("alias_text", sa.String(255), nullable=False),
        sa.Column("technique_id", sa.Integer, sa.ForeignKey("technique.id"), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
    )
    op.create_index("ix_technique_alias_text", "technique_alias", ["alias_text"])

    op.create_table(
        "engine_option",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("technique_id", sa.Integer, sa.ForeignKey("technique.id"), nullable=False),
        sa.Column("engine_name", sa.String(255), nullable=False),
        sa.Column("year_from", sa.Integer, nullable=True),
        sa.Column("year_to", sa.Integer, nullable=True),
        sa.Column("source", sa.String(50), nullable=False, server_default="manual"),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_engine_option_technique", "engine_option", ["technique_id"])

    op.create_table(
        "rules",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("technique_id", sa.Integer, sa.ForeignKey("technique.id"), nullable=False),
        sa.Column("conditions_json", sa.Text, nullable=False),
        sa.Column("actions_json", sa.Text, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("active_from", sa.Date, nullable=True),
        sa.Column("active_to", sa.Date, nullable=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_rules_technique", "rules", ["technique_id"])


def downgrade() -> None:
    op.drop_table("rules")
    op.drop_table("engine_option")
    op.drop_table("technique_alias")
