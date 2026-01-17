"""Tests for Dashboard helper functions."""
import pytest
import json
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock


class TestOHLCVSanitization:
    """Test OHLCV data sanitization logic."""

    def test_sanitize_ohlcv_limits_candles(self):
        """OHLCV sanitization limits candles to specified limit."""
        def _sanitize_ohlcv(ohlcv: dict, limit: int = 5) -> dict:
            """Sanitize OHLCV data, keep only last N candles."""
            if not ohlcv:
                return {}
            return {
                "open": ohlcv.get("open", [])[-limit:],
                "high": ohlcv.get("high", [])[-limit:],
                "low": ohlcv.get("low", [])[-limit:],
                "close": ohlcv.get("close", [])[-limit:],
                "volume": ohlcv.get("volume", [])[-limit:],
            }

        ohlcv = {
            "open": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "high": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "low": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "close": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "volume": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        }
        result = _sanitize_ohlcv(ohlcv, limit=5)
        assert len(result["open"]) == 5
        assert result["open"] == [6, 7, 8, 9, 10]

    def test_sanitize_ohlcv_handles_empty(self):
        """OHLCV sanitization handles empty input."""
        def _sanitize_ohlcv(ohlcv: dict, limit: int = 5) -> dict:
            if not ohlcv:
                return {}
            return {
                "open": ohlcv.get("open", [])[-limit:],
                "high": ohlcv.get("high", [])[-limit:],
                "low": ohlcv.get("low", [])[-limit:],
                "close": ohlcv.get("close", [])[-limit:],
                "volume": ohlcv.get("volume", [])[-limit:],
            }

        assert _sanitize_ohlcv({}) == {}
        assert _sanitize_ohlcv(None) == {}


class TestSSEEventFormat:
    """Test SSE event formatting logic."""

    def test_sse_event_format_structure(self):
        """SSE event formatting produces valid output."""
        def _format_sse_event(event_id: str, event_type: str, data: dict) -> str:
            payload = {
                "type": event_type,
                "ts": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }
            return f"id: {event_id}\nevent: message\ndata: {json.dumps(payload)}\n\n"

        result = _format_sse_event("123", "test", {"key": "value"})
        assert result.startswith("id: 123\n")
        assert "event: message\n" in result
        assert "data: " in result
        assert result.endswith("\n\n")

        # Parse the data
        lines = result.strip().split("\n")
        data_line = [l for l in lines if l.startswith("data: ")][0]
        data = json.loads(data_line.replace("data: ", ""))
        assert data["type"] == "test"
        assert "ts" in data
        assert data["data"]["key"] == "value"

    def test_sse_event_with_complex_data(self):
        """SSE event handles complex nested data."""
        def _format_sse_event(event_id: str, event_type: str, data: dict) -> str:
            payload = {
                "type": event_type,
                "ts": datetime.now(timezone.utc).isoformat(),
                "data": data,
            }
            return f"id: {event_id}\nevent: message\ndata: {json.dumps(payload)}\n\n"

        complex_data = {
            "positions": [
                {"symbol": "BTCUSDT", "side": "long", "pnl": "100.50"},
                {"symbol": "ETHUSDT", "side": "short", "pnl": "-50.25"},
            ],
            "count": 2,
        }
        result = _format_sse_event("456", "positions", complex_data)

        lines = result.strip().split("\n")
        data_line = [l for l in lines if l.startswith("data: ")][0]
        data = json.loads(data_line.replace("data: ", ""))
        assert len(data["data"]["positions"]) == 2


class TestReplayChainBuilder:
    """Test replay chain building logic."""

    def _build_replay_chain(self, decision, signal, snapshot, trade_plan, executions):
        """Build the complete replay chain from signal to execution."""
        chain = {
            "generated_at": datetime.utcnow().isoformat(),
            "chain": [],
        }

        # 1. Signal
        if signal:
            chain["chain"].append({
                "step": 1,
                "type": "signal",
                "data": {
                    "id": str(signal.id),
                    "symbol": signal.symbol,
                    "side": signal.side,
                }
            })

        # 2. Market Snapshot
        if snapshot:
            chain["chain"].append({
                "step": 2,
                "type": "market_snapshot",
                "data": {"id": str(snapshot.id)}
            })

        # 3. AI Decision
        if decision:
            chain["chain"].append({
                "step": 3,
                "type": "ai_decision",
                "data": {
                    "id": str(decision.id),
                    "status": decision.status,
                }
            })

            # 4. Risk Report
            chain["chain"].append({
                "step": 4,
                "type": "risk_report",
                "data": {
                    "allowed": decision.risk_allowed,
                }
            })

        # 5. Trade Plan
        if trade_plan:
            chain["chain"].append({
                "step": 5,
                "type": "trade_plan",
                "data": {"id": str(trade_plan.id)}
            })

        # 6. Executions
        for i, ex in enumerate(executions):
            chain["chain"].append({
                "step": 6 + i,
                "type": "execution",
                "data": {"id": str(ex.id)}
            })

        return chain

    def test_build_chain_empty_inputs(self):
        """Chain builder handles all None inputs."""
        result = self._build_replay_chain(None, None, None, None, [])
        assert "generated_at" in result
        assert result["chain"] == []

    def test_build_chain_with_signal(self):
        """Chain builder includes signal when provided."""
        mock_signal = MagicMock()
        mock_signal.id = "sig-123"
        mock_signal.symbol = "BTCUSDT"
        mock_signal.side = "long"

        result = self._build_replay_chain(None, mock_signal, None, None, [])
        assert len(result["chain"]) == 1
        assert result["chain"][0]["type"] == "signal"
        assert result["chain"][0]["step"] == 1
        assert result["chain"][0]["data"]["symbol"] == "BTCUSDT"

    def test_build_chain_with_decision(self):
        """Chain builder includes decision and risk report."""
        mock_decision = MagicMock()
        mock_decision.id = "dec-123"
        mock_decision.status = "executed"
        mock_decision.risk_allowed = True

        result = self._build_replay_chain(mock_decision, None, None, None, [])
        assert len(result["chain"]) == 2  # AI decision + risk report
        assert result["chain"][0]["type"] == "ai_decision"
        assert result["chain"][1]["type"] == "risk_report"

    def test_build_chain_full(self):
        """Chain builder includes all components."""
        mock_signal = MagicMock()
        mock_signal.id = "sig-123"
        mock_signal.symbol = "BTCUSDT"
        mock_signal.side = "long"

        mock_snapshot = MagicMock()
        mock_snapshot.id = "snap-123"

        mock_decision = MagicMock()
        mock_decision.id = "dec-123"
        mock_decision.status = "executed"
        mock_decision.risk_allowed = True

        mock_trade = MagicMock()
        mock_trade.id = "trade-123"

        mock_exec = MagicMock()
        mock_exec.id = "exec-123"

        result = self._build_replay_chain(
            mock_decision, mock_signal, mock_snapshot, mock_trade, [mock_exec]
        )
        # signal + snapshot + decision + risk + trade + execution = 6
        assert len(result["chain"]) == 6
        types = [step["type"] for step in result["chain"]]
        assert "signal" in types
        assert "market_snapshot" in types
        assert "ai_decision" in types
        assert "risk_report" in types
        assert "trade_plan" in types
        assert "execution" in types


class TestSanitizationHelpers:
    """Test data sanitization helpers."""

    def test_sanitize_position_format(self):
        """Position sanitization produces correct structure."""
        def _sanitize_position(p) -> dict:
            return {
                "symbol": p.symbol,
                "side": p.side,
                "quantity": str(p.quantity),
                "entry_price": str(p.entry_price),
                "unrealized_pnl": str(p.unrealized_pnl),
                "leverage": p.leverage,
                "margin_type": p.margin_type,
            }

        mock_position = MagicMock()
        mock_position.symbol = "BTCUSDT"
        mock_position.side = "long"
        mock_position.quantity = Decimal("0.01")
        mock_position.entry_price = Decimal("50000")
        mock_position.unrealized_pnl = Decimal("100")
        mock_position.leverage = 10
        mock_position.margin_type = "cross"

        result = _sanitize_position(mock_position)
        assert result["symbol"] == "BTCUSDT"
        assert result["side"] == "long"
        assert result["quantity"] == "0.01"
        assert result["leverage"] == 10
        assert "secret" not in str(result).lower()

    def test_sanitize_decision_excludes_raw_cot(self):
        """Decision sanitization excludes raw CoT field."""
        def _sanitize_decision(d) -> dict:
            return {
                "id": str(d.id),
                "status": d.status,
                "confidence": str(d.confidence) if d.confidence else None,
                "reason_summary": d.reason_summary,
                "is_paper": d.is_paper,
            }

        mock_decision = MagicMock()
        mock_decision.id = "dec-123"
        mock_decision.status = "executed"
        mock_decision.confidence = Decimal("0.85")
        mock_decision.reason_summary = "Strong signal"
        mock_decision.is_paper = True
        mock_decision.raw_cot = "This should not appear"  # Raw CoT

        result = _sanitize_decision(mock_decision)
        assert "raw_cot" not in result
        assert result["status"] == "executed"
        assert result["reason_summary"] == "Strong signal"
