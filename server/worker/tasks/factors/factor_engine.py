"""Multi-factor computation engine for technical, sentiment, and on-chain factors."""
import asyncio
import httpx
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
import numpy as np


@dataclass
class FactorResult:
    """Container for computed factor values."""
    technical: Dict[str, float] = field(default_factory=dict)
    sentiment: Dict[str, float] = field(default_factory=dict)
    onchain: Dict[str, float] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def all_factors(self) -> Dict[str, float]:
        """Flatten all factors into single dict with prefixed keys."""
        result = {}
        for k, v in self.technical.items():
            result[f"ta_{k}"] = v
        for k, v in self.sentiment.items():
            result[f"sent_{k}"] = v
        for k, v in self.onchain.items():
            result[f"oc_{k}"] = v
        return result

    def to_vector(self, factor_order: List[str]) -> np.ndarray:
        """Convert to numpy array in specified order for model input."""
        all_f = self.all_factors
        return np.array([all_f.get(k, 0.0) for k in factor_order])


class FactorEngine:
    """Computes multi-factor signals from market data and external sources."""

    FEAR_GREED_URL = "https://api.alternative.me/fng/"
    FEAR_GREED_CACHE_SECONDS = 300

    def __init__(self):
        self._fg_cache: Optional[Dict[str, Any]] = None
        self._fg_cache_ts: Optional[datetime] = None

    def compute_technical(self, ohlcv: List[List], config: Optional[Dict] = None) -> Dict[str, float]:
        """Compute technical indicators from OHLCV data.

        Args:
            ohlcv: List of [timestamp, open, high, low, close, volume]
            config: Optional indicator configuration

        Returns:
            Dict of indicator name -> normalized value [-1, 1] or [0, 1]
        """
        if not ohlcv or len(ohlcv) < 20:
            return {}

        closes = np.array([float(c[4]) for c in ohlcv])
        highs = np.array([float(c[2]) for c in ohlcv])
        lows = np.array([float(c[3]) for c in ohlcv])
        volumes = np.array([float(c[5]) for c in ohlcv])

        result = {}

        # RSI (14)
        result["rsi"] = self._compute_rsi(closes, 14)

        # EMA crossover signal
        ema_fast = self._compute_ema(closes, 9)
        ema_slow = self._compute_ema(closes, 21)
        result["ema_cross"] = 1.0 if ema_fast > ema_slow else -1.0
        result["ema_diff_pct"] = (ema_fast - ema_slow) / ema_slow * 100 if ema_slow else 0

        # ATR (14) normalized by price
        atr = self._compute_atr(highs, lows, closes, 14)
        result["atr_pct"] = (atr / closes[-1]) * 100 if closes[-1] else 0

        # Bollinger Band position
        bb_pos = self._compute_bb_position(closes, 20, 2)
        result["bb_position"] = bb_pos

        # MACD histogram
        macd_hist = self._compute_macd_histogram(closes)
        result["macd_hist"] = macd_hist

        # Volume ratio (current vs 20-period average)
        vol_avg = np.mean(volumes[-20:]) if len(volumes) >= 20 else np.mean(volumes)
        result["volume_ratio"] = volumes[-1] / vol_avg if vol_avg else 1.0

        return result

    async def fetch_sentiment(self) -> Dict[str, float]:
        """Fetch sentiment factors from external APIs.

        Returns:
            Dict of sentiment indicator -> normalized value
        """
        result = {}

        # Fear & Greed Index (cached)
        fg_value = await self._fetch_fear_greed()
        if fg_value is not None:
            result["fear_greed"] = fg_value / 100.0
            result["fear_greed_signal"] = self._fg_to_signal(fg_value)

        return result

    async def fetch_onchain(self, symbol: str) -> Dict[str, float]:
        """Fetch on-chain factors (placeholder for Glassnode/CryptoQuant integration).

        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)

        Returns:
            Dict of on-chain indicator -> normalized value
        """
        # Placeholder - integrate with Glassnode/CryptoQuant API
        return {
            "exchange_netflow": 0.0,
            "whale_ratio": 0.5,
            "active_addresses_change": 0.0,
        }

    async def compute_all(
        self,
        ohlcv: List[List],
        symbol: str,
        technical_config: Optional[Dict] = None,
    ) -> FactorResult:
        """Compute all factors in parallel.

        Args:
            ohlcv: OHLCV data
            symbol: Trading pair symbol
            technical_config: Optional technical indicator config

        Returns:
            FactorResult with all computed factors
        """
        technical = self.compute_technical(ohlcv, technical_config)
        sentiment, onchain = await asyncio.gather(
            self.fetch_sentiment(),
            self.fetch_onchain(symbol),
        )

        return FactorResult(
            technical=technical,
            sentiment=sentiment,
            onchain=onchain,
            timestamp=datetime.utcnow(),
        )

    # === Private Methods ===

    def _compute_rsi(self, closes: np.ndarray, period: int = 14) -> float:
        """Compute RSI normalized to [-1, 1] (0 = neutral at RSI 50)."""
        if len(closes) < period + 1:
            return 0.0

        deltas = np.diff(closes)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)

        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])

        if avg_loss == 0:
            if avg_gain == 0:
                return 0.0  # Flat price = neutral RSI
            rsi = 100
        else:
            rs = avg_gain / avg_loss
            rsi = 100 - (100 / (1 + rs))

        return (rsi - 50) / 50

    def _compute_ema(self, data: np.ndarray, period: int) -> float:
        """Compute EMA of the last value."""
        if len(data) < period:
            return float(data[-1]) if len(data) > 0 else 0.0

        multiplier = 2 / (period + 1)
        ema = data[-period]
        for price in data[-period + 1:]:
            ema = (price - ema) * multiplier + ema
        return float(ema)

    def _compute_atr(
        self,
        highs: np.ndarray,
        lows: np.ndarray,
        closes: np.ndarray,
        period: int = 14,
    ) -> float:
        """Compute Average True Range."""
        if len(closes) < period + 1:
            return 0.0

        tr_list = []
        for i in range(-period, 0):
            hl = highs[i] - lows[i]
            hc = abs(highs[i] - closes[i - 1])
            lc = abs(lows[i] - closes[i - 1])
            tr_list.append(max(hl, hc, lc))

        return float(np.mean(tr_list))

    def _compute_bb_position(
        self,
        closes: np.ndarray,
        period: int = 20,
        std_dev: float = 2.0,
    ) -> float:
        """Compute Bollinger Band position [-1, 1]."""
        if len(closes) < period:
            return 0.0

        sma = np.mean(closes[-period:])
        std = np.std(closes[-period:])

        upper = sma + std_dev * std
        lower = sma - std_dev * std

        current = closes[-1]
        if upper == lower:
            return 0.0

        position = (current - lower) / (upper - lower) * 2 - 1
        return float(np.clip(position, -1, 1))

    def _compute_macd_histogram(self, closes: np.ndarray) -> float:
        """Compute MACD histogram normalized."""
        if len(closes) < 26:
            return 0.0

        ema12 = self._compute_ema(closes, 12)
        ema26 = self._compute_ema(closes, 26)
        macd_line = ema12 - ema26

        # Signal line (9-period EMA of MACD) - simplified
        signal = macd_line * 0.8  # Approximation
        histogram = macd_line - signal

        # Normalize by price
        return histogram / closes[-1] * 100 if closes[-1] else 0

    async def _fetch_fear_greed(self) -> Optional[float]:
        """Fetch Fear & Greed Index with caching."""
        now = datetime.utcnow()

        if (
            self._fg_cache is not None
            and self._fg_cache_ts is not None
            and (now - self._fg_cache_ts).total_seconds() < self.FEAR_GREED_CACHE_SECONDS
        ):
            return self._fg_cache.get("value")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(self.FEAR_GREED_URL)
                resp.raise_for_status()
                data = resp.json()

                if data.get("data") and len(data["data"]) > 0:
                    value = float(data["data"][0]["value"])
                    self._fg_cache = {"value": value}
                    self._fg_cache_ts = now
                    return value
        except Exception:
            pass

        return self._fg_cache.get("value") if self._fg_cache else None

    def _fg_to_signal(self, value: float) -> float:
        """Convert Fear & Greed (0-100) to trading signal [-1, 1].

        Extreme fear (< 25) -> bullish signal (contrarian)
        Extreme greed (> 75) -> bearish signal (contrarian)
        """
        if value < 25:
            return (25 - value) / 25
        elif value > 75:
            return -(value - 75) / 25
        return 0.0
