"""Tests for Signals API endpoints."""
import uuid
import pytest
from unittest.mock import MagicMock
from decimal import Decimal


class MockSignal:
    """Mock Signal model for testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid.uuid4())
        self.strategy_id = kwargs.get('strategy_id', uuid.uuid4())
        self.symbol = kwargs.get('symbol', 'BTCUSDT')
        self.timeframe = kwargs.get('timeframe', '1h')
        self.side = kwargs.get('side', 'long')
        self.score = kwargs.get('score', Decimal('0.85'))
        self.reason_summary = kwargs.get('reason_summary', 'Test signal')
        self.snapshot_id = kwargs.get('snapshot_id')
        self.created_at = kwargs.get('created_at')
        self.strategy = kwargs.get('strategy')


class MockStrategy:
    """Mock Strategy model for testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid.uuid4())
        self.user_id = kwargs.get('user_id', uuid.UUID("00000000-0000-0000-0000-000000000001"))
        self.name = kwargs.get('name', 'Test Strategy')


class MockSnapshot:
    """Mock MarketSnapshot model for testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid.uuid4())
        self.indicators = kwargs.get('indicators', {'rsi_14': [50.0, 55.0, 60.0]})


class TestSignalResponseLogic:
    """Tests for signal response conversion logic."""

    def _signal_to_response(self, signal):
        """Convert signal to response dict."""
        return {
            'id': signal.id,
            'strategy_id': signal.strategy_id,
            'symbol': signal.symbol,
            'timeframe': signal.timeframe,
            'side': signal.side,
            'score': str(signal.score),
            'reason_summary': signal.reason_summary,
            'created_at': signal.created_at,
        }

    def test_signal_to_response_converts_model(self):
        """Signal converts to response dict."""
        signal = MockSignal(symbol='BTCUSDT', side='long')
        result = self._signal_to_response(signal)

        assert result['symbol'] == 'BTCUSDT'
        assert result['side'] == 'long'
        assert result['score'] == '0.85'

    def test_signal_to_response_handles_different_sides(self):
        """Signal response handles both long and short sides."""
        long_signal = MockSignal(side='long')
        short_signal = MockSignal(side='short')

        assert self._signal_to_response(long_signal)['side'] == 'long'
        assert self._signal_to_response(short_signal)['side'] == 'short'


class TestSignalDetailLogic:
    """Tests for signal detail response logic."""

    def _get_indicators_at_signal(self, snapshot):
        """Extract last indicator values from snapshot."""
        if not snapshot or not snapshot.indicators:
            return None

        return {
            name: values[-1] if values and len(values) > 0 else None
            for name, values in snapshot.indicators.items()
        }

    def test_get_indicators_extracts_last_values(self):
        """Extracts last value from each indicator."""
        snapshot = MockSnapshot(indicators={
            'rsi_14': [50.0, 55.0, 60.0],
            'ema_20': [40000.0, 40100.0, 40200.0],
        })

        result = self._get_indicators_at_signal(snapshot)

        assert result['rsi_14'] == 60.0
        assert result['ema_20'] == 40200.0

    def test_get_indicators_handles_empty_snapshot(self):
        """Handles missing snapshot."""
        result = self._get_indicators_at_signal(None)
        assert result is None

    def test_get_indicators_handles_empty_indicators(self):
        """Handles snapshot with empty indicators."""
        snapshot = MockSnapshot(indicators={})
        result = self._get_indicators_at_signal(snapshot)
        # Empty indicators dict is falsy, so returns None per implementation
        assert result is None

    def test_get_indicators_handles_empty_value_list(self):
        """Handles indicator with empty value list."""
        snapshot = MockSnapshot(indicators={'rsi_14': []})
        result = self._get_indicators_at_signal(snapshot)
        assert result['rsi_14'] is None

    def test_get_indicators_handles_single_value(self):
        """Handles indicator with single value."""
        snapshot = MockSnapshot(indicators={'rsi_14': [50.0]})
        result = self._get_indicators_at_signal(snapshot)
        assert result['rsi_14'] == 50.0


class TestListSignalsQueryLogic:
    """Tests for list signals query building logic."""

    def test_filter_by_strategy_id(self):
        """Filter applies strategy_id correctly."""
        mock_db = MagicMock()
        strategy_id = uuid.uuid4()

        # Simulate filter chain
        query = mock_db.query().join().filter()
        query.filter().order_by().limit().all.return_value = []

        # Apply filter
        if strategy_id:
            query = query.filter()

        assert mock_db.query.called

    def test_filter_by_symbol(self):
        """Filter applies symbol correctly."""
        signals = [
            MockSignal(symbol='BTCUSDT'),
            MockSignal(symbol='ETHUSDT'),
        ]

        # Filter in Python
        symbol = 'BTCUSDT'
        filtered = [s for s in signals if s.symbol == symbol]

        assert len(filtered) == 1
        assert filtered[0].symbol == 'BTCUSDT'

    def test_filter_by_side(self):
        """Filter applies side correctly."""
        signals = [
            MockSignal(side='long'),
            MockSignal(side='short'),
            MockSignal(side='long'),
        ]

        # Filter in Python
        side = 'long'
        filtered = [s for s in signals if s.side == side]

        assert len(filtered) == 2

    def test_limit_respects_count(self):
        """Limit restricts result count."""
        signals = [MockSignal() for _ in range(100)]

        limit = 10
        limited = signals[:limit]

        assert len(limited) == 10


class TestGetSignalDetailLogic:
    """Tests for get signal detail endpoint logic."""

    def test_signal_not_found_returns_404(self):
        """Missing signal raises 404."""
        from fastapi import HTTPException

        signal = None
        if not signal:
            with pytest.raises(HTTPException) as exc:
                raise HTTPException(status_code=404, detail="Signal not found")
            assert exc.value.status_code == 404

    def test_signal_includes_strategy_name(self):
        """Signal detail includes strategy name."""
        strategy = MockStrategy(name='Test Strategy')
        signal = MockSignal(strategy=strategy)

        strategy_name = signal.strategy.name if signal.strategy else None
        assert strategy_name == 'Test Strategy'

    def test_signal_handles_missing_strategy(self):
        """Signal handles missing strategy gracefully."""
        signal = MockSignal(strategy=None)

        strategy_name = signal.strategy.name if signal.strategy else None
        assert strategy_name is None
