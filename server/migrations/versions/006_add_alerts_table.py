"""Add alerts table

Revision ID: 006_add_alerts
Revises: 005_add_base_url
Create Date: 2026-01-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "006_add_alerts"
down_revision: Union[str, None] = "005_add_base_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create AlertSeverity and AlertCategory enums
    alert_severity = postgresql.ENUM(
        'info', 'warning', 'error', 'critical',
        name='alertseverity',
        create_type=False
    )
    alert_category = postgresql.ENUM(
        'execution', 'risk', 'exchange', 'system', 'reconcile',
        name='alertcategory',
        create_type=False
    )

    # Create enums first
    op.execute("CREATE TYPE alertseverity AS ENUM ('info', 'warning', 'error', 'critical')")
    op.execute("CREATE TYPE alertcategory AS ENUM ('execution', 'risk', 'exchange', 'system', 'reconcile')")

    # Alerts table
    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("severity", alert_severity, nullable=False),
        sa.Column("category", alert_category, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("context_json", postgresql.JSONB(), nullable=True),
        sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("acknowledged_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_category", "alerts", ["category"])
    op.create_index("ix_alerts_acknowledged", "alerts", ["acknowledged"])
    op.create_index("ix_alerts_created_at", "alerts", ["created_at"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.execute("DROP TYPE alertcategory")
    op.execute("DROP TYPE alertseverity")
