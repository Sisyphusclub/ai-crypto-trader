"""Tests for technical indicators."""
import pytest
from app.engine.indicators import ema, rsi, atr, compute_indicators


class TestEMA:
    def test_ema_basic(self):
        closes = [10.0, 11.0, 12.0, 13.0, 14.0]
        result = ema(closes, period=3)

        assert len(result) == 5
        assert result[0] is None
        assert result[1] is None
        # First EMA = SMA of first 3 values = (10 + 11 + 12) / 3 = 11
        assert result[2] == pytest.approx(11.0)
        # EMA = (13 - 11) * 0.5 + 11 = 12
        assert result[3] == pytest.approx(12.0)
        # EMA = (14 - 12) * 0.5 + 12 = 13
        assert result[4] == pytest.approx(13.0)

    def test_ema_empty(self):
        assert ema([], 14) == []

    def test_ema_period_larger_than_data(self):
        result = ema([1.0, 2.0, 3.0], period=5)
        assert all(v is None for v in result)


class TestRSI:
    def test_rsi_overbought(self):
        # Consistently rising prices
        closes = [i for i in range(20)]
        result = rsi(closes, period=14)

        # After 15 periods, RSI should be 100 (all gains, no losses)
        assert result[14] == pytest.approx(100.0)

    def test_rsi_oversold(self):
        # Consistently falling prices
        closes = [20 - i for i in range(20)]
        result = rsi(closes, period=14)

        # After 15 periods, RSI should be 0 (all losses, no gains)
        assert result[14] == pytest.approx(0.0)

    def test_rsi_midpoint(self):
        # Alternating prices (equal gains and losses)
        closes = [10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11, 10, 11]
        result = rsi(closes, period=14)

        # RSI should be around 50
        assert 45 < result[14] < 55

    def test_rsi_insufficient_data(self):
        result = rsi([1, 2, 3], period=14)
        assert all(v is None for v in result)


class TestATR:
    def test_atr_basic(self):
        highs = [12.0, 13.0, 14.0, 15.0, 16.0]
        lows = [10.0, 11.0, 12.0, 13.0, 14.0]
        closes = [11.0, 12.0, 13.0, 14.0, 15.0]

        result = atr(highs, lows, closes, period=3)

        assert len(result) == 5
        assert result[0] is None
        assert result[1] is None
        # First ATR = avg of first 3 TRs = (2 + 2 + 2) / 3 = 2
        assert result[2] == pytest.approx(2.0)

    def test_atr_empty(self):
        result = atr([], [], [], period=14)
        assert result == []

    def test_atr_mismatched_lengths(self):
        result = atr([1, 2], [1], [1, 2], period=2)
        assert all(v is None for v in result)


class TestComputeIndicators:
    def test_compute_multiple_indicators(self):
        ohlcv = {
            "open": [10.0] * 20,
            "high": [12.0] * 20,
            "low": [8.0] * 20,
            "close": [float(10 + i * 0.1) for i in range(20)],
            "volume": [1000.0] * 20,
        }
        config = {
            "indicators": [
                {"type": "EMA", "period": 5},
                {"type": "RSI", "period": 14},
                {"type": "ATR", "period": 10},
            ]
        }

        result = compute_indicators(ohlcv, config)

        assert "ema_5" in result
        assert "rsi_14" in result
        assert "atr_10" in result
        assert len(result["ema_5"]) == 20
        assert len(result["rsi_14"]) == 20
        assert len(result["atr_10"]) == 20

    def test_compute_with_custom_name(self):
        ohlcv = {
            "open": [10.0] * 10,
            "high": [12.0] * 10,
            "low": [8.0] * 10,
            "close": [11.0] * 10,
            "volume": [1000.0] * 10,
        }
        config = {
            "indicators": [
                {"type": "EMA", "period": 5, "name": "fast_ema"},
                {"type": "EMA", "period": 10, "name": "slow_ema"},
            ]
        }

        result = compute_indicators(ohlcv, config)

        assert "fast_ema" in result
        assert "slow_ema" in result

    def test_compute_empty_config(self):
        ohlcv = {"close": [1, 2, 3]}
        result = compute_indicators(ohlcv, {})
        assert result == {}
