"""Add base_url column to model_configs

Revision ID: 005_add_base_url
Revises: 004_ai_trader_tables
Create Date: 2026-01-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_add_base_url"
down_revision: Union[str, None] = "004_ai_trader_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "model_configs",
        sa.Column("base_url", sa.String(500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("model_configs", "base_url")
