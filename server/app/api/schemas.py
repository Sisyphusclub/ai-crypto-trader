"""Pydantic schemas for API request/response models."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional
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
