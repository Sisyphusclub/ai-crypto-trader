"""AI Risk Confirmation module - AI only confirms/rejects risk, not trade direction."""
import json
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


class RiskAction(str, Enum):
    CONFIRM = "confirm"
    REJECT = "reject"


@dataclass
class RiskConfirmResult:
    """Result of AI risk confirmation."""
    action: RiskAction
    risk_score: float  # 0-10 scale
    evidence: List[str]
    raw_response: Optional[str] = None

    @property
    def allowed(self) -> bool:
        return self.action == RiskAction.CONFIRM


# System prompt that restricts AI to risk confirmation only
AI_RISK_CONFIRM_SYSTEM_PROMPT = """You are a risk management AI for a cryptocurrency trading system.

CRITICAL: You do NOT decide trade direction. The strategy has already determined the trade direction.
Your ONLY role is to confirm or reject the trade based on risk assessment.

## Your Task
Given a proposed trade signal, evaluate the RISK and respond with:
1. action: "confirm" or "reject"
2. risk_score: 0-10 (0 = no risk, 10 = extreme risk)
3. evidence: List of specific risk factors observed

## Risk Factors to Evaluate
- Market volatility (high ATR, Bollinger Band expansion)
- Overextended price (RSI extremes, far from moving averages)
- Low liquidity conditions (volume anomalies)
- Conflicting signals (indicators disagreeing)
- Position sizing risk (relative to account balance)
- Correlation risk (multiple similar positions)

## Decision Rules
- risk_score <= 3: CONFIRM (low risk)
- risk_score 4-6: CONFIRM with caution (moderate risk)
- risk_score 7-8: REJECT (high risk)
- risk_score >= 9: REJECT (extreme risk)

## Response Format
Respond ONLY with valid JSON:
{
  "action": "confirm" | "reject",
  "risk_score": <float 0-10>,
  "evidence": ["reason1", "reason2", ...]
}

Do NOT include any text outside the JSON object."""


def build_risk_confirm_prompt(
    signal: Dict[str, Any],
    factors: Dict[str, float],
    account: Dict[str, Any],
    position_context: Optional[Dict] = None,
) -> str:
    """Build user prompt for risk confirmation.

    Args:
        signal: The proposed signal (symbol, side, score)
        factors: Computed factor values
        account: Account state (balance, positions)
        position_context: Optional existing position info

    Returns:
        User prompt string
    """
    prompt_data = {
        "proposed_trade": {
            "symbol": signal.get("symbol"),
            "side": signal.get("side"),
            "signal_score": signal.get("score"),
            "timeframe": signal.get("timeframe"),
        },
        "factor_analysis": {
            "technical": {k: v for k, v in factors.items() if k.startswith("ta_")},
            "sentiment": {k: v for k, v in factors.items() if k.startswith("sent_")},
            "onchain": {k: v for k, v in factors.items() if k.startswith("oc_")},
        },
        "account_state": {
            "available_balance": account.get("available_balance"),
            "open_positions": account.get("open_positions"),
            "daily_pnl": account.get("daily_pnl"),
        },
    }

    if position_context:
        prompt_data["existing_position"] = position_context

    return f"""Evaluate the risk for this proposed trade:

{json.dumps(prompt_data, indent=2)}

Respond with JSON only: {{"action": "confirm"|"reject", "risk_score": 0-10, "evidence": [...]}}"""


def parse_risk_response(response_text: str) -> RiskConfirmResult:
    """Parse AI response into RiskConfirmResult.

    Args:
        response_text: Raw AI response

    Returns:
        RiskConfirmResult

    Raises:
        ValueError: If response cannot be parsed
    """
    # Try to extract JSON from response
    text = response_text.strip()

    # Handle markdown code blocks
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")

    action_str = data.get("action", "reject").lower()
    if action_str not in ("confirm", "reject"):
        action_str = "reject"

    action = RiskAction.CONFIRM if action_str == "confirm" else RiskAction.REJECT

    try:
        risk_score = float(data.get("risk_score", 10))
    except (TypeError, ValueError):
        risk_score = 10.0
    risk_score = max(0.0, min(10.0, risk_score))

    evidence = data.get("evidence", [])
    if not isinstance(evidence, list):
        evidence = [str(evidence)]

    return RiskConfirmResult(
        action=action,
        risk_score=risk_score,
        evidence=evidence,
        raw_response=response_text,
    )


class AIRiskConfirmer:
    """Wrapper for AI risk confirmation calls."""

    def __init__(self, model_router, model_config):
        """Initialize with model router and config.

        Args:
            model_router: The AI model router instance
            model_config: Model configuration (provider, model_name, api_key)
        """
        self._router = model_router
        self._config = model_config

    async def confirm(
        self,
        signal: Dict[str, Any],
        factors: Dict[str, float],
        account: Dict[str, Any],
        position_context: Optional[Dict] = None,
    ) -> RiskConfirmResult:
        """Request AI risk confirmation for a signal.

        Args:
            signal: Proposed signal
            factors: Computed factors
            account: Account state
            position_context: Optional position info

        Returns:
            RiskConfirmResult
        """
        user_prompt = build_risk_confirm_prompt(
            signal, factors, account, position_context
        )

        response = await self._router.generate(
            provider=self._config.provider,
            model=self._config.model_name,
            api_key=self._config.api_key,
            system_prompt=AI_RISK_CONFIRM_SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )

        if not response.success:
            return RiskConfirmResult(
                action=RiskAction.REJECT,
                risk_score=10,
                evidence=[f"AI call failed: {response.error_type}"],
            )

        try:
            return parse_risk_response(response.content)
        except ValueError as e:
            return RiskConfirmResult(
                action=RiskAction.REJECT,
                risk_score=10,
                evidence=[f"Failed to parse AI response: {e}"],
                raw_response=response.content,
            )
