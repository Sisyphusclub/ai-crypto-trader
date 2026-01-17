"""AI module for model routing and trade plan generation."""
from app.ai.model_router import (
    ModelRouter,
    ModelResponse,
    ModelErrorType,
    BaseModelAdapter,
    OpenAIAdapter,
    AnthropicAdapter,
    GoogleAdapter,
    model_router,
)
from app.ai.contracts import (
    TradePlanOutput,
    TRADE_PLAN_SCHEMA,
    validate_trade_plan,
    build_ai_prompt,
)

__all__ = [
    "ModelRouter",
    "ModelResponse",
    "ModelErrorType",
    "BaseModelAdapter",
    "OpenAIAdapter",
    "AnthropicAdapter",
    "GoogleAdapter",
    "model_router",
    "TradePlanOutput",
    "TRADE_PLAN_SCHEMA",
    "validate_trade_plan",
    "build_ai_prompt",
]
