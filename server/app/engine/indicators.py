"""Technical indicator calculations (pure Python, no external libs)."""
from typing import List, Optional, Dict, Any
from decimal import Decimal


def ema(closes: List[float], period: int) -> List[Optional[float]]:
    """Calculate Exponential Moving Average.

    Args:
        closes: List of closing prices (oldest first)
        period: EMA period

    Returns:
        List of EMA values (None for insufficient data points)
    """
    if not closes or period < 1:
        return []

    result: List[Optional[float]] = []
    multiplier = 2.0 / (period + 1)

    for i in range(len(closes)):
        if i < period - 1:
            result.append(None)
        elif i == period - 1:
            # First EMA = SMA of first 'period' values
            sma = sum(closes[:period]) / period
            result.append(sma)
        else:
            prev_ema = result[i - 1]
            if prev_ema is not None:
                current_ema = (closes[i] - prev_ema) * multiplier + prev_ema
                result.append(current_ema)
            else:
                result.append(None)

    return result


def rsi(closes: List[float], period: int = 14) -> List[Optional[float]]:
    """Calculate Relative Strength Index.

    Args:
        closes: List of closing prices (oldest first)
        period: RSI period (default 14)

    Returns:
        List of RSI values (0-100, None for insufficient data)
    """
    if len(closes) < period + 1:
        return [None] * len(closes)

    result: List[Optional[float]] = [None] * period

    # Calculate price changes
    gains: List[float] = []
    losses: List[float] = []

    for i in range(1, len(closes)):
        change = closes[i] - closes[i - 1]
        gains.append(max(0, change))
        losses.append(max(0, -change))

    # First RSI uses simple average
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    if avg_loss == 0:
        result.append(100.0)
    else:
        rs = avg_gain / avg_loss
        result.append(100.0 - (100.0 / (1.0 + rs)))

    # Subsequent RSI uses smoothed average
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

        if avg_loss == 0:
            result.append(100.0)
        else:
            rs = avg_gain / avg_loss
            result.append(100.0 - (100.0 / (1.0 + rs)))

    return result


def atr(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    period: int = 14
) -> List[Optional[float]]:
    """Calculate Average True Range.

    Args:
        highs: List of high prices (oldest first)
        lows: List of low prices (oldest first)
        closes: List of closing prices (oldest first)
        period: ATR period (default 14)

    Returns:
        List of ATR values (None for insufficient data)
    """
    if len(closes) < 2 or len(highs) != len(closes) or len(lows) != len(closes):
        return [None] * len(closes)

    # Calculate True Range for each bar
    true_ranges: List[float] = [highs[0] - lows[0]]  # First TR = H - L

    for i in range(1, len(closes)):
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i - 1])
        low_close = abs(lows[i] - closes[i - 1])
        true_ranges.append(max(high_low, high_close, low_close))

    # Calculate ATR using Wilder's smoothing
    result: List[Optional[float]] = [None] * (period - 1)

    if len(true_ranges) >= period:
        # First ATR = simple average
        first_atr = sum(true_ranges[:period]) / period
        result.append(first_atr)

        prev_atr = first_atr
        for i in range(period, len(true_ranges)):
            current_atr = (prev_atr * (period - 1) + true_ranges[i]) / period
            result.append(current_atr)
            prev_atr = current_atr

    return result


def compute_indicators(
    ohlcv: Dict[str, List[float]],
    indicators_config: Dict[str, Any]
) -> Dict[str, List[Optional[float]]]:
    """Compute all configured indicators from OHLCV data.

    Args:
        ohlcv: Dict with keys 'open', 'high', 'low', 'close', 'volume'
        indicators_config: Config dict with 'indicators' list

    Returns:
        Dict mapping indicator names to their computed values
    """
    closes = ohlcv.get("close", [])
    highs = ohlcv.get("high", [])
    lows = ohlcv.get("low", [])

    result: Dict[str, List[Optional[float]]] = {}
    indicators = indicators_config.get("indicators", [])

    for ind in indicators:
        ind_type = ind.get("type", "").upper()
        period = ind.get("period", 14)
        name = ind.get("name") or f"{ind_type.lower()}_{period}"

        if ind_type == "EMA":
            result[name] = ema(closes, period)
        elif ind_type == "RSI":
            result[name] = rsi(closes, period)
        elif ind_type == "ATR":
            result[name] = atr(highs, lows, closes, period)

    return result
