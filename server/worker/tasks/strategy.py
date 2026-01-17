"""Strategy evaluation worker tasks."""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings
from app.core.crypto import decrypt_value
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


async def _collect_market_data_async(
    exchange: str,
    symbol: str,
    timeframe: str,
    indicators_config: dict,
    db: Session,
) -> Optional[MarketSnapshot]:
    """Async implementation of market data collection."""
    # Check for existing recent snapshot
    cutoff = datetime.utcnow() - timedelta(minutes=1)
    existing = db.query(MarketSnapshot).filter(
        MarketSnapshot.exchange == exchange,
        MarketSnapshot.symbol == symbol,
        MarketSnapshot.timeframe == timeframe,
        MarketSnapshot.timestamp > cutoff,
    ).first()

    if existing:
        return existing

    # Get exchange account for this exchange (use first available)
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.exchange == exchange,
        ExchangeAccount.status == "active",
    ).first()

    if not account:
        return None

    # Decrypt credentials
    api_key = decrypt_value(account.api_key_encrypted)
    api_secret = decrypt_value(account.api_secret_encrypted)

    adapter = _get_adapter(exchange, api_key, api_secret, account.is_testnet)
    try:
        ohlcv = await adapter.get_klines(symbol, timeframe, limit=100)
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
    """Collect market data and compute indicators.

    Args:
        exchange: Exchange name (binance, gate)
        symbol: Trading pair symbol
        timeframe: Candle timeframe
        indicators_config: Indicator configuration dict

    Returns:
        Snapshot ID if successful, None otherwise
    """
    db = _get_db_session()
    try:
        snapshot = asyncio.run(_collect_market_data_async(
            exchange, symbol, timeframe, indicators_config, db
        ))
        return str(snapshot.id) if snapshot else None
    finally:
        db.close()


async def _evaluate_strategy_async(strategy_id: str, db: Session) -> Optional[str]:
    """Async implementation of strategy evaluation."""
    strategy = db.query(Strategy).filter(
        Strategy.id == uuid.UUID(strategy_id),
        Strategy.enabled == True,
    ).first()

    if not strategy:
        return None

    # Check cooldown
    last_signal = db.query(Signal).filter(
        Signal.strategy_id == strategy.id,
    ).order_by(Signal.created_at.desc()).first()

    if last_signal:
        cooldown_end = last_signal.created_at + timedelta(seconds=strategy.cooldown_seconds)
        if datetime.utcnow() < cooldown_end:
            return None  # Still in cooldown

    signals_created = []

    for exchange in strategy.exchange_scope or []:
        for symbol in strategy.symbols or []:
            # Collect market data
            snapshot = await _collect_market_data_async(
                exchange,
                symbol,
                strategy.timeframe,
                strategy.indicators_json,
                db,
            )

            if not snapshot or not snapshot.indicators:
                continue

            # Evaluate triggers
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


def evaluate_strategy(strategy_id: str) -> Optional[str]:
    """Evaluate a strategy and generate signals if conditions are met.

    Args:
        strategy_id: UUID of the strategy to evaluate

    Returns:
        Comma-separated signal IDs if any created, None otherwise
    """
    db = _get_db_session()
    try:
        return asyncio.run(_evaluate_strategy_async(strategy_id, db))
    finally:
        db.close()


def evaluate_all_strategies() -> dict:
    """Evaluate all enabled strategies.

    Returns:
        Dict with strategy_id -> signal_ids mapping
    """
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
