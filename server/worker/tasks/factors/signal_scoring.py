"""Signal scoring using Elastic Net regression for multi-factor signals."""
import pickle
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from pathlib import Path


@dataclass
class ScoringResult:
    """Result of signal scoring."""
    score: float  # Combined signal score [-1, 1]
    side: str  # "long" or "short"
    confidence: float  # Model confidence [0, 1]
    factor_contributions: Dict[str, float]  # Factor name -> contribution to score

    @property
    def should_trade(self) -> bool:
        """Determine if score is strong enough to generate a signal."""
        return abs(self.score) >= 0.3 and self.confidence >= 0.5


class SignalScorer:
    """Scores trading signals using multi-factor regression.

    In production, this would use a trained Elastic Net model.
    This implementation provides a rule-based fallback with the same interface.
    """

    # Default factor weights (used when no trained model is available)
    DEFAULT_WEIGHTS = {
        "ta_rsi": 0.15,
        "ta_ema_cross": 0.20,
        "ta_ema_diff_pct": 0.05,
        "ta_bb_position": 0.15,
        "ta_macd_hist": 0.10,
        "ta_volume_ratio": 0.05,
        "sent_fear_greed_signal": 0.15,
        "oc_exchange_netflow": 0.10,
        "oc_whale_ratio": 0.05,
    }

    FACTOR_ORDER = list(DEFAULT_WEIGHTS.keys())

    def __init__(self, model_path: Optional[str] = None):
        """Initialize scorer with optional trained model.

        Args:
            model_path: Path to pickled sklearn model. If None, uses rule-based scoring.
        """
        self._model = None
        self._scaler = None

        if model_path and Path(model_path).exists():
            self._load_model(model_path)

    def score(self, factors: Dict[str, float]) -> ScoringResult:
        """Score a signal based on factor values.

        Args:
            factors: Dict of factor name -> value (from FactorResult.all_factors)

        Returns:
            ScoringResult with score, side, and confidence
        """
        if self._model is not None:
            return self._model_score(factors)
        return self._rule_based_score(factors)

    def _rule_based_score(self, factors: Dict[str, float]) -> ScoringResult:
        """Rule-based scoring using weighted average."""
        contributions = {}
        total_weight = 0.0
        weighted_sum = 0.0

        for factor_name, weight in self.DEFAULT_WEIGHTS.items():
            value = factors.get(factor_name, 0.0)

            # Normalize extreme values
            value = np.clip(value, -2.0, 2.0)

            contribution = value * weight
            contributions[factor_name] = contribution
            weighted_sum += contribution
            total_weight += abs(weight)

        # Normalize score to [-1, 1]
        raw_score = weighted_sum / total_weight if total_weight else 0.0
        score = np.clip(raw_score, -1.0, 1.0)

        # Determine side
        side = "long" if score >= 0 else "short"

        # Confidence based on factor agreement
        factor_signs = [np.sign(v) for v in contributions.values() if v != 0]
        if factor_signs:
            agreement = abs(sum(factor_signs)) / len(factor_signs)
            confidence = 0.5 + (agreement * 0.5)
        else:
            confidence = 0.5

        return ScoringResult(
            score=float(score),
            side=side,
            confidence=float(confidence),
            factor_contributions=contributions,
        )

    def _model_score(self, factors: Dict[str, float]) -> ScoringResult:
        """Score using trained Elastic Net model."""
        # Prepare input vector
        X = np.array([[factors.get(k, 0.0) for k in self.FACTOR_ORDER]])

        # Scale if scaler is available
        if self._scaler is not None:
            X = self._scaler.transform(X)

        # Predict
        prediction = self._model.predict(X)[0]
        score = np.clip(prediction, -1.0, 1.0)

        # Get feature importance for contributions
        if hasattr(self._model, "coef_"):
            coeffs = self._model.coef_
            contributions = {
                name: float(coeffs[i] * factors.get(name, 0.0))
                for i, name in enumerate(self.FACTOR_ORDER)
            }
        else:
            contributions = {}

        # Estimate confidence from prediction margin
        confidence = min(abs(score) * 1.5, 1.0)

        return ScoringResult(
            score=float(score),
            side="long" if score >= 0 else "short",
            confidence=float(confidence),
            factor_contributions=contributions,
        )

    def _load_model(self, model_path: str) -> None:
        """Load trained model from pickle file."""
        try:
            with open(model_path, "rb") as f:
                data = pickle.load(f)

            if isinstance(data, dict):
                self._model = data.get("model")
                self._scaler = data.get("scaler")
            else:
                self._model = data
        except Exception:
            self._model = None
            self._scaler = None

    @classmethod
    def get_factor_order(cls) -> List[str]:
        """Get the expected factor order for model input."""
        return cls.FACTOR_ORDER.copy()


def train_elastic_net(
    X: np.ndarray,
    y: np.ndarray,
    alpha: float = 0.1,
    l1_ratio: float = 0.5,
) -> Tuple[object, object]:
    """Train Elastic Net model on factor data.

    Args:
        X: Feature matrix (n_samples, n_factors)
        y: Target values (future returns or direction)
        alpha: Regularization strength
        l1_ratio: L1/L2 mixing (0 = Ridge, 1 = Lasso)

    Returns:
        Tuple of (trained_model, scaler)

    Note: Requires sklearn to be installed.
    """
    try:
        from sklearn.linear_model import ElasticNet
        from sklearn.preprocessing import StandardScaler

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = ElasticNet(alpha=alpha, l1_ratio=l1_ratio, max_iter=1000)
        model.fit(X_scaled, y)

        return model, scaler
    except ImportError:
        raise ImportError("sklearn required for model training. Install with: pip install scikit-learn")
