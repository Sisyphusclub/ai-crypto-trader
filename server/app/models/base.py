"""SQLAlchemy ORM models."""
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, LargeBinary, Enum, Numeric, UniqueConstraint, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class ExchangeType(str, PyEnum):
    BINANCE = "binance"
    GATE = "gate"


class ModelProvider(str, PyEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


class SecretKind(str, PyEnum):
    EXCHANGE_KEY = "exchange_key"
    MODEL_KEY = "model_key"


class TradeSide(str, PyEnum):
    LONG = "long"
    SHORT = "short"


class TradePlanStatus(str, PyEnum):
    PENDING = "pending"
    ENTRY_PLACED = "entry_placed"
    ENTRY_FILLED = "entry_filled"
    TP_SL_PLACED = "tp_sl_placed"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExecutionStatus(str, PyEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Timeframe(str, PyEnum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


class SignalSide(str, PyEnum):
    LONG = "long"
    SHORT = "short"


class TraderMode(str, PyEnum):
    PAPER = "paper"
    LIVE = "live"


class DecisionStatus(str, PyEnum):
    PENDING = "pending"
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    EXECUTED = "executed"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    exchange_accounts = relationship("ExchangeAccount", back_populates="user")
    model_configs = relationship("ModelConfig", back_populates="user")
    strategies = relationship("Strategy", back_populates="user")


class Secret(Base):
    """Encrypted secrets storage."""
    __tablename__ = "secrets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind = Column(Enum(SecretKind), nullable=False, index=True)
    cipher_text = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    rotated_at = Column(DateTime, nullable=True)


class ExchangeAccount(Base):
    """Exchange API configuration."""
    __tablename__ = "exchange_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    exchange = Column(Enum(ExchangeType), nullable=False)
    label = Column(String(100), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    api_secret_encrypted = Column(Text, nullable=False)
    is_testnet = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="exchange_accounts")
    trade_plans = relationship("TradePlan", back_populates="exchange_account")


class ModelConfig(Base):
    """AI model configuration."""
    __tablename__ = "model_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    provider = Column(Enum(ModelProvider), nullable=False)
    model_name = Column(String(100), nullable=False)
    label = Column(String(100), nullable=False)
    api_key_encrypted = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="model_configs")


class TradePlan(Base):
    """Trade plan with entry, TP, and SL configuration."""
    __tablename__ = "trade_plans"
    __table_args__ = (
        UniqueConstraint("client_order_id", name="uq_trade_plans_client_order_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exchange_account_id = Column(UUID(as_uuid=True), ForeignKey("exchange_accounts.id"), nullable=False, index=True)
    client_order_id = Column(String(100), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # long/short
    quantity = Column(Numeric(20, 8), nullable=False)
    entry_price = Column(Numeric(20, 8), nullable=True)  # Filled price
    tp_price = Column(Numeric(20, 8), nullable=True)
    sl_price = Column(Numeric(20, 8), nullable=True)
    leverage = Column(Numeric(5, 2), default=1, nullable=False)
    entry_order = Column(JSONB, nullable=True)  # Exchange order details
    tp_order = Column(JSONB, nullable=True)
    sl_order = Column(JSONB, nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True)
    is_paper = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exchange_account = relationship("ExchangeAccount", back_populates="trade_plans")
    executions = relationship("Execution", back_populates="trade_plan")


class Execution(Base):
    """Individual order execution record."""
    __tablename__ = "executions"
    __table_args__ = (
        UniqueConstraint("exchange_order_id", name="uq_executions_exchange_order_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trade_plan_id = Column(UUID(as_uuid=True), ForeignKey("trade_plans.id"), nullable=False, index=True)
    order_type = Column(String(20), nullable=False)  # entry/tp/sl
    exchange_order_id = Column(String(100), nullable=True)
    client_order_id = Column(String(100), nullable=False, index=True)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)  # BUY/SELL
    quantity = Column(Numeric(20, 8), nullable=False)
    price = Column(Numeric(20, 8), nullable=True)  # Filled price
    status = Column(String(20), default="pending", nullable=False, index=True)
    exchange_response = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    is_paper = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trade_plan = relationship("TradePlan", back_populates="executions")


class AuditLog(Base):
    """Append-only audit log."""
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor = Column(String(100), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class Strategy(Base):
    """Trading strategy configuration."""
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=False, nullable=False, index=True)
    exchange_scope = Column(JSONB, nullable=False, server_default='[]')
    symbols = Column(JSONB, nullable=False, server_default='[]')
    timeframe = Column(String(10), nullable=False, server_default='1h')
    indicators_json = Column(JSONB, nullable=False, server_default='{}')
    triggers_json = Column(JSONB, nullable=False, server_default='{}')
    risk_json = Column(JSONB, nullable=False, server_default='{}')
    cooldown_seconds = Column(Integer, default=3600, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="strategies")
    signals = relationship("Signal", back_populates="strategy")


class MarketSnapshot(Base):
    """Market data snapshot with computed indicators."""
    __tablename__ = "market_snapshots"
    __table_args__ = (
        UniqueConstraint("exchange", "symbol", "timeframe", "timestamp", name="uq_snapshot_key"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exchange = Column(String(20), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    ohlcv = Column(JSONB, nullable=False)
    indicators = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    signals = relationship("Signal", back_populates="snapshot")


class Signal(Base):
    """Generated trading signal."""
    __tablename__ = "signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False)
    side = Column(String(10), nullable=False)
    score = Column(Numeric(5, 2), nullable=False, server_default='1.00')
    snapshot_id = Column(UUID(as_uuid=True), ForeignKey("market_snapshots.id"), nullable=True)
    reason_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    strategy = relationship("Strategy", back_populates="signals")
    snapshot = relationship("MarketSnapshot", back_populates="signals")


class Trader(Base):
    """AI Trader configuration - binds exchange + model + strategy."""
    __tablename__ = "traders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    exchange_account_id = Column(UUID(as_uuid=True), ForeignKey("exchange_accounts.id"), nullable=False)
    model_config_id = Column(UUID(as_uuid=True), ForeignKey("model_configs.id"), nullable=False)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False)
    enabled = Column(Boolean, default=False, nullable=False, index=True)
    mode = Column(String(10), default="paper", nullable=False)  # paper/live
    max_concurrent_positions = Column(Integer, default=3, nullable=False)
    daily_loss_cap = Column(Numeric(20, 8), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    exchange_account = relationship("ExchangeAccount")
    model_config = relationship("ModelConfig")
    strategy = relationship("Strategy")
    decisions = relationship("DecisionLog", back_populates="trader")


class DecisionLog(Base):
    """AI decision log - stores trade plans, risk reports, execution results."""
    __tablename__ = "decision_logs"
    __table_args__ = (
        UniqueConstraint("client_order_id", name="uq_decision_logs_client_order_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trader_id = Column(UUID(as_uuid=True), ForeignKey("traders.id"), nullable=False, index=True)
    signal_id = Column(UUID(as_uuid=True), ForeignKey("signals.id"), nullable=True, index=True)
    client_order_id = Column(String(100), nullable=False, index=True)
    status = Column(String(20), default="pending", nullable=False, index=True)

    # AI Input (sanitized - no secrets)
    input_snapshot = Column(JSONB, nullable=True)  # Market data summary

    # AI Output (no raw CoT)
    trade_plan = Column(JSONB, nullable=True)  # Validated plan
    confidence = Column(Numeric(3, 2), nullable=True)
    reason_summary = Column(Text, nullable=True)
    evidence = Column(JSONB, nullable=True)  # Structured evidence

    # Risk Report
    risk_allowed = Column(Boolean, nullable=True)
    risk_reasons = Column(JSONB, nullable=True)
    normalized_plan = Column(JSONB, nullable=True)

    # Execution Result
    trade_plan_id = Column(UUID(as_uuid=True), ForeignKey("trade_plans.id"), nullable=True)
    execution_error = Column(Text, nullable=True)

    # Metadata
    model_provider = Column(String(50), nullable=True)
    model_name = Column(String(100), nullable=True)
    tokens_used = Column(Integer, nullable=True)
    is_paper = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    trader = relationship("Trader", back_populates="decisions")
    signal = relationship("Signal")
    execution = relationship("TradePlan", foreign_keys=[trade_plan_id])
