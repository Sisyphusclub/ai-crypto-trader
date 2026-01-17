"""PnL calculation worker tasks."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings
from app.core.cache import realtime_cache
from app.core.crypto import decrypt_secret
from app.models import TradePlan, ExchangeAccount, Execution
from app.adapters import BinanceAdapter, GateAdapter


def _get_db_session() -> Session:
    """Create a database session for worker tasks."""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def _get_adapter(account: ExchangeAccount):
    """Create exchange adapter from account config."""
    api_key = decrypt_secret(account.api_key_encrypted)
    api_secret = decrypt_secret(account.api_secret_encrypted)
    exchange = account.exchange.value if hasattr(account.exchange, 'value') else account.exchange

    if exchange == "binance":
        return BinanceAdapter(api_key, api_secret, testnet=account.is_testnet)
    elif exchange == "gate":
        return GateAdapter(api_key, api_secret, testnet=account.is_testnet)
    raise ValueError(f"Unknown exchange: {exchange}")


def calculate_realized_pnl(
    exchange_account_id: str,
    from_date: datetime = None,
    to_date: datetime = None,
) -> Dict[str, Any]:
    """Calculate realized PnL for an exchange account.

    Returns:
        Dict with total_pnl, winning_trades, losing_trades, win_rate
    """
    db = _get_db_session()
    try:
        if not to_date:
            to_date = datetime.now(timezone.utc)
        if not from_date:
            from_date = to_date - timedelta(days=30)

        plans = db.query(TradePlan).filter(
            TradePlan.exchange_account_id == uuid.UUID(exchange_account_id),
            TradePlan.status == "completed",
            TradePlan.created_at >= from_date,
            TradePlan.created_at <= to_date,
        ).all()

        total_pnl = Decimal("0")
        winning = 0
        losing = 0

        for plan in plans:
            if not plan.entry_price:
                continue

            # Get exit execution
            exit_exec = db.query(Execution).filter(
                Execution.trade_plan_id == plan.id,
                Execution.order_type.in_(["tp", "sl", "close"]),
                Execution.status == "filled",
            ).first()

            if exit_exec and exit_exec.price:
                exit_price = exit_exec.price
                qty = plan.quantity

                if plan.side == "long":
                    pnl = (exit_price - plan.entry_price) * qty
                else:
                    pnl = (plan.entry_price - exit_price) * qty

                total_pnl += pnl
                if pnl > 0:
                    winning += 1
                else:
                    losing += 1

        total_trades = winning + losing
        win_rate = (winning / total_trades * 100) if total_trades > 0 else 0

        result = {
            "exchange_account_id": exchange_account_id,
            "total_realized_pnl": str(total_pnl),
            "winning_trades": winning,
            "losing_trades": losing,
            "total_trades": total_trades,
            "win_rate": f"{win_rate:.1f}%",
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Cache result
        realtime_cache.set_pnl(exchange_account_id, result)
        return result

    finally:
        db.close()


def calculate_all_pnl() -> Dict[str, Any]:
    """Calculate PnL for all active exchange accounts.

    Returns:
        Dict mapping account_id -> pnl_data
    """
    db = _get_db_session()
    try:
        accounts = db.query(ExchangeAccount).filter(
            ExchangeAccount.status == "active",
        ).all()

        results = {}
        for account in accounts:
            try:
                pnl = calculate_realized_pnl(str(account.id))
                results[str(account.id)] = pnl
            except Exception as e:
                results[str(account.id)] = {"error": str(e)[:100]}

        return results
    finally:
        db.close()


def calculate_today_pnl(exchange_account_id: str = None) -> Dict[str, Any]:
    """Calculate today's PnL summary.

    Returns:
        Dict with today's trades and PnL
    """
    db = _get_db_session()
    try:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        query = db.query(TradePlan).filter(
            TradePlan.created_at >= today_start,
        )

        if exchange_account_id:
            query = query.filter(
                TradePlan.exchange_account_id == uuid.UUID(exchange_account_id)
            )

        plans = query.all()

        total = len(plans)
        executed = sum(
            1 for p in plans
            if p.status in ["entry_filled", "tp_sl_placed", "completed"]
        )
        failed = sum(1 for p in plans if p.status == "failed")

        result = {
            "date": today_start.date().isoformat(),
            "total_trades": total,
            "executed": executed,
            "failed": failed,
            "pending": total - executed - failed,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

        return result
    finally:
        db.close()
