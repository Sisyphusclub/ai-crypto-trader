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
