"""Add strategy studio tables

Revision ID: 003_strategy_tables
Revises: 002_trade_tables
Create Date: 2026-01-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_strategy_tables"
down_revision: Union[str, None] = "002_trade_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Strategies table
    op.create_table(
        "strategies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("exchange_scope", postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column("symbols", postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column("timeframe", sa.String(10), nullable=False, server_default="1h"),
        sa.Column("indicators_json", postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column("triggers_json", postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column("risk_json", postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column("cooldown_seconds", sa.Integer(), nullable=False, server_default="3600"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_strategies_user_id", "strategies", ["user_id"])
    op.create_index("ix_strategies_enabled", "strategies", ["enabled"])

    # Market snapshots table
    op.create_table(
        "market_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("exchange", sa.String(20), nullable=False),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("ohlcv", postgresql.JSONB(), nullable=False),
        sa.Column("indicators", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_market_snapshots_exchange", "market_snapshots", ["exchange"])
    op.create_index("ix_market_snapshots_symbol", "market_snapshots", ["symbol"])
    op.create_index("ix_market_snapshots_timestamp", "market_snapshots", ["timestamp"])
    op.create_unique_constraint("uq_snapshot_key", "market_snapshots", ["exchange", "symbol", "timeframe", "timestamp"])

    # Signals table
    op.create_table(
        "signals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("strategies.id"), nullable=False),
        sa.Column("symbol", sa.String(50), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("side", sa.String(10), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=False, server_default="1.00"),
        sa.Column("snapshot_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("market_snapshots.id"), nullable=True),
        sa.Column("reason_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_signals_strategy_id", "signals", ["strategy_id"])
    op.create_index("ix_signals_symbol", "signals", ["symbol"])
    op.create_index("ix_signals_created_at", "signals", ["created_at"])


def downgrade() -> None:
    op.drop_table("signals")
    op.drop_table("market_snapshots")
    op.drop_table("strategies")
