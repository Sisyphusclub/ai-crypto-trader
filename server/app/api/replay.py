"""Replay/Audit API for trade chain visualization."""
import uuid
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import (
    TradePlan,
    Execution,
    DecisionLog,
    Signal,
    MarketSnapshot,
    Trader,
    ExchangeAccount,
)

router = APIRouter(prefix="/replay", tags=["replay"])

MVP_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


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


def _build_replay_chain(
    decision: Optional[DecisionLog],
    signal: Optional[Signal],
    snapshot: Optional[MarketSnapshot],
    trade_plan: Optional[TradePlan],
    executions: list,
) -> dict:
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
                "strategy_id": str(signal.strategy_id),
                "symbol": signal.symbol,
                "timeframe": signal.timeframe,
                "side": signal.side,
                "score": str(signal.score),
                "reason_summary": signal.reason_summary,
                "created_at": signal.created_at.isoformat() if signal.created_at else None,
            }
        })

    # 2. Market Snapshot (sanitized)
    if snapshot:
        chain["chain"].append({
            "step": 2,
            "type": "market_snapshot",
            "data": {
                "id": str(snapshot.id),
                "exchange": snapshot.exchange,
                "symbol": snapshot.symbol,
                "timeframe": snapshot.timeframe,
                "timestamp": snapshot.timestamp.isoformat() if snapshot.timestamp else None,
                "ohlcv_summary": _sanitize_ohlcv(snapshot.ohlcv),
                "indicators": snapshot.indicators or {},
            }
        })

    # 3. AI Decision (no raw CoT)
    if decision:
        chain["chain"].append({
            "step": 3,
            "type": "ai_decision",
            "data": {
                "id": str(decision.id),
                "trader_id": str(decision.trader_id),
                "client_order_id": decision.client_order_id,
                "status": decision.status,
                "model_provider": decision.model_provider,
                "model_name": decision.model_name,
                "confidence": str(decision.confidence) if decision.confidence else None,
                "reason_summary": decision.reason_summary,
                "evidence": decision.evidence,  # Structured evidence only
                "trade_plan": decision.trade_plan,
                "tokens_used": decision.tokens_used,
                "is_paper": decision.is_paper,
                "created_at": decision.created_at.isoformat() if decision.created_at else None,
            }
        })

        # 4. Risk Report
        chain["chain"].append({
            "step": 4,
            "type": "risk_report",
            "data": {
                "allowed": decision.risk_allowed,
                "reasons": decision.risk_reasons or [],
                "normalized_plan": decision.normalized_plan,
            }
        })

    # 5. Trade Plan
    if trade_plan:
        chain["chain"].append({
            "step": 5,
            "type": "trade_plan",
            "data": {
                "id": str(trade_plan.id),
                "client_order_id": trade_plan.client_order_id,
                "symbol": trade_plan.symbol,
                "side": trade_plan.side,
                "quantity": str(trade_plan.quantity),
                "entry_price": str(trade_plan.entry_price) if trade_plan.entry_price else None,
                "tp_price": str(trade_plan.tp_price) if trade_plan.tp_price else None,
                "sl_price": str(trade_plan.sl_price) if trade_plan.sl_price else None,
                "leverage": str(trade_plan.leverage),
                "status": trade_plan.status,
                "is_paper": trade_plan.is_paper,
                "error_message": trade_plan.error_message[:100] if trade_plan.error_message else None,
                "created_at": trade_plan.created_at.isoformat() if trade_plan.created_at else None,
            }
        })

    # 6. Executions
    for i, ex in enumerate(executions):
        chain["chain"].append({
            "step": 6 + i,
            "type": "execution",
            "data": {
                "id": str(ex.id),
                "order_type": ex.order_type,
                "exchange_order_id": ex.exchange_order_id,
                "client_order_id": ex.client_order_id,
                "symbol": ex.symbol,
                "side": ex.side,
                "quantity": str(ex.quantity),
                "price": str(ex.price) if ex.price else None,
                "status": ex.status,
                "is_paper": ex.is_paper,
                "error_message": ex.error_message[:100] if ex.error_message else None,
                "created_at": ex.created_at.isoformat() if ex.created_at else None,
            }
        })

    return chain


@router.get("/decision/{decision_id}")
def replay_decision(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Get complete replay chain for a decision.

    Shows: signal → market_snapshot → AI decision → risk_report → trade_plan → executions
    """
    decision = db.query(DecisionLog).join(Trader).filter(
        DecisionLog.id == decision_id,
        Trader.user_id == MVP_USER_ID,
    ).first()

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Get related objects
    signal = None
    snapshot = None
    if decision.signal_id:
        signal = db.query(Signal).filter(Signal.id == decision.signal_id).first()
        if signal and signal.snapshot_id:
            snapshot = db.query(MarketSnapshot).filter(MarketSnapshot.id == signal.snapshot_id).first()

    trade_plan = None
    executions = []
    if decision.trade_plan_id:
        trade_plan = db.query(TradePlan).filter(TradePlan.id == decision.trade_plan_id).first()
        if trade_plan:
            executions = db.query(Execution).filter(
                Execution.trade_plan_id == trade_plan.id
            ).order_by(Execution.created_at).all()

    return _build_replay_chain(decision, signal, snapshot, trade_plan, executions)


@router.get("/trade/{trade_plan_id}")
def replay_trade(
    trade_plan_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Get complete replay chain for a trade plan.

    Traces back from trade_plan to signal via decision_log.
    """
    trade_plan = db.query(TradePlan).join(ExchangeAccount).filter(
        TradePlan.id == trade_plan_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()

    if not trade_plan:
        raise HTTPException(status_code=404, detail="Trade plan not found")

    # Find decision that created this trade
    decision = db.query(DecisionLog).filter(
        DecisionLog.trade_plan_id == trade_plan_id
    ).first()

    signal = None
    snapshot = None
    if decision and decision.signal_id:
        signal = db.query(Signal).filter(Signal.id == decision.signal_id).first()
        if signal and signal.snapshot_id:
            snapshot = db.query(MarketSnapshot).filter(MarketSnapshot.id == signal.snapshot_id).first()

    executions = db.query(Execution).filter(
        Execution.trade_plan_id == trade_plan.id
    ).order_by(Execution.created_at).all()

    return _build_replay_chain(decision, signal, snapshot, trade_plan, executions)


@router.get("/signal/{signal_id}")
def replay_signal(
    signal_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Get replay chain starting from a signal.

    Shows all decisions/trades that were triggered by this signal.
    """
    signal = db.query(Signal).filter(Signal.id == signal_id).first()

    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    snapshot = None
    if signal.snapshot_id:
        snapshot = db.query(MarketSnapshot).filter(MarketSnapshot.id == signal.snapshot_id).first()

    # Find all decisions for this signal
    decisions = db.query(DecisionLog).join(Trader).filter(
        DecisionLog.signal_id == signal_id,
        Trader.user_id == MVP_USER_ID,
    ).all()

    result = {
        "signal": {
            "id": str(signal.id),
            "strategy_id": str(signal.strategy_id),
            "symbol": signal.symbol,
            "timeframe": signal.timeframe,
            "side": signal.side,
            "score": str(signal.score),
            "reason_summary": signal.reason_summary,
            "created_at": signal.created_at.isoformat() if signal.created_at else None,
        },
        "market_snapshot": {
            "ohlcv_summary": _sanitize_ohlcv(snapshot.ohlcv) if snapshot else {},
            "indicators": snapshot.indicators if snapshot else {},
        } if snapshot else None,
        "decisions": [],
    }

    for d in decisions:
        trade_plan = None
        if d.trade_plan_id:
            trade_plan = db.query(TradePlan).filter(TradePlan.id == d.trade_plan_id).first()

        result["decisions"].append({
            "id": str(d.id),
            "trader_id": str(d.trader_id),
            "status": d.status,
            "confidence": str(d.confidence) if d.confidence else None,
            "reason_summary": d.reason_summary,
            "risk_allowed": d.risk_allowed,
            "trade_plan_id": str(d.trade_plan_id) if d.trade_plan_id else None,
            "trade_status": trade_plan.status if trade_plan else None,
        })

    return result


@router.get("/decision/{decision_id}/export")
def export_decision_json(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Export decision replay chain as downloadable JSON.
    """
    # Reuse replay_decision logic
    chain = replay_decision(decision_id, db)

    return JSONResponse(
        content=chain,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="replay_{decision_id}.json"'
        }
    )


@router.get("/trade/{trade_plan_id}/export")
def export_trade_json(
    trade_plan_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """
    Export trade replay chain as downloadable JSON.
    """
    chain = replay_trade(trade_plan_id, db)

    return JSONResponse(
        content=chain,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="replay_trade_{trade_plan_id}.json"'
        }
    )
