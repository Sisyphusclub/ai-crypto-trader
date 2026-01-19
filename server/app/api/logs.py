"""Decision Logs API endpoints."""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import DecisionLog, Trader, TradePlan, Execution, User
from app.api.schemas import (
    DecisionLogResponse,
    DecisionLogDetailResponse,
    TradePlanResponse,
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/logs", tags=["logs"])


def _build_decision_response(log: DecisionLog) -> DecisionLogResponse:
    """Build decision log response."""
    return DecisionLogResponse(
        id=log.id,
        trader_id=log.trader_id,
        trader_name=log.trader.name if log.trader else None,
        signal_id=log.signal_id,
        client_order_id=log.client_order_id,
        status=log.status,
        confidence=str(log.confidence) if log.confidence else None,
        reason_summary=log.reason_summary,
        risk_allowed=log.risk_allowed,
        risk_reasons=log.risk_reasons if log.risk_reasons else None,
        trade_plan_id=log.trade_plan_id,
        execution_error=log.execution_error,
        model_provider=log.model_provider,
        model_name=log.model_name,
        tokens_used=log.tokens_used,
        is_paper=log.is_paper,
        created_at=log.created_at,
    )


def _build_decision_detail_response(log: DecisionLog) -> DecisionLogDetailResponse:
    """Build detailed decision log response."""
    return DecisionLogDetailResponse(
        id=log.id,
        trader_id=log.trader_id,
        trader_name=log.trader.name if log.trader else None,
        signal_id=log.signal_id,
        client_order_id=log.client_order_id,
        status=log.status,
        input_snapshot=log.input_snapshot,
        trade_plan=log.trade_plan,
        confidence=str(log.confidence) if log.confidence else None,
        reason_summary=log.reason_summary,
        evidence=log.evidence,
        risk_allowed=log.risk_allowed,
        risk_reasons=log.risk_reasons if log.risk_reasons else None,
        normalized_plan=log.normalized_plan,
        trade_plan_id=log.trade_plan_id,
        execution_error=log.execution_error,
        model_provider=log.model_provider,
        model_name=log.model_name,
        tokens_used=log.tokens_used,
        is_paper=log.is_paper,
        created_at=log.created_at,
    )


@router.get("/decisions", response_model=List[DecisionLogResponse])
def list_decisions(
    trader_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    is_paper: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List decision logs with filtering."""
    query = db.query(DecisionLog).join(Trader).filter(
        Trader.user_id == user.id,
    )

    if trader_id:
        query = query.filter(DecisionLog.trader_id == trader_id)
    if status:
        query = query.filter(DecisionLog.status == status)
    if is_paper is not None:
        query = query.filter(DecisionLog.is_paper == is_paper)

    logs = query.order_by(DecisionLog.created_at.desc()).offset(offset).limit(limit).all()
    return [_build_decision_response(log) for log in logs]


@router.get("/decisions/{decision_id}", response_model=DecisionLogDetailResponse)
def get_decision(
    decision_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a specific decision log by ID."""
    log = db.query(DecisionLog).join(Trader).filter(
        DecisionLog.id == decision_id,
        Trader.user_id == user.id,
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Decision log not found")

    return _build_decision_detail_response(log)


@router.get("/executions", response_model=List[TradePlanResponse])
def list_executions(
    trader_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    is_paper: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List execution trade plans with filtering."""
    query = db.query(TradePlan).join(DecisionLog, DecisionLog.trade_plan_id == TradePlan.id).join(
        Trader, Trader.id == DecisionLog.trader_id
    ).filter(
        Trader.user_id == user.id,
    )

    if trader_id:
        query = query.filter(DecisionLog.trader_id == trader_id)
    if status:
        query = query.filter(TradePlan.status == status)
    if is_paper is not None:
        query = query.filter(TradePlan.is_paper == is_paper)

    plans = query.order_by(TradePlan.created_at.desc()).offset(offset).limit(limit).all()

    return [
        TradePlanResponse(
            id=p.id,
            client_order_id=p.client_order_id,
            symbol=p.symbol,
            side=p.side,
            quantity=str(p.quantity),
            entry_price=str(p.entry_price) if p.entry_price else None,
            tp_price=str(p.tp_price) if p.tp_price else None,
            sl_price=str(p.sl_price) if p.sl_price else None,
            leverage=str(p.leverage),
            status=p.status,
            is_paper=p.is_paper,
            error_message=p.error_message,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in plans
    ]


@router.get("/stats")
def get_stats(
    trader_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get aggregated stats for decisions."""
    from sqlalchemy import func

    base_query = db.query(DecisionLog).join(Trader).filter(
        Trader.user_id == user.id,
    )

    if trader_id:
        base_query = base_query.filter(DecisionLog.trader_id == trader_id)

    total = base_query.count()
    executed = base_query.filter(DecisionLog.status == "executed").count()
    blocked = base_query.filter(DecisionLog.status == "blocked").count()
    failed = base_query.filter(DecisionLog.status == "failed").count()
    paper = base_query.filter(DecisionLog.is_paper == True).count()
    live = base_query.filter(DecisionLog.is_paper == False).count()

    return {
        "total": total,
        "executed": executed,
        "blocked": blocked,
        "failed": failed,
        "paper": paper,
        "live": live,
    }
