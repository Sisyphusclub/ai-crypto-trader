"""Risk Manager - Hard gate for all AI-generated trade plans."""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Optional, List, Dict, Any

from app.ai.contracts import TradePlanOutput


@dataclass
class RiskProfile:
    """Risk parameters from strategy + global config."""
    max_leverage: int = 10
    max_position_notional: Optional[Decimal] = None
    max_position_qty: Optional[Decimal] = None
    max_concurrent_positions: int = 5
    cooldown_seconds: int = 3600
    daily_loss_cap: Optional[Decimal] = None
    price_precision: int = 2
    quantity_precision: int = 3
    min_quantity: Decimal = Decimal("0.001")
    min_notional: Decimal = Decimal("5")


@dataclass
class AccountState:
    """Current account state for risk checks."""
    available_balance: Decimal = Decimal("0")
    open_positions: int = 0
    current_daily_pnl: Decimal = Decimal("0")
    recent_trades: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class NormalizedPlan:
    """Trade plan with precision-corrected values."""
    symbol: str
    side: str
    quantity: Decimal
    leverage: int
    entry_type: str
    entry_price: Optional[Decimal]
    tp_price: Optional[Decimal]
    sl_price: Optional[Decimal]
    time_in_force: Optional[str]


@dataclass
class RiskReport:
    """Risk check result."""
    allowed: bool
    reasons: List[str] = field(default_factory=list)
    normalized_plan: Optional[NormalizedPlan] = None


class RiskManager:
    """Validates and normalizes AI-generated trade plans."""

    def check(
        self,
        plan: TradePlanOutput,
        risk_profile: RiskProfile,
        account_state: AccountState,
        current_price: Optional[Decimal] = None,
    ) -> RiskReport:
        """Check if a trade plan passes all risk gates.

        Args:
            plan: AI-generated trade plan
            risk_profile: Risk parameters
            account_state: Current account state
            current_price: Current market price for calculations

        Returns:
            RiskReport with allowed status and reasons
        """
        reasons: List[str] = []

        if plan.action == "skip":
            return RiskReport(allowed=True, reasons=["Action is skip"])

        if plan.action == "close":
            return RiskReport(allowed=True, reasons=["Close action allowed"])

        if plan.action != "open":
            return RiskReport(allowed=False, reasons=[f"Unknown action: {plan.action}"])

        if not plan.symbol or not plan.side or not plan.position_size:
            return RiskReport(allowed=False, reasons=["Missing required fields for open action"])

        # Check leverage
        if plan.leverage > risk_profile.max_leverage:
            reasons.append(
                f"Leverage {plan.leverage} exceeds max {risk_profile.max_leverage}"
            )

        # Check max concurrent positions
        if account_state.open_positions >= risk_profile.max_concurrent_positions:
            reasons.append(
                f"Max concurrent positions ({risk_profile.max_concurrent_positions}) reached"
            )

        # Calculate quantity
        quantity = self._calculate_quantity(
            plan, risk_profile, current_price
        )

        if quantity is None:
            reasons.append("Could not calculate valid quantity")
        else:
            # Check max position notional
            if risk_profile.max_position_notional and current_price:
                notional = quantity * current_price
                if notional > risk_profile.max_position_notional:
                    reasons.append(
                        f"Position notional {notional} exceeds max {risk_profile.max_position_notional}"
                    )

            # Check max position qty
            if risk_profile.max_position_qty:
                if quantity > risk_profile.max_position_qty:
                    reasons.append(
                        f"Position qty {quantity} exceeds max {risk_profile.max_position_qty}"
                    )

            # Check min quantity
            if quantity < risk_profile.min_quantity:
                reasons.append(
                    f"Position qty {quantity} below min {risk_profile.min_quantity}"
                )

            # Check min notional
            if current_price:
                notional = quantity * current_price
                if notional < risk_profile.min_notional:
                    reasons.append(
                        f"Position notional {notional} below min {risk_profile.min_notional}"
                    )

        # Check daily loss cap
        if risk_profile.daily_loss_cap:
            if account_state.current_daily_pnl < -risk_profile.daily_loss_cap:
                reasons.append(
                    f"Daily loss cap {risk_profile.daily_loss_cap} exceeded"
                )

        # Check cooldown (duplicate prevention)
        cooldown_violation = self._check_cooldown(
            plan.symbol, plan.side, account_state.recent_trades, risk_profile.cooldown_seconds
        )
        if cooldown_violation:
            reasons.append(cooldown_violation)

        # Check margin requirements
        if quantity and current_price and plan.leverage:
            required_margin = (quantity * current_price) / Decimal(plan.leverage)
            if required_margin > account_state.available_balance:
                reasons.append(
                    f"Insufficient margin: need {required_margin}, have {account_state.available_balance}"
                )

        if reasons:
            return RiskReport(allowed=False, reasons=reasons)

        # Normalize the plan
        normalized = self._normalize_plan(plan, quantity, risk_profile, current_price)

        return RiskReport(allowed=True, normalized_plan=normalized)

    def _calculate_quantity(
        self,
        plan: TradePlanOutput,
        risk_profile: RiskProfile,
        current_price: Optional[Decimal],
    ) -> Optional[Decimal]:
        """Calculate and round quantity based on position size config."""
        if not plan.position_size:
            return None

        if plan.position_size.mode == "qty":
            qty = Decimal(str(plan.position_size.value))
        elif plan.position_size.mode == "notional":
            if not current_price or current_price <= 0:
                return None
            qty = Decimal(str(plan.position_size.value)) / current_price
        else:
            return None

        # Round to precision
        precision = Decimal(10) ** -risk_profile.quantity_precision
        qty = qty.quantize(precision, rounding=ROUND_DOWN)

        return qty if qty > 0 else None

    def _check_cooldown(
        self,
        symbol: str,
        side: str,
        recent_trades: List[Dict[str, Any]],
        cooldown_seconds: int,
    ) -> Optional[str]:
        """Check if same symbol+side trade is in cooldown."""
        cutoff = datetime.utcnow() - timedelta(seconds=cooldown_seconds)

        for trade in recent_trades:
            if (
                trade.get("symbol") == symbol
                and trade.get("side") == side
                and trade.get("created_at", datetime.min) > cutoff
            ):
                return f"Cooldown active for {symbol} {side} (wait {cooldown_seconds}s)"

        return None

    def _normalize_plan(
        self,
        plan: TradePlanOutput,
        quantity: Decimal,
        risk_profile: RiskProfile,
        current_price: Optional[Decimal],
    ) -> NormalizedPlan:
        """Normalize plan with corrected precision."""
        price_precision = Decimal(10) ** -risk_profile.price_precision

        entry_price = None
        if plan.entry and plan.entry.price:
            entry_price = Decimal(str(plan.entry.price)).quantize(price_precision)

        tp_price = None
        sl_price = None

        if current_price and plan.tp:
            if plan.tp.mode == "percent":
                if plan.side == "long":
                    tp_price = current_price * (1 + Decimal(str(plan.tp.value)) / 100)
                else:
                    tp_price = current_price * (1 - Decimal(str(plan.tp.value)) / 100)
            else:
                tp_price = Decimal(str(plan.tp.value))
            tp_price = tp_price.quantize(price_precision)

        if current_price and plan.sl:
            if plan.sl.mode == "percent":
                if plan.side == "long":
                    sl_price = current_price * (1 - Decimal(str(plan.sl.value)) / 100)
                else:
                    sl_price = current_price * (1 + Decimal(str(plan.sl.value)) / 100)
            else:
                sl_price = Decimal(str(plan.sl.value))
            sl_price = sl_price.quantize(price_precision)

        return NormalizedPlan(
            symbol=plan.symbol,
            side=plan.side,
            quantity=quantity,
            leverage=min(plan.leverage, risk_profile.max_leverage),
            entry_type=plan.entry.type if plan.entry else "market",
            entry_price=entry_price,
            tp_price=tp_price,
            sl_price=sl_price,
            time_in_force=plan.time_in_force,
        )


def generate_client_order_id(trader_id: str, signal_id: str, timestamp: datetime) -> str:
    """Generate deterministic client_order_id for idempotency.

    Uses trader_id + signal_id + timestamp bucket to ensure
    duplicate cycle calls don't create duplicate orders.
    """
    import hashlib
    bucket = timestamp.strftime("%Y%m%d%H%M")
    data = f"{trader_id}:{signal_id}:{bucket}"
    hash_hex = hashlib.sha256(data.encode()).hexdigest()[:16]
    return f"T{hash_hex}"


risk_manager = RiskManager()
