"""PnL (Profit and Loss) API endpoints."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.settings import settings
from app.models import TradePlan, Execution, ExchangeAccount, User
from app.api.auth import get_current_user

router = APIRouter(prefix="/pnl", tags=["pnl"])


@router.get("/summary")
def get_pnl_summary(
    from_date: Optional[datetime] = Query(None, description="Start date (ISO format)"),
    to_date: Optional[datetime] = Query(None, description="End date (ISO format)"),
    exchange_account_id: Optional[uuid.UUID] = Query(None),
    symbol: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get PnL summary for completed trades.

    Note: This is an estimated PnL based on executed trades.
    For real-time unrealized PnL, use /stream endpoint.
    """
    query = db.query(TradePlan).join(ExchangeAccount).filter(
        ExchangeAccount.user_id == user.id,
        TradePlan.status == "completed",
    )

    if from_date:
        query = query.filter(TradePlan.created_at >= from_date)
    if to_date:
        query = query.filter(TradePlan.created_at <= to_date)
    if exchange_account_id:
        query = query.filter(TradePlan.exchange_account_id == exchange_account_id)
    if symbol:
        query = query.filter(TradePlan.symbol == symbol)

    plans = query.all()

    # Calculate realized PnL from completed trades
    total_pnl = Decimal("0")
    winning_trades = 0
    losing_trades = 0
    total_trades = len(plans)

    for plan in plans:
        if plan.entry_price and plan.tp_price:
            # Simplified PnL calculation
            entry = plan.entry_price
            exit_price = plan.tp_price  # Assume TP hit if completed
            qty = plan.quantity

            if plan.side == "long":
                pnl = (exit_price - entry) * qty
            else:
                pnl = (entry - exit_price) * qty

            total_pnl += pnl
            if pnl > 0:
                winning_trades += 1
            else:
                losing_trades += 1

    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

    return {
        "total_realized_pnl": str(total_pnl),
        "total_trades": total_trades,
        "winning_trades": winning_trades,
        "losing_trades": losing_trades,
        "win_rate": f"{win_rate:.1f}%",
        "estimated": True,
        "mode": "paper" if settings.PAPER_TRADING else "live",
        "from_date": from_date.isoformat() if from_date else None,
        "to_date": to_date.isoformat() if to_date else None,
    }


@router.get("/timeseries")
def get_pnl_timeseries(
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    bucket: str = Query("1h", description="Time bucket: 1m, 5m, 1h, 1d"),
    exchange_account_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Get PnL timeseries data for charting.

    Returns aggregated PnL per time bucket.
    """
    # Default to last 24 hours
    if not to_date:
        to_date = datetime.now(timezone.utc)
    if not from_date:
        from_date = to_date - timedelta(hours=24)

    # Ensure both dates are timezone-aware
    if from_date.tzinfo is None:
        from_date = from_date.replace(tzinfo=timezone.utc)
    if to_date.tzinfo is None:
        to_date = to_date.replace(tzinfo=timezone.utc)

    # Parse bucket to timedelta
    bucket_map = {
        "1m": timedelta(minutes=1),
        "5m": timedelta(minutes=5),
        "1h": timedelta(hours=1),
        "1d": timedelta(days=1),
    }
    bucket_delta = bucket_map.get(bucket, timedelta(hours=1))

    query = db.query(TradePlan).join(ExchangeAccount).filter(
        ExchangeAccount.user_id == user.id,
        TradePlan.status.in_(["completed", "entry_filled", "tp_sl_placed"]),
        TradePlan.created_at >= from_date.replace(tzinfo=None),
        TradePlan.created_at <= to_date.replace(tzinfo=None),
    )

    if exchange_account_id:
        query = query.filter(TradePlan.exchange_account_id == exchange_account_id)

    plans = query.order_by(TradePlan.created_at).all()

    # Bucket the data
    timeseries = []
    current_bucket_start = from_date
    cumulative_pnl = Decimal("0")

    while current_bucket_start < to_date:
        bucket_end = current_bucket_start + bucket_delta
        bucket_pnl = Decimal("0")
        bucket_trades = 0

        for plan in plans:
            if current_bucket_start <= plan.created_at < bucket_end:
                if plan.entry_price:
                    # Simplified: use entry_price as proxy
                    bucket_trades += 1

        timeseries.append({
            "ts": current_bucket_start.isoformat(),
            "cumulative_pnl": str(cumulative_pnl),
            "bucket_pnl": str(bucket_pnl),
            "trades": bucket_trades,
        })

        current_bucket_start = bucket_end

    return {
        "bucket": bucket,
        "from_date": from_date.isoformat(),
        "to_date": to_date.isoformat(),
        "data": timeseries,
        "estimated": True,
    }


@router.get("/today")
def get_today_pnl(
    exchange_account_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get today's PnL summary."""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    query = db.query(TradePlan).join(ExchangeAccount).filter(
        ExchangeAccount.user_id == user.id,
        TradePlan.created_at >= today_start.replace(tzinfo=None),
    )

    if exchange_account_id:
        query = query.filter(TradePlan.exchange_account_id == exchange_account_id)

    plans = query.all()

    total_pnl = Decimal("0")
    total_trades = len(plans)
    executed = sum(1 for p in plans if p.status in ["entry_filled", "tp_sl_placed", "completed"])
    failed = sum(1 for p in plans if p.status == "failed")

    return {
        "date": today_start.date().isoformat(),
        "total_pnl": str(total_pnl),
        "total_trades": total_trades,
        "executed": executed,
        "failed": failed,
        "estimated": True,
        "mode": "paper" if settings.PAPER_TRADING else "live",
    }
