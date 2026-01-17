"""Reconciliation task to sync DB state with exchange."""
import asyncio
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict

from sqlalchemy import create_engine, or_
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings
from app.core.crypto import decrypt_secret
from app.core.locks import reconcile_lock, LockNotAcquiredError
from app.core.logging import get_logger
from app.core.metrics import (
    reconcile_runs_total,
    reconcile_updates_total,
    worker_jobs_total,
)
from app.models import (
    TradePlan,
    Execution,
    ExchangeAccount,
    DecisionLog,
)
from app.models.base import TradePlanStatus, ExecutionStatus
from app.adapters import BinanceAdapter, GateAdapter

logger = get_logger(__name__)


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


async def _reconcile_trade_plan(
    plan: TradePlan,
    adapter,
    db: Session,
) -> bool:
    """Reconcile a single trade plan with exchange state."""
    updated = False

    # Get executions for this plan
    executions = db.query(Execution).filter(
        Execution.trade_plan_id == plan.id
    ).all()

    for execution in executions:
        if execution.status in [ExecutionStatus.FILLED.value, ExecutionStatus.CANCELLED.value]:
            continue

        if not execution.exchange_order_id:
            continue

        try:
            order_info = await adapter.get_order(
                symbol=execution.symbol,
                order_id=execution.exchange_order_id,
            )

            if not order_info:
                continue

            new_status = order_info.get("status", "").lower()
            if new_status in ["filled", "closed"]:
                execution.status = ExecutionStatus.FILLED.value
                price = order_info.get("price")
                if price is not None:
                    execution.price = Decimal(str(price))
                execution.filled_at = datetime.utcnow()
                updated = True
                reconcile_updates_total.labels(type="execution_filled").inc()
                logger.info(f"Reconciled execution to filled", extra={
                    "execution_id": str(execution.id),
                    "order_id": execution.exchange_order_id,
                })
            elif new_status in ["cancelled", "canceled", "expired"]:
                execution.status = ExecutionStatus.CANCELLED.value
                updated = True
                reconcile_updates_total.labels(type="execution_cancelled").inc()
            elif new_status in ["partially_filled", "partial"]:
                execution.status = ExecutionStatus.PARTIALLY_FILLED.value
                if order_info.get("filled_qty"):
                    execution.quantity = Decimal(str(order_info["filled_qty"]))
                updated = True
                reconcile_updates_total.labels(type="execution_partial").inc()

        except Exception as e:
            logger.warning(f"Failed to reconcile execution: {e}", extra={
                "execution_id": str(execution.id),
            })

    # Update trade plan status based on executions
    if updated:
        entry_execs = [e for e in executions if e.order_type == "entry"]
        if entry_execs and all(e.status == ExecutionStatus.FILLED.value for e in entry_execs):
            if plan.status == TradePlanStatus.ENTRY_PLACED.value:
                plan.status = TradePlanStatus.ENTRY_FILLED.value
                if entry_execs[0].price is not None:
                    plan.entry_price = entry_execs[0].price
                reconcile_updates_total.labels(type="plan_entry_filled").inc()

        # Check if all TP/SL are done
        tp_sl_execs = [e for e in executions if e.order_type in ["tp", "sl"]]
        if tp_sl_execs:
            all_closed = all(
                e.status in [ExecutionStatus.FILLED.value, ExecutionStatus.CANCELLED.value]
                for e in tp_sl_execs
            )
            if all_closed and plan.status == TradePlanStatus.TP_SL_PLACED.value:
                plan.status = TradePlanStatus.COMPLETED.value
                reconcile_updates_total.labels(type="plan_completed").inc()

    return updated


async def _reconcile_exchange_state_async(
    exchange_account_id: str,
    db: Session,
) -> Dict:
    """Async implementation of exchange state reconciliation."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == uuid.UUID(exchange_account_id)
    ).first()

    if not account:
        return {"error": "Account not found"}

    adapter = _get_adapter(account)
    results = {"updated": 0, "checked": 0, "errors": 0}

    try:
        # Find non-terminal trade plans for this account
        lookback = datetime.utcnow() - timedelta(hours=settings.RECONCILE_LOOKBACK_HOURS)
        plans = db.query(TradePlan).filter(
            TradePlan.exchange_account_id == account.id,
            TradePlan.created_at > lookback,
            TradePlan.is_paper == False,
            TradePlan.status.in_([
                TradePlanStatus.PENDING.value,
                TradePlanStatus.ENTRY_PLACED.value,
                TradePlanStatus.ENTRY_FILLED.value,
                TradePlanStatus.TP_SL_PLACED.value,
            ])
        ).limit(settings.RECONCILE_BATCH_SIZE).all()

        for plan in plans:
            results["checked"] += 1
            try:
                if await _reconcile_trade_plan(plan, adapter, db):
                    results["updated"] += 1
            except Exception as e:
                results["errors"] += 1
                logger.error(f"Error reconciling plan: {e}", extra={
                    "trade_plan_id": str(plan.id),
                })

        db.commit()
        return results

    finally:
        await adapter.close()


def reconcile_exchange_state(exchange_account_id: str) -> Dict:
    """Reconcile DB state with exchange for an account.

    Args:
        exchange_account_id: UUID of the exchange account

    Returns:
        Dict with reconciliation results
    """
    try:
        with reconcile_lock(exchange_account_id):
            db = _get_db_session()
            try:
                result = asyncio.run(_reconcile_exchange_state_async(exchange_account_id, db))
                reconcile_runs_total.labels(status="success").inc()
                logger.info(f"Reconciliation completed", extra={
                    "exchange_account_id": exchange_account_id,
                    "checked": result.get("checked", 0),
                    "updated": result.get("updated", 0),
                })
                return result
            finally:
                db.close()
    except LockNotAcquiredError:
        logger.warning(f"Reconciliation skipped - lock not acquired", extra={
            "exchange_account_id": exchange_account_id,
        })
        reconcile_runs_total.labels(status="skipped").inc()
        return {"skipped": True, "reason": "lock_not_acquired"}
    except Exception as e:
        logger.error(f"Reconciliation failed: {e}", extra={
            "exchange_account_id": exchange_account_id,
        })
        reconcile_runs_total.labels(status="failed").inc()
        raise


def reconcile_all_accounts() -> Dict:
    """Reconcile all active exchange accounts.

    Returns:
        Dict with account_id -> result mapping
    """
    db = _get_db_session()
    try:
        accounts = db.query(ExchangeAccount).filter(
            ExchangeAccount.status == "active"
        ).all()

        results = {}
        for account in accounts:
            try:
                results[str(account.id)] = reconcile_exchange_state(str(account.id))
            except Exception as e:
                results[str(account.id)] = {"error": str(e)}

        worker_jobs_total.labels(task="reconcile_all", status="success").inc()
        return results
    finally:
        db.close()
