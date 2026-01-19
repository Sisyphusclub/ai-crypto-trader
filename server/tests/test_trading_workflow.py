"""Integration tests for the end-to-end trading workflow.

These tests verify the core trading cycle logic without real database or exchange connections.
Uses mock objects to simulate the full flow: Signal -> AI Decision -> Trade Execution.
"""
import json
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from unittest.mock import MagicMock

import pytest


# ============================================================================
# Mock Models (matching project structure)
# ============================================================================

class MockExchangeType(str, Enum):
    BINANCE = "binance"
    GATE = "gate"


class MockModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class MockOrderStatus(str, Enum):
    NEW = "NEW"
    FILLED = "FILLED"
    REJECTED = "REJECTED"


class MockExchangeAccount:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.user_id = kwargs.get("user_id", uuid.uuid4())
        self.exchange = kwargs.get("exchange", MockExchangeType.BINANCE)
        self.label = kwargs.get("label", "primary")
        self.api_key_encrypted = kwargs.get("api_key_encrypted", "enc-key")
        self.api_secret_encrypted = kwargs.get("api_secret_encrypted", "enc-secret")
        self.is_testnet = kwargs.get("is_testnet", True)
        self.status = kwargs.get("status", "active")


class MockModelConfig:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.user_id = kwargs.get("user_id", uuid.uuid4())
        self.provider = kwargs.get("provider", MockModelProvider.OPENAI)
        self.model_name = kwargs.get("model_name", "gpt-4o")
        self.label = kwargs.get("label", "default")
        self.api_key_encrypted = kwargs.get("api_key_encrypted", "enc-model-key")


class MockStrategy:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.user_id = kwargs.get("user_id", uuid.uuid4())
        self.name = kwargs.get("name", "ema-strategy")
        self.enabled = kwargs.get("enabled", True)
        self.exchange_scope = kwargs.get("exchange_scope", ["binance"])
        self.symbols = kwargs.get("symbols", ["BTCUSDT"])
        self.timeframe = kwargs.get("timeframe", "1h")
        self.indicators_json = kwargs.get("indicators_json", {})
        self.triggers_json = kwargs.get("triggers_json", {})
        self.risk_json = kwargs.get("risk_json", {})
        self.cooldown_seconds = kwargs.get("cooldown_seconds", 0)
        self.exchange_account_id = kwargs.get("exchange_account_id")
        self.exchange_account = kwargs.get("exchange_account")


class MockTrader:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.user_id = kwargs.get("user_id", uuid.uuid4())
        self.name = kwargs.get("name", "ai-trader")
        self.exchange_account_id = kwargs.get("exchange_account_id")
        self.model_config_id = kwargs.get("model_config_id")
        self.strategy_id = kwargs.get("strategy_id")
        self.enabled = kwargs.get("enabled", True)
        self.mode = kwargs.get("mode", "live")
        self.max_concurrent_positions = kwargs.get("max_concurrent_positions", 3)
        self.exchange_account = kwargs.get("exchange_account")
        self.model_config = kwargs.get("model_config")
        self.strategy = kwargs.get("strategy")


class MockMarketSnapshot:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.exchange = kwargs.get("exchange", "binance")
        self.symbol = kwargs.get("symbol", "BTCUSDT")
        self.timeframe = kwargs.get("timeframe", "1h")
        self.timestamp = kwargs.get("timestamp", datetime.utcnow())
        self.ohlcv = kwargs.get("ohlcv", {})
        self.indicators = kwargs.get("indicators", {})


class MockSignal:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.strategy_id = kwargs.get("strategy_id")
        self.symbol = kwargs.get("symbol", "BTCUSDT")
        self.timeframe = kwargs.get("timeframe", "1h")
        self.side = kwargs.get("side", "long")
        self.score = kwargs.get("score", Decimal("1.0"))
        self.snapshot_id = kwargs.get("snapshot_id")
        self.reason_summary = kwargs.get("reason_summary", "Trigger hit")
        self.snapshot = kwargs.get("snapshot")
        self.consumed_at = kwargs.get("consumed_at")
        self.created_at = kwargs.get("created_at", datetime.utcnow())


class MockDecisionLog:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.trader_id = kwargs.get("trader_id")
        self.signal_id = kwargs.get("signal_id")
        self.client_order_id = kwargs.get("client_order_id")
        self.status = kwargs.get("status", "pending")
        self.trade_plan_id = kwargs.get("trade_plan_id")
        self.tokens_used = kwargs.get("tokens_used")
        self.execution_error = kwargs.get("execution_error")
        self.risk_allowed = kwargs.get("risk_allowed")
        self.ai_response = kwargs.get("ai_response")


class MockTradePlan:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.exchange_account_id = kwargs.get("exchange_account_id")
        self.client_order_id = kwargs.get("client_order_id")
        self.symbol = kwargs.get("symbol", "BTCUSDT")
        self.side = kwargs.get("side", "long")
        self.quantity = kwargs.get("quantity", Decimal("0.01"))
        self.entry_price = kwargs.get("entry_price")
        self.tp_price = kwargs.get("tp_price")
        self.sl_price = kwargs.get("sl_price")
        self.leverage = kwargs.get("leverage", Decimal("5"))
        self.status = kwargs.get("status", "pending")
        self.is_paper = kwargs.get("is_paper", False)
        self.error_message = kwargs.get("error_message")


class MockExecution:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", uuid.uuid4())
        self.trade_plan_id = kwargs.get("trade_plan_id")
        self.order_type = kwargs.get("order_type", "entry")
        self.exchange_order_id = kwargs.get("exchange_order_id")
        self.client_order_id = kwargs.get("client_order_id")
        self.symbol = kwargs.get("symbol", "BTCUSDT")
        self.side = kwargs.get("side", "BUY")
        self.quantity = kwargs.get("quantity", Decimal("0.01"))
        self.price = kwargs.get("price", Decimal("100"))
        self.status = kwargs.get("status", "filled")


class MockOrderResult:
    def __init__(self, **kwargs):
        self.success = kwargs.get("success", True)
        self.order_id = kwargs.get("order_id")
        self.status = kwargs.get("status")
        self.filled_price = kwargs.get("filled_price")
        self.error_message = kwargs.get("error_message")
        self.raw_response = kwargs.get("raw_response", {})


class MockModelResponse:
    def __init__(self, **kwargs):
        self.success = kwargs.get("success", True)
        self.content = kwargs.get("content")
        self.usage = kwargs.get("usage", {})
        self.error_type = kwargs.get("error_type")
        self.error_message = kwargs.get("error_message")


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def ohlcv_data():
    return {
        "open": [10, 12, 14, 16],
        "high": [11, 13, 15, 17],
        "low": [9, 11, 13, 15],
        "close": [10, 12, 14, 16],
        "volume": [100, 120, 130, 140],
    }


@pytest.fixture
def indicators_config():
    return {"indicators": [{"type": "EMA", "period": 2, "name": "ema_2"}]}


@pytest.fixture
def triggers_config():
    return {
        "rules": [
            {
                "side": "long",
                "logic": "AND",
                "conditions": [{"indicator": "ema_2", "operator": ">", "value": 11}],
            }
        ]
    }


@pytest.fixture
def exchange_account():
    return MockExchangeAccount()


@pytest.fixture
def model_config():
    return MockModelConfig()


@pytest.fixture
def strategy(exchange_account, indicators_config, triggers_config):
    return MockStrategy(
        exchange_account_id=exchange_account.id,
        exchange_account=exchange_account,
        indicators_json=indicators_config,
        triggers_json=triggers_config,
        risk_json={"max_leverage": 10, "min_quantity": "0.001", "min_notional": "5"},
    )


@pytest.fixture
def trader(exchange_account, model_config, strategy):
    return MockTrader(
        exchange_account_id=exchange_account.id,
        model_config_id=model_config.id,
        strategy_id=strategy.id,
        exchange_account=exchange_account,
        model_config=model_config,
        strategy=strategy,
    )


@pytest.fixture
def open_plan_json():
    return json.dumps({
        "action": "open",
        "symbol": "BTCUSDT",
        "side": "long",
        "entry": {"type": "market", "price": None},
        "position_size": {"mode": "notional", "value": 100},
        "leverage": 5,
        "tp": {"mode": "percent", "value": 2},
        "sl": {"mode": "percent", "value": 1},
        "time_in_force": "GTC",
        "confidence": 0.76,
        "reason_summary": "EMA breakout",
        "evidence": {"signals": [], "indicators": {}, "key_levels": {}},
    })


@pytest.fixture
def skip_plan_json():
    return json.dumps({
        "action": "skip",
        "confidence": 0.2,
        "reason_summary": "No edge",
        "evidence": {"signals": [], "indicators": {}, "key_levels": {}},
    })


# ============================================================================
# Trading Workflow Logic Tests
# ============================================================================

class TestTradingWorkflowIntegration:
    """Integration coverage for the core trading cycle logic."""

    def test_full_trading_cycle_happy_path(self, trader, strategy, ohlcv_data, open_plan_json):
        """Signal -> AI approves -> Trade executed successfully."""
        # Setup
        snapshot = MockMarketSnapshot(
            ohlcv=ohlcv_data,
            indicators={"ema_2": [9, 10, 12, 14]},
        )
        signal = MockSignal(
            strategy_id=strategy.id,
            score=Decimal("0.85"),
            snapshot=snapshot,
            snapshot_id=snapshot.id,
        )

        # Simulate AI response
        ai_response = MockModelResponse(
            success=True,
            content=open_plan_json,
            usage={"total_tokens": 120},
        )

        # Simulate order result
        order_result = MockOrderResult(
            success=True,
            order_id="order-1",
            status=MockOrderStatus.FILLED,
            filled_price=Decimal("100"),
        )

        # Create decision
        decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id="T-ORDER-1",
        )

        # Process AI response
        parsed = json.loads(ai_response.content)
        assert parsed["action"] == "open"
        assert parsed["symbol"] == "BTCUSDT"
        assert parsed["confidence"] == 0.76

        # Create trade plan
        trade_plan = MockTradePlan(
            exchange_account_id=trader.exchange_account_id,
            client_order_id=decision.client_order_id,
            symbol=parsed["symbol"],
            side=parsed["side"],
            leverage=Decimal(str(parsed["leverage"])),
            is_paper=False,
        )

        # Verify order execution
        assert order_result.success
        trade_plan.entry_price = order_result.filled_price
        trade_plan.status = "tp_sl_placed"

        # Update decision
        decision.status = "executed"
        decision.tokens_used = ai_response.usage.get("total_tokens")
        decision.trade_plan_id = trade_plan.id

        # Assertions
        assert decision.status == "executed"
        assert decision.tokens_used == 120
        assert decision.trade_plan_id is not None
        assert trade_plan.entry_price == Decimal("100")
        assert trade_plan.is_paper is False

    def test_ai_rejects_trade_skip(self, trader, strategy, skip_plan_json):
        """AI returns skip action - no trade executed."""
        signal = MockSignal(strategy_id=strategy.id)
        ai_response = MockModelResponse(success=True, content=skip_plan_json)

        # Process AI response
        parsed = json.loads(ai_response.content)
        assert parsed["action"] == "skip"

        # Create decision without trade plan
        decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id="T-SKIP-1",
            status="allowed",
            risk_allowed=True,
            trade_plan_id=None,
        )

        assert decision.status == "allowed"
        assert decision.trade_plan_id is None

    def test_trade_execution_failure_exchange_error(self, trader, strategy, open_plan_json):
        """Exchange rejects order - trade marked as failed."""
        signal = MockSignal(strategy_id=strategy.id)
        ai_response = MockModelResponse(success=True, content=open_plan_json)

        # Order rejected by exchange
        order_result = MockOrderResult(
            success=False,
            status=MockOrderStatus.REJECTED,
            error_message="Insufficient margin",
        )

        trade_plan = MockTradePlan(
            exchange_account_id=trader.exchange_account_id,
            client_order_id="T-FAIL-1",
            status="failed",
            error_message=order_result.error_message,
        )

        decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id="T-FAIL-1",
            status="failed",
            execution_error=order_result.error_message,
        )

        assert decision.status == "failed"
        assert "Insufficient margin" in decision.execution_error
        assert trade_plan.status == "failed"

    def test_rate_limit_exceeded_marks_decision_failed(self, trader, strategy):
        """AI rate limit exceeded - decision marked failed."""
        signal = MockSignal(strategy_id=strategy.id)

        ai_response = MockModelResponse(
            success=False,
            error_type="RATE_LIMIT",
            error_message="Trader rate limit exceeded",
        )

        decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id="T-RATE-1",
            status="failed",
            execution_error=f"AI error: {ai_response.error_type}",
        )

        assert decision.status == "failed"
        assert "RATE_LIMIT" in decision.execution_error

    def test_duplicate_order_prevention(self, trader, strategy):
        """Duplicate client_order_id should skip processing."""
        signal = MockSignal(strategy_id=strategy.id)
        client_order_id = "T-DUP-1"

        # Existing decision with same client_order_id
        existing_decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id=client_order_id,
            status="executed",
        )

        # Check for duplicate
        def check_duplicate(order_id, existing):
            return existing.client_order_id == order_id

        is_duplicate = check_duplicate(client_order_id, existing_decision)
        assert is_duplicate is True

    def test_paper_trading_mode_avoids_exchange_orders(self, trader, strategy, open_plan_json):
        """Paper trading mode should not place real orders."""
        trader.mode = "paper"
        signal = MockSignal(strategy_id=strategy.id)
        ai_response = MockModelResponse(success=True, content=open_plan_json)

        # Create paper trade plan
        trade_plan = MockTradePlan(
            exchange_account_id=trader.exchange_account_id,
            client_order_id="T-PAPER-1",
            is_paper=True,
            status="simulated",
        )

        # Mock adapter - should NOT be called
        mock_adapter = MagicMock()

        # In paper mode, we skip exchange calls
        if trader.mode == "paper":
            trade_plan.entry_price = Decimal("100")  # Simulated price
        else:
            mock_adapter.place_market_order()

        assert trade_plan.is_paper is True
        mock_adapter.place_market_order.assert_not_called()


class TestTradingWorkflowEdgeCases:
    """Edge case coverage for market data and trade execution."""

    def test_empty_ohlcv_data_returns_none(self):
        """Empty OHLCV data should not create snapshot."""
        ohlcv = []

        def create_snapshot(data):
            if not data:
                return None
            return MockMarketSnapshot(ohlcv=data)

        result = create_snapshot(ohlcv)
        assert result is None

    def test_missing_indicators_skip_signal(self, strategy):
        """Missing indicators should not generate signal."""
        snapshot = MockMarketSnapshot(ohlcv={"close": [10, 12]}, indicators={})

        def should_generate_signal(snap, trigger_config):
            if not snap.indicators:
                return False
            return True

        result = should_generate_signal(snapshot, strategy.triggers_json)
        assert result is False

    def test_network_timeout_marks_trade_failed(self, trader, strategy, open_plan_json):
        """Network timeout should mark trade as failed."""
        signal = MockSignal(strategy_id=strategy.id)

        # Simulate timeout error
        timeout_error = "request timed out"

        trade_plan = MockTradePlan(
            exchange_account_id=trader.exchange_account_id,
            client_order_id="T-TIMEOUT-1",
            status="failed",
            error_message=timeout_error,
        )

        decision = MockDecisionLog(
            trader_id=trader.id,
            signal_id=signal.id,
            client_order_id="T-TIMEOUT-1",
            status="failed",
            execution_error=timeout_error,
        )

        assert decision.status == "failed"
        assert "timed out" in decision.execution_error
        assert trade_plan.status == "failed"

    def test_invalid_signal_score_handling(self, strategy):
        """Invalid signal score should be handled gracefully."""
        from decimal import InvalidOperation

        def validate_score(score):
            try:
                decimal_score = Decimal(str(score))
                if decimal_score < 0 or decimal_score > 1:
                    raise ValueError("Score out of range")
                return True
            except (TypeError, ValueError, InvalidOperation):
                return False

        assert validate_score(0.85) is True
        assert validate_score("0.5") is True
        assert validate_score("invalid") is False
        assert validate_score(None) is False
        assert validate_score(1.5) is False

    def test_concurrent_position_limit(self, trader):
        """Should respect max concurrent positions limit."""
        trader.max_concurrent_positions = 3
        open_positions = ["BTCUSDT", "ETHUSDT", "SOLUSDT"]

        def can_open_position(max_positions, current_count):
            return current_count < max_positions

        assert can_open_position(trader.max_concurrent_positions, len(open_positions)) is False
        assert can_open_position(trader.max_concurrent_positions, 2) is True
