"""Add AI trader tables

Revision ID: 004_ai_trader_tables
Revises: 003_strategy_tables
Create Date: 2026-01-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004_ai_trader_tables"
down_revision: Union[str, None] = "003_strategy_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Traders table
    op.create_table(
        "traders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("exchange_account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("exchange_accounts.id"), nullable=False),
        sa.Column("model_config_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("model_configs.id"), nullable=False),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("mode", sa.String(10), nullable=False, server_default="paper"),
        sa.Column("max_concurrent_positions", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("daily_loss_cap", sa.Numeric(20, 8), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_traders_user_id", "traders", ["user_id"])
    op.create_index("ix_traders_enabled", "traders", ["enabled"])

    # Decision logs table
    op.create_table(
        "decision_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("trader_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("traders.id"), nullable=False),
        sa.Column("signal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("signals.id"), nullable=True),
        sa.Column("client_order_id", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),

        # AI Input (sanitized)
        sa.Column("input_snapshot", postgresql.JSONB(), nullable=True),

        # AI Output (no raw CoT)
        sa.Column("trade_plan", postgresql.JSONB(), nullable=True),
        sa.Column("confidence", sa.Numeric(3, 2), nullable=True),
        sa.Column("reason_summary", sa.Text(), nullable=True),
        sa.Column("evidence", postgresql.JSONB(), nullable=True),

        # Risk Report
        sa.Column("risk_allowed", sa.Boolean(), nullable=True),
        sa.Column("risk_reasons", postgresql.JSONB(), nullable=True),
        sa.Column("normalized_plan", postgresql.JSONB(), nullable=True),

        # Execution Result
        sa.Column("trade_plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("trade_plans.id"), nullable=True),
        sa.Column("execution_error", sa.Text(), nullable=True),

        # Metadata
        sa.Column("model_provider", sa.String(50), nullable=True),
        sa.Column("model_name", sa.String(100), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("is_paper", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_decision_logs_trader_id", "decision_logs", ["trader_id"])
    op.create_index("ix_decision_logs_signal_id", "decision_logs", ["signal_id"])
    op.create_index("ix_decision_logs_status", "decision_logs", ["status"])
    op.create_index("ix_decision_logs_created_at", "decision_logs", ["created_at"])
    op.create_unique_constraint("uq_decision_logs_client_order_id", "decision_logs", ["client_order_id"])


def downgrade() -> None:
    op.drop_table("decision_logs")
    op.drop_table("traders")
