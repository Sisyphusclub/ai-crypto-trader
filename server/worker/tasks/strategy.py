"""Strategy evaluation worker tasks."""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings
from app.core.crypto import decrypt_secret
from app.models import (
    Strategy,
    Signal,
    MarketSnapshot,
    ExchangeAccount,
)
from app.adapters.binance import BinanceAdapter
from app.adapters.gate import GateAdapter
from app.engine.indicators import compute_indicators
from app.engine.triggers import evaluate_triggers

from .factors import FactorEngine, SignalScorer, FactorResult, ScoringResult


def _get_db_session() -> Session:
    """Create a database session for worker tasks."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def _get_adapter(exchange: str, api_key: str, api_secret: str, testnet: bool = True):
    """Create exchange adapter instance."""
    if exchange == "binance":
        return BinanceAdapter(api_key, api_secret, testnet)
    elif exchange == "gate":
        return GateAdapter(api_key, api_secret, testnet)
    raise ValueError(f"Unknown exchange: {exchange}")


# Module-level instances for factor computation
_factor_engine = FactorEngine()
_signal_scorer = SignalScorer()


async def _collect_market_data_async(
    exchange: str,
    symbol: str,
    timeframe: str,
    indicators_config: dict,
    db: Session,
) -> Optional[MarketSnapshot]:
    """Async implementation of market data collection."""
    cutoff = datetime.utcnow() - timedelta(minutes=1)
    existing = db.query(MarketSnapshot).filter(
        MarketSnapshot.exchange == exchange,
        MarketSnapshot.symbol == symbol,
        MarketSnapshot.timeframe == timeframe,
        MarketSnapshot.timestamp > cutoff,
    ).first()

    if existing:
        return existing

    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.exchange == exchange,
        ExchangeAccount.status == "active",
    ).first()

    if not account:
        return None

    api_key = decrypt_secret(account.api_key_encrypted)
    api_secret = decrypt_secret(account.api_secret_encrypted)

    adapter = _get_adapter(exchange, api_key, api_secret, account.is_testnet)
    try:
        ohlcv = await adapter.get_klines(symbol, timeframe, limit=100)
        if not ohlcv:
            return None
        indicators = compute_indicators(ohlcv, indicators_config)

        snapshot = MarketSnapshot(
            id=uuid.uuid4(),
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            timestamp=datetime.utcnow(),
            ohlcv=ohlcv,
            indicators={k: v for k, v in indicators.items()},
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        return snapshot
    finally:
        await adapter.close()


def collect_market_data(
    exchange: str,
    symbol: str,
    timeframe: str,
    indicators_config: dict,
) -> Optional[str]:
    """Collect market data and compute indicators."""
    db = _get_db_session()
    try:
        snapshot = asyncio.run(_collect_market_data_async(
            exchange, symbol, timeframe, indicators_config, db
        ))
        return str(snapshot.id) if snapshot else None
    finally:
        db.close()


async def _evaluate_strategy_async(strategy_id: str, db: Session) -> Optional[str]:
    """Async implementation of strategy evaluation with multi-factor scoring."""
    strategy = db.query(Strategy).filter(
        Strategy.id == uuid.UUID(strategy_id),
        Strategy.enabled == True,
    ).first()

    if not strategy:
        return None

    last_signal = db.query(Signal).filter(
        Signal.strategy_id == strategy.id,
    ).order_by(Signal.created_at.desc()).first()

    if last_signal:
        cooldown_end = last_signal.created_at + timedelta(seconds=strategy.cooldown_seconds)
        if datetime.utcnow() < cooldown_end:
            return None

    use_multifactor = (strategy.indicators_json or {}).get("use_multifactor", False)
    signals_created = []

    for exchange in strategy.exchange_scope or []:
        for symbol in strategy.symbols or []:
            snapshot = await _collect_market_data_async(
                exchange,
                symbol,
                strategy.timeframe,
                strategy.indicators_json,
                db,
            )

            if not snapshot or not snapshot.ohlcv:
                continue

            scoring_result: Optional[ScoringResult] = None
            factor_result: Optional[FactorResult] = None

            if use_multifactor:
                factor_result = await _factor_engine.compute_all(
                    snapshot.ohlcv, symbol, strategy.indicators_json
                )
                scoring_result = _signal_scorer.score(factor_result.all_factors)

                if scoring_result.should_trade:
                    signal = Signal(
                        id=uuid.uuid4(),
                        strategy_id=strategy.id,
                        symbol=symbol,
                        timeframe=strategy.timeframe,
                        side=scoring_result.side,
                        score=scoring_result.score,
                        snapshot_id=snapshot.id,
                        reason_summary=_format_factor_summary(scoring_result),
                    )
                    db.add(signal)
                    signals_created.append(str(signal.id))
            else:
                if not snapshot.indicators:
                    continue

                result = evaluate_triggers(
                    strategy.triggers_json,
                    snapshot.indicators,
                )

                if result.triggered and result.side:
                    signal = Signal(
                        id=uuid.uuid4(),
                        strategy_id=strategy.id,
                        symbol=symbol,
                        timeframe=strategy.timeframe,
                        side=result.side,
                        score=result.score,
                        snapshot_id=snapshot.id,
                        reason_summary="; ".join(result.reasons) if result.reasons else None,
                    )
                    db.add(signal)
                    signals_created.append(str(signal.id))

    if signals_created:
        db.commit()

    return ",".join(signals_created) if signals_created else None


def _format_factor_summary(result: ScoringResult) -> str:
    """Format scoring result into readable summary."""
    top_factors = sorted(
        result.factor_contributions.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:3]
    parts = [f"{result.side.upper()} score={result.score:.2f} conf={result.confidence:.2f}"]
    for name, contrib in top_factors:
        parts.append(f"{name.replace('ta_', '').replace('sent_', '')}={contrib:+.3f}")
    return "; ".join(parts)


def evaluate_strategy(strategy_id: str) -> Optional[str]:
    """Evaluate a strategy and generate signals if conditions are met."""
    db = _get_db_session()
    try:
        return asyncio.run(_evaluate_strategy_async(strategy_id, db))
    finally:
        db.close()


def evaluate_all_strategies() -> dict:
    """Evaluate all enabled strategies."""
    db = _get_db_session()
    try:
        strategies = db.query(Strategy).filter(Strategy.enabled == True).all()
        results = {}
        for strategy in strategies:
            signal_ids = asyncio.run(_evaluate_strategy_async(str(strategy.id), db))
            if signal_ids:
                results[str(strategy.id)] = signal_ids
        return results
    finally:
        db.close()
