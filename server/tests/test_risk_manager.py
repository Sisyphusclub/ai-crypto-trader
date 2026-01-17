"""Tests for RiskManager."""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from app.ai.risk_manager import (
    RiskManager,
    RiskProfile,
    AccountState,
    NormalizedPlan,
    generate_client_order_id,
)
from app.ai.contracts import TradePlanOutput, EntryConfig, PositionSize, TPSLConfig


@pytest.fixture
def risk_manager():
    return RiskManager()


@pytest.fixture
def default_risk_profile():
    return RiskProfile(
        max_leverage=10,
        max_position_notional=Decimal("1000"),
        max_position_qty=Decimal("0.1"),
        max_concurrent_positions=3,
        cooldown_seconds=3600,
        daily_loss_cap=Decimal("100"),
        price_precision=2,
        quantity_precision=3,
        min_quantity=Decimal("0.001"),
        min_notional=Decimal("5"),
    )


@pytest.fixture
def default_account_state():
    return AccountState(
        available_balance=Decimal("1000"),
        open_positions=0,
        current_daily_pnl=Decimal("0"),
        recent_trades=[],
    )


class TestRiskManagerCheck:
    """Test RiskManager.check() method."""

    def test_skip_action_allowed(self, risk_manager, default_risk_profile, default_account_state):
        """Skip action always allowed."""
        plan = TradePlanOutput(
            action="skip",
            confidence=0.3,
            reason_summary="Market unfavorable",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state)
        assert result.allowed
        assert "skip" in result.reasons[0].lower()

    def test_close_action_allowed(self, risk_manager, default_risk_profile, default_account_state):
        """Close action allowed."""
        plan = TradePlanOutput(
            action="close",
            confidence=0.8,
            reason_summary="Exit position",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state)
        assert result.allowed

    def test_unknown_action_blocked(self, risk_manager, default_risk_profile, default_account_state):
        """Unknown action blocked."""
        plan = TradePlanOutput(
            action="skip",  # We'll modify after creation
            confidence=0.8,
            reason_summary="test",
        )
        plan.action = "invalid"  # type: ignore
        result = risk_manager.check(plan, default_risk_profile, default_account_state)
        assert not result.allowed
        assert "Unknown action" in result.reasons[0]

    def test_leverage_exceeded(self, risk_manager, default_risk_profile, default_account_state):
        """Leverage exceeding max is blocked."""
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=100),
            leverage=20,  # Exceeds max of 10
            confidence=0.8,
            reason_summary="test",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert not result.allowed
        assert any("Leverage" in r for r in result.reasons)

    def test_max_concurrent_positions_reached(self, risk_manager, default_risk_profile, default_account_state):
        """Max concurrent positions blocks new trades."""
        default_account_state.open_positions = 3  # Already at max
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=100),
            leverage=5,
            confidence=0.8,
            reason_summary="test",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert not result.allowed
        assert any("concurrent" in r.lower() for r in result.reasons)

    def test_daily_loss_cap_exceeded(self, risk_manager, default_risk_profile, default_account_state):
        """Daily loss cap blocks new trades."""
        default_account_state.current_daily_pnl = Decimal("-150")  # Exceeds cap of 100
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=100),
            leverage=5,
            confidence=0.8,
            reason_summary="test",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert not result.allowed
        assert any("loss cap" in r.lower() for r in result.reasons)

    def test_cooldown_active(self, risk_manager, default_risk_profile, default_account_state):
        """Cooldown blocks duplicate trades."""
        default_account_state.recent_trades = [
            {
                "symbol": "BTCUSDT",
                "side": "long",
                "created_at": datetime.utcnow() - timedelta(minutes=30),  # Within cooldown
            }
        ]
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=100),
            leverage=5,
            confidence=0.8,
            reason_summary="test",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert not result.allowed
        assert any("Cooldown" in r for r in result.reasons)

    def test_insufficient_margin(self, risk_manager, default_risk_profile, default_account_state):
        """Insufficient margin blocks trade."""
        default_account_state.available_balance = Decimal("10")  # Very low
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=500),
            leverage=5,
            confidence=0.8,
            reason_summary="test",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert not result.allowed
        assert any("margin" in r.lower() for r in result.reasons)

    def test_valid_plan_allowed(self, risk_manager, default_risk_profile, default_account_state):
        """Valid plan passes all checks."""
        plan = TradePlanOutput(
            action="open",
            symbol="BTCUSDT",
            side="long",
            entry=EntryConfig(type="market"),
            position_size=PositionSize(mode="notional", value=100),
            leverage=5,
            tp=TPSLConfig(mode="percent", value=2.0),
            sl=TPSLConfig(mode="percent", value=1.0),
            confidence=0.8,
            reason_summary="Strong signal",
        )
        result = risk_manager.check(plan, default_risk_profile, default_account_state, Decimal("50000"))
        assert result.allowed
        assert result.normalized_plan is not None
        assert result.normalized_plan.symbol == "BTCUSDT"


class TestGenerateClientOrderId:
    """Test deterministic client_order_id generation."""

    def test_deterministic(self):
        """Same inputs produce same output."""
        trader_id = "test-trader-123"
        signal_id = "test-signal-456"
        ts = datetime(2024, 1, 15, 10, 30, 0)

        id1 = generate_client_order_id(trader_id, signal_id, ts)
        id2 = generate_client_order_id(trader_id, signal_id, ts)

        assert id1 == id2

    def test_same_minute_bucket(self):
        """Same minute produces same ID."""
        trader_id = "test-trader-123"
        signal_id = "test-signal-456"
        ts1 = datetime(2024, 1, 15, 10, 30, 0)
        ts2 = datetime(2024, 1, 15, 10, 30, 45)  # Same minute

        id1 = generate_client_order_id(trader_id, signal_id, ts1)
        id2 = generate_client_order_id(trader_id, signal_id, ts2)

        assert id1 == id2

    def test_different_minute_bucket(self):
        """Different minute produces different ID."""
        trader_id = "test-trader-123"
        signal_id = "test-signal-456"
        ts1 = datetime(2024, 1, 15, 10, 30, 0)
        ts2 = datetime(2024, 1, 15, 10, 31, 0)  # Different minute

        id1 = generate_client_order_id(trader_id, signal_id, ts1)
        id2 = generate_client_order_id(trader_id, signal_id, ts2)

        assert id1 != id2

    def test_format(self):
        """ID has correct format."""
        trader_id = "test-trader-123"
        signal_id = "test-signal-456"
        ts = datetime(2024, 1, 15, 10, 30, 0)

        client_id = generate_client_order_id(trader_id, signal_id, ts)

        assert client_id.startswith("T")
        assert len(client_id) == 17  # T + 16 hex chars
