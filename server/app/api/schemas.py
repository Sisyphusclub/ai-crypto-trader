"""Pydantic schemas for API request/response models."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum


class ExchangeType(str, Enum):
    BINANCE = "binance"
    GATE = "gate"


class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


# ============================================================
# Exchange Schemas
# ============================================================

class ExchangeCreate(BaseModel):
    """Request schema for creating an exchange account."""
    exchange: ExchangeType
    label: str = Field(..., min_length=1, max_length=100)
    api_key: str = Field(..., min_length=1)
    api_secret: str = Field(..., min_length=1)
    is_testnet: bool = False


class ExchangeUpdate(BaseModel):
    """Request schema for updating an exchange account."""
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    api_key: Optional[str] = Field(None, min_length=1)
    api_secret: Optional[str] = Field(None, min_length=1)
    is_testnet: Optional[bool] = None


class ExchangeResponse(BaseModel):
    """Response schema for exchange account (secrets masked)."""
    id: UUID
    exchange: ExchangeType
    label: str
    api_key_masked: str
    is_testnet: bool
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Model Config Schemas
# ============================================================

class ModelConfigCreate(BaseModel):
    """Request schema for creating a model config."""
    provider: ModelProvider
    model_name: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=100)
    api_key: str = Field(..., min_length=1)


class ModelConfigUpdate(BaseModel):
    """Request schema for updating a model config."""
    model_name: Optional[str] = Field(None, min_length=1, max_length=100)
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    api_key: Optional[str] = Field(None, min_length=1)


class ModelConfigResponse(BaseModel):
    """Response schema for model config (secrets masked)."""
    id: UUID
    provider: ModelProvider
    model_name: str
    label: str
    api_key_masked: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Health Schemas
# ============================================================

class ServiceStatus(BaseModel):
    ok: bool
    error: Optional[str] = None


class HealthResponse(BaseModel):
    ok: bool
    env: str
    db: ServiceStatus
    redis: ServiceStatus
    timestamp: datetime


# ============================================================
# Task Schemas
# ============================================================

class TaskEnqueueResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[str] = None


# ============================================================
# Trade Schemas
# ============================================================

class TradeSide(str, Enum):
    LONG = "long"
    SHORT = "short"


class TradePreviewRequest(BaseModel):
    """Request schema for trade preview."""
    exchange_account_id: UUID
    symbol: str = Field(..., min_length=1, max_length=50)
    side: TradeSide
    quantity: float = Field(..., gt=0)
    tp_price: Optional[float] = Field(None, gt=0)
    sl_price: Optional[float] = Field(None, gt=0)
    leverage: int = Field(1, ge=1, le=125)


class TradePreviewResponse(BaseModel):
    """Response schema for trade preview."""
    symbol: str
    side: TradeSide
    quantity: str
    entry_price_estimate: str
    tp_price: Optional[str] = None
    sl_price: Optional[str] = None
    leverage: int
    estimated_margin: str
    is_paper: bool
    warnings: list[str] = []


class TradeExecuteRequest(BaseModel):
    """Request schema for trade execution."""
    exchange_account_id: UUID
    symbol: str = Field(..., min_length=1, max_length=50)
    side: TradeSide
    quantity: float = Field(..., gt=0)
    tp_price: Optional[float] = Field(None, gt=0)
    sl_price: Optional[float] = Field(None, gt=0)
    leverage: int = Field(1, ge=1, le=125)
    confirm: bool = False


class TradeExecuteResponse(BaseModel):
    """Response schema for trade execution."""
    trade_plan_id: UUID
    client_order_id: str
    status: str
    symbol: str
    side: TradeSide
    quantity: str
    entry_price: Optional[str] = None
    tp_price: Optional[str] = None
    sl_price: Optional[str] = None
    is_paper: bool
    error_message: Optional[str] = None


class PositionResponse(BaseModel):
    """Response schema for position info."""
    symbol: str
    side: str
    quantity: str
    entry_price: str
    unrealized_pnl: str
    leverage: int
    margin_type: str


class OrderResponse(BaseModel):
    """Response schema for order info."""
    order_id: str
    client_order_id: Optional[str] = None
    symbol: str
    status: str
    filled_qty: Optional[str] = None
    filled_price: Optional[str] = None


class TradePlanResponse(BaseModel):
    """Response schema for trade plan."""
    id: UUID
    client_order_id: str
    symbol: str
    side: str
    quantity: str
    entry_price: Optional[str] = None
    tp_price: Optional[str] = None
    sl_price: Optional[str] = None
    leverage: str
    status: str
    is_paper: bool
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# Strategy Schemas
# ============================================================

class Timeframe(str, Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


class IndicatorConfig(BaseModel):
    """Single indicator configuration."""
    type: Literal["EMA", "RSI", "ATR"]
    period: int = Field(..., ge=1, le=500)
    name: Optional[str] = None


class IndicatorsConfig(BaseModel):
    """Collection of indicators."""
    indicators: List[IndicatorConfig] = []


class TriggerCondition(BaseModel):
    """Single trigger condition."""
    indicator: str
    operator: Literal["<", ">", "crosses_above", "crosses_below"]
    value: Optional[float] = None
    compare_to: Optional[str] = None


class TriggerRule(BaseModel):
    """Trigger rule with conditions."""
    side: Literal["long", "short"]
    conditions: List[TriggerCondition] = Field(..., min_length=1)
    logic: Literal["AND"] = "AND"


class TriggersConfig(BaseModel):
    """Collection of trigger rules."""
    rules: List[TriggerRule] = []


class RiskConfig(BaseModel):
    """Risk management parameters."""
    max_leverage: int = Field(1, ge=1, le=125)
    max_position_notional: Optional[float] = Field(None, gt=0)
    cooldown_seconds: int = Field(3600, ge=0, le=86400)
    tp_atr_multiplier: Optional[float] = Field(None, gt=0)
    sl_atr_multiplier: Optional[float] = Field(None, gt=0)


class StrategyCreate(BaseModel):
    """Request schema for creating a strategy."""
    name: str = Field(..., min_length=1, max_length=100)
    exchange_scope: List[ExchangeType] = Field(..., min_length=1)
    symbols: List[str] = Field(..., min_length=1)
    timeframe: Timeframe = Timeframe.H1
    indicators: IndicatorsConfig = IndicatorsConfig()
    triggers: TriggersConfig = TriggersConfig()
    risk: RiskConfig = RiskConfig()


class StrategyUpdate(BaseModel):
    """Request schema for updating a strategy."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    enabled: Optional[bool] = None
    exchange_scope: Optional[List[ExchangeType]] = None
    symbols: Optional[List[str]] = None
    timeframe: Optional[Timeframe] = None
    indicators: Optional[IndicatorsConfig] = None
    triggers: Optional[TriggersConfig] = None
    risk: Optional[RiskConfig] = None


class StrategyResponse(BaseModel):
    """Response schema for strategy."""
    id: UUID
    name: str
    enabled: bool
    exchange_scope: List[str]
    symbols: List[str]
    timeframe: str
    indicators_json: dict
    triggers_json: dict
    risk_json: dict
    cooldown_seconds: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StrategyValidateResponse(BaseModel):
    """Response schema for strategy validation."""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []


class SignalResponse(BaseModel):
    """Response schema for signal."""
    id: UUID
    strategy_id: UUID
    symbol: str
    timeframe: str
    side: str
    score: str
    reason_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SignalDetailResponse(BaseModel):
    """Detailed signal response with indicator values."""
    id: UUID
    strategy_id: UUID
    strategy_name: Optional[str] = None
    symbol: str
    timeframe: str
    side: str
    score: str
    reason_summary: Optional[str] = None
    indicators_at_signal: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Trader Schemas
# ============================================================

class TraderMode(str, Enum):
    PAPER = "paper"
    LIVE = "live"


class TraderCreate(BaseModel):
    """Request schema for creating a trader."""
    name: str = Field(..., min_length=1, max_length=100)
    exchange_account_id: UUID
    model_config_id: UUID
    strategy_id: UUID
    mode: TraderMode = TraderMode.PAPER
    max_concurrent_positions: int = Field(3, ge=1, le=20)
    daily_loss_cap: Optional[float] = Field(None, gt=0)


class TraderUpdate(BaseModel):
    """Request schema for updating a trader."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    enabled: Optional[bool] = None
    mode: Optional[TraderMode] = None
    max_concurrent_positions: Optional[int] = Field(None, ge=1, le=20)
    daily_loss_cap: Optional[float] = Field(None, gt=0)


class TraderResponse(BaseModel):
    """Response schema for trader."""
    id: UUID
    name: str
    exchange_account_id: UUID
    exchange_label: Optional[str] = None
    model_config_id: UUID
    model_label: Optional[str] = None
    strategy_id: UUID
    strategy_name: Optional[str] = None
    enabled: bool
    mode: str
    max_concurrent_positions: int
    daily_loss_cap: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TraderStartRequest(BaseModel):
    """Request schema for starting a trader (live mode requires confirm)."""
    confirm: bool = False


# ============================================================
# Decision Log Schemas
# ============================================================

class DecisionStatus(str, Enum):
    PENDING = "pending"
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    EXECUTED = "executed"
    FAILED = "failed"


class DecisionLogResponse(BaseModel):
    """Response schema for decision log."""
    id: UUID
    trader_id: UUID
    trader_name: Optional[str] = None
    signal_id: Optional[UUID] = None
    client_order_id: str
    status: str
    confidence: Optional[str] = None
    reason_summary: Optional[str] = None
    risk_allowed: Optional[bool] = None
    risk_reasons: Optional[List[str]] = None
    trade_plan_id: Optional[UUID] = None
    execution_error: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    tokens_used: Optional[int] = None
    is_paper: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DecisionLogDetailResponse(BaseModel):
    """Detailed decision log response."""
    id: UUID
    trader_id: UUID
    trader_name: Optional[str] = None
    signal_id: Optional[UUID] = None
    client_order_id: str
    status: str
    input_snapshot: Optional[dict] = None
    trade_plan: Optional[dict] = None
    confidence: Optional[str] = None
    reason_summary: Optional[str] = None
    evidence: Optional[dict] = None
    risk_allowed: Optional[bool] = None
    risk_reasons: Optional[List[str]] = None
    normalized_plan: Optional[dict] = None
    trade_plan_id: Optional[UUID] = None
    execution_error: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    tokens_used: Optional[int] = None
    is_paper: bool
    created_at: datetime

    class Config:
        from_attributes = True
