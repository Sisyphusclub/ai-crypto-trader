"""Signals API endpoints."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Signal, Strategy, MarketSnapshot, User
from app.api.schemas import SignalResponse, SignalDetailResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("", response_model=List[SignalResponse])
def list_signals(
    strategy_id: Optional[uuid.UUID] = None,
    symbol: Optional[str] = None,
    side: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List recent signals with optional filters."""
    query = db.query(Signal).join(Strategy).filter(
        Strategy.user_id == user.id
    )

    if strategy_id:
        query = query.filter(Signal.strategy_id == strategy_id)
    if symbol:
        query = query.filter(Signal.symbol == symbol)
    if side:
        query = query.filter(Signal.side == side)

    signals = query.order_by(Signal.created_at.desc()).limit(limit).all()

    return [
        SignalResponse(
            id=s.id,
            strategy_id=s.strategy_id,
            symbol=s.symbol,
            timeframe=s.timeframe,
            side=s.side,
            score=str(s.score),
            reason_summary=s.reason_summary,
            created_at=s.created_at,
        )
        for s in signals
    ]


@router.get("/{signal_id}", response_model=SignalDetailResponse)
def get_signal(
    signal_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get detailed signal information including indicator values."""
    signal = db.query(Signal).join(Strategy).filter(
        Signal.id == signal_id,
        Strategy.user_id == user.id,
    ).first()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    indicators_at_signal = None
    if signal.snapshot_id:
        snapshot = db.query(MarketSnapshot).filter(
            MarketSnapshot.id == signal.snapshot_id
        ).first()
        if snapshot and snapshot.indicators:
            indicators_at_signal = {
                name: values[-1] if values and len(values) > 0 else None
                for name, values in snapshot.indicators.items()
            }

    return SignalDetailResponse(
        id=signal.id,
        strategy_id=signal.strategy_id,
        strategy_name=signal.strategy.name if signal.strategy else None,
        symbol=signal.symbol,
        timeframe=signal.timeframe,
        side=signal.side,
        score=str(signal.score),
        reason_summary=signal.reason_summary,
        indicators_at_signal=indicators_at_signal,
        created_at=signal.created_at,
    )
