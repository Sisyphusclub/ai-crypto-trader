"""Add trade_plans and executions tables

Revision ID: 002_trade_tables
Revises: 001_initial
Create Date: 2026-01-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002_trade_tables"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Trade plans table
    op.create_table(
        "trade_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exchange_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exchange_accounts.id"), nullable=False),
        sa.Column("client_order_id", sa.String(100), nullable=False),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("entry_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("tp_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("sl_price", sa.Numeric(20, 8), nullable=True),
        sa.Column("leverage", sa.Numeric(5, 2), nullable=False, server_default="1"),
        sa.Column("entry_order", postgresql.JSONB(), nullable=True),
        sa.Column("tp_order", postgresql.JSONB(), nullable=True),
        sa.Column("sl_order", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("is_paper", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_trade_plans_exchange_account_id", "trade_plans", ["exchange_account_id"])
    op.create_index("ix_trade_plans_client_order_id", "trade_plans", ["client_order_id"])
    op.create_index("ix_trade_plans_symbol", "trade_plans", ["symbol"])
    op.create_index("ix_trade_plans_status", "trade_plans", ["status"])
    op.create_unique_constraint("uq_trade_plans_client_order_id", "trade_plans", ["client_order_id"])

    # Executions table
    op.create_table(
        "executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("trade_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trade_plans.id"), nullable=False),
        sa.Column("order_type", sa.String(20), nullable=False),
        sa.Column("exchange_order_id", sa.String(100), nullable=True),
        sa.Column("client_order_id", sa.String(100), nullable=False),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("price", sa.Numeric(20, 8), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("exchange_response", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_paper", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_executions_trade_plan_id", "executions", ["trade_plan_id"])
    op.create_index("ix_executions_client_order_id", "executions", ["client_order_id"])
    op.create_index("ix_executions_status", "executions", ["status"])
    op.create_unique_constraint("uq_executions_exchange_order_id", "executions", ["exchange_order_id"])


def downgrade() -> None:
    op.drop_table("executions")
    op.drop_table("trade_plans")
