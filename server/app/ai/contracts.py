"""AI input/output contracts and JSON Schema validation."""
import json
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List, Literal
from pydantic import BaseModel, Field, field_validator
import jsonschema


TRADE_PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": ["open", "close", "skip"]},
        "symbol": {"type": "string"},
        "side": {"type": "string", "enum": ["long", "short"]},
        "entry": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["market", "limit"]},
                "price": {"type": ["number", "null"]},
            },
            "required": ["type"],
        },
        "position_size": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["notional", "qty"]},
                "value": {"type": "number"},
            },
            "required": ["mode", "value"],
        },
        "leverage": {"type": "integer", "minimum": 1, "maximum": 125},
        "tp": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["percent", "price"]},
                "value": {"type": "number"},
            },
            "required": ["mode", "value"],
        },
        "sl": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["percent", "price"]},
                "value": {"type": "number"},
            },
            "required": ["mode", "value"],
        },
        "time_in_force": {"type": ["string", "null"], "enum": ["GTC", "IOC", None]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reason_summary": {"type": "string", "maxLength": 500},
        "evidence": {
            "type": "object",
            "properties": {
                "signals": {"type": "array"},
                "indicators": {"type": "object"},
                "key_levels": {"type": "object"},
            },
        },
    },
    "required": ["action", "confidence", "reason_summary"],
    "additionalProperties": False,
}


class EntryConfig(BaseModel):
    type: Literal["market", "limit"] = "market"
    price: Optional[float] = None


class PositionSize(BaseModel):
    mode: Literal["notional", "qty"] = "notional"
    value: float = Field(gt=0)


class TPSLConfig(BaseModel):
    mode: Literal["percent", "price"] = "percent"
    value: float = Field(gt=0)


class Evidence(BaseModel):
    signals: List[Dict[str, Any]] = []
    indicators: Dict[str, Any] = {}
    key_levels: Dict[str, Any] = {}


class TradePlanOutput(BaseModel):
    """Validated trade plan from AI."""
    action: Literal["open", "close", "skip"]
    symbol: Optional[str] = None
    side: Optional[Literal["long", "short"]] = None
    entry: Optional[EntryConfig] = None
    position_size: Optional[PositionSize] = None
    leverage: int = Field(default=1, ge=1, le=125)
    tp: Optional[TPSLConfig] = None
    sl: Optional[TPSLConfig] = None
    time_in_force: Optional[Literal["GTC", "IOC"]] = None
    confidence: float = Field(ge=0, le=1)
    reason_summary: str = Field(max_length=500)
    evidence: Evidence = Field(default_factory=Evidence)

    @field_validator("symbol", "side", "entry", "position_size")
    @classmethod
    def required_for_open(cls, v, info):
        if info.data.get("action") == "open" and v is None:
            raise ValueError(f"{info.field_name} is required when action is 'open'")
        return v


@dataclass
class ValidationResult:
    valid: bool
    plan: Optional[TradePlanOutput] = None
    errors: List[str] = field(default_factory=list)


def validate_trade_plan(json_str: str) -> ValidationResult:
    """Validate AI output against trade plan schema."""
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        return ValidationResult(valid=False, errors=[f"Invalid JSON: {str(e)[:100]}"])

    try:
        jsonschema.validate(data, TRADE_PLAN_SCHEMA)
    except jsonschema.ValidationError as e:
        return ValidationResult(valid=False, errors=[f"Schema error: {e.message[:200]}"])

    try:
        plan = TradePlanOutput(**data)
        return ValidationResult(valid=True, plan=plan)
    except Exception as e:
        return ValidationResult(valid=False, errors=[f"Validation error: {str(e)[:200]}"])


def build_ai_prompt(
    signal: Dict[str, Any],
    market_snapshot: Dict[str, Any],
    risk_profile: Dict[str, Any],
    account_state: Dict[str, Any],
) -> tuple[str, str]:
    """Build system and user prompts for AI trade plan generation.

    Returns:
        (system_prompt, user_prompt)
    """
    system_prompt = """You are a professional cryptocurrency trading assistant. Your task is to analyze market signals and generate precise trade plans.

RULES:
1. Always respond with valid JSON matching the required schema
2. Be conservative - if uncertain, set action to "skip"
3. Never exceed the risk limits provided
4. Confidence should reflect your certainty (0.0 to 1.0)
5. Keep reason_summary concise but informative (max 500 chars)
6. Do not include any explanation outside the JSON

OUTPUT SCHEMA:
{
  "action": "open" | "close" | "skip",
  "symbol": "BTCUSDT",
  "side": "long" | "short",
  "entry": { "type": "market" | "limit", "price": number|null },
  "position_size": { "mode": "notional"|"qty", "value": number },
  "leverage": number (1-125),
  "tp": { "mode": "percent"|"price", "value": number },
  "sl": { "mode": "percent"|"price", "value": number },
  "time_in_force": "GTC"|"IOC"|null,
  "confidence": number (0-1),
  "reason_summary": "string",
  "evidence": { "signals": [], "indicators": {}, "key_levels": {} }
}

If action is "skip", only action, confidence, reason_summary, and evidence are required."""

    user_prompt = f"""Analyze this trading signal and generate a trade plan:

SIGNAL:
{json.dumps(signal, indent=2)}

MARKET SNAPSHOT:
{json.dumps(market_snapshot, indent=2)}

RISK PROFILE:
{json.dumps(risk_profile, indent=2)}

ACCOUNT STATE:
{json.dumps(account_state, indent=2)}

Generate a trade plan following the schema. Respond with JSON only."""

    return system_prompt, user_prompt


RETRY_SYSTEM_PROMPT = """You MUST respond with ONLY valid JSON. No explanations, no markdown, no text outside the JSON object.

The previous response was invalid. Please try again with strict JSON format matching this schema:
{
  "action": "open" | "close" | "skip",
  "symbol": "BTCUSDT",
  "side": "long" | "short",
  "entry": { "type": "market" | "limit", "price": number|null },
  "position_size": { "mode": "notional"|"qty", "value": number },
  "leverage": number,
  "tp": { "mode": "percent"|"price", "value": number },
  "sl": { "mode": "percent"|"price", "value": number },
  "time_in_force": "GTC"|"IOC"|null,
  "confidence": number,
  "reason_summary": "string",
  "evidence": { "signals": [], "indicators": {}, "key_levels": {} }
}"""
