"""AI Trader worker tasks."""
import asyncio
import uuid
import time
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.settings import settings
from app.core.crypto import decrypt_secret
from app.core.locks import trader_lock, LockNotAcquiredError
from app.core.logging import get_logger, trader_id_var, symbol_var
from app.core.metrics import (
    worker_jobs_total,
    worker_job_duration_seconds,
    model_calls_total,
    executions_total,
    risk_checks_total,
)
from app.models import (
    Trader,
    DecisionLog,
    Signal,
    MarketSnapshot,
    TradePlan,
    Execution,
    ExchangeAccount,
    ModelConfig,
)
from app.adapters import BinanceAdapter, GateAdapter
from app.adapters.base import OrderSide
from app.ai import model_router, validate_trade_plan, build_ai_prompt
from app.ai.risk_manager import (
    risk_manager,
    RiskProfile,
    AccountState,
    generate_client_order_id,
)

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


async def _get_account_state(
    adapter,
    db: Session,
    trader_id: uuid.UUID,
) -> AccountState:
    """Get current account state for risk checks."""
    try:
        balance = await adapter.get_balance()
        positions = await adapter.get_positions()
    except Exception:
        balance = Decimal("0")
        positions = []

    # Get recent trades for cooldown check
    cutoff = datetime.utcnow() - timedelta(hours=24)
    recent_decisions = db.query(DecisionLog).filter(
        DecisionLog.trader_id == trader_id,
        DecisionLog.created_at > cutoff,
        DecisionLog.status == "executed",
    ).all()

    recent_trades = []
    for d in recent_decisions:
        if d.normalized_plan:
            recent_trades.append({
                "symbol": d.normalized_plan.get("symbol"),
                "side": d.normalized_plan.get("side"),
                "created_at": d.created_at,
            })

    # Calculate daily PnL (simplified)
    daily_pnl = Decimal("0")

    return AccountState(
        available_balance=Decimal(str(balance)),
        open_positions=len(positions),
        current_daily_pnl=daily_pnl,
        recent_trades=recent_trades,
    )


def _build_risk_profile(trader: Trader) -> RiskProfile:
    """Build risk profile from trader and strategy config."""
    strategy = trader.strategy
    risk_json = strategy.risk_json or {}

    return RiskProfile(
        max_leverage=risk_json.get("max_leverage", 10),
        max_position_notional=Decimal(str(risk_json["max_position_notional"])) if risk_json.get("max_position_notional") else None,
        max_position_qty=Decimal(str(risk_json["max_position_qty"])) if risk_json.get("max_position_qty") else None,
        max_concurrent_positions=trader.max_concurrent_positions or 3,
        cooldown_seconds=strategy.cooldown_seconds or 3600,
        daily_loss_cap=trader.daily_loss_cap,
        price_precision=risk_json.get("price_precision", 2),
        quantity_precision=risk_json.get("quantity_precision", 3),
        min_quantity=Decimal(str(risk_json.get("min_quantity", "0.001"))),
        min_notional=Decimal(str(risk_json.get("min_notional", "5"))),
    )


async def _execute_trade(
    normalized_plan,
    trader: Trader,
    client_order_id: str,
    db: Session,
) -> Optional[TradePlan]:
    """Execute trade based on normalized plan."""
    is_paper = trader.mode == "paper" or settings.PAPER_TRADING
    account = trader.exchange_account

    trade_plan = TradePlan(
        exchange_account_id=account.id,
        client_order_id=client_order_id,
        symbol=normalized_plan.symbol,
        side=normalized_plan.side,
        quantity=normalized_plan.quantity,
        tp_price=normalized_plan.tp_price,
        sl_price=normalized_plan.sl_price,
        leverage=Decimal(str(normalized_plan.leverage)),
        status="pending",
        is_paper=is_paper,
    )
    db.add(trade_plan)
    db.flush()

    if is_paper:
        trade_plan.status = "entry_filled"
        trade_plan.entry_price = normalized_plan.entry_price or Decimal("50000.00")
        if normalized_plan.tp_price or normalized_plan.sl_price:
            trade_plan.status = "tp_sl_placed"
        return trade_plan

    adapter = _get_adapter(account)
    try:
        await adapter.set_leverage(normalized_plan.symbol, normalized_plan.leverage)

        order_side = OrderSide.BUY if normalized_plan.side == "long" else OrderSide.SELL
        result = await adapter.place_market_order(
            symbol=normalized_plan.symbol,
            side=order_side,
            quantity=normalized_plan.quantity,
            client_order_id=client_order_id,
        )

        entry_exec = Execution(
            trade_plan_id=trade_plan.id,
            order_type="entry",
            exchange_order_id=result.order_id,
            client_order_id=client_order_id,
            symbol=normalized_plan.symbol,
            side=order_side.value,
            quantity=normalized_plan.quantity,
            price=result.filled_price,
            status=result.status.value if result.status else "pending",
            exchange_response=result.raw_response,
            is_paper=False,
        )
        db.add(entry_exec)

        if result.success:
            trade_plan.status = "entry_filled"
            trade_plan.entry_price = result.filled_price
            trade_plan.entry_order = result.raw_response

            if normalized_plan.tp_price or normalized_plan.sl_price:
                close_side = OrderSide.SELL if normalized_plan.side == "long" else OrderSide.BUY

                if normalized_plan.tp_price:
                    tp_id = f"{client_order_id}_TP"
                    tp_result = await adapter.place_take_profit(
                        symbol=normalized_plan.symbol,
                        side=close_side,
                        quantity=normalized_plan.quantity,
                        stop_price=normalized_plan.tp_price,
                        client_order_id=tp_id,
                    )
                    trade_plan.tp_order = tp_result.raw_response

                if normalized_plan.sl_price:
                    sl_id = f"{client_order_id}_SL"
                    sl_result = await adapter.place_stop_loss(
                        symbol=normalized_plan.symbol,
                        side=close_side,
                        quantity=normalized_plan.quantity,
                        stop_price=normalized_plan.sl_price,
                        client_order_id=sl_id,
                    )
                    trade_plan.sl_order = sl_result.raw_response

                trade_plan.status = "tp_sl_placed"
        else:
            trade_plan.status = "failed"
            trade_plan.error_message = result.error_message

        return trade_plan
    except Exception as e:
        trade_plan.status = "failed"
        trade_plan.error_message = str(e)[:500]
        return trade_plan
    finally:
        await adapter.close()


async def _run_trader_cycle_async(trader_id: str, db: Session) -> Optional[str]:
    """Async implementation of trader cycle."""
    trader = db.query(Trader).filter(
        Trader.id == uuid.UUID(trader_id),
        Trader.enabled == True,
    ).first()

    if not trader:
        return None

    # Fetch latest unprocessed signals for this trader's strategy
    processed_signal_ids = db.query(DecisionLog.signal_id).filter(
        DecisionLog.trader_id == trader.id,
        DecisionLog.signal_id.isnot(None),
    ).subquery()

    signals = db.query(Signal).filter(
        Signal.strategy_id == trader.strategy_id,
        Signal.id.notin_(processed_signal_ids),
    ).order_by(Signal.created_at.desc()).limit(5).all()

    if not signals:
        return None

    decisions_created = []
    adapter = _get_adapter(trader.exchange_account)

    try:
        for signal in signals:
            # Generate deterministic client_order_id
            client_order_id = generate_client_order_id(
                str(trader.id),
                str(signal.id),
                datetime.utcnow(),
            )

            # Check for duplicate
            existing = db.query(DecisionLog).filter(
                DecisionLog.client_order_id == client_order_id,
            ).first()
            if existing:
                continue

            # Get market snapshot
            snapshot = signal.snapshot
            market_data = {}
            if snapshot:
                market_data = {
                    "symbol": snapshot.symbol,
                    "timeframe": snapshot.timeframe,
                    "ohlcv": snapshot.ohlcv[-10:] if snapshot.ohlcv else [],
                    "indicators": snapshot.indicators or {},
                }

            # Get current price
            current_price = None
            try:
                ticker = await adapter.get_ticker(signal.symbol)
                current_price = Decimal(str(ticker.get("price", 0)))
            except Exception:
                pass

            # Build risk profile and account state
            risk_profile = _build_risk_profile(trader)
            account_state = await _get_account_state(adapter, db, trader.id)

            # Build AI input
            signal_data = {
                "symbol": signal.symbol,
                "side": signal.side,
                "score": float(signal.score),
                "timeframe": signal.timeframe,
                "reason": signal.reason_summary,
            }
            risk_data = {
                "max_leverage": risk_profile.max_leverage,
                "max_position_notional": str(risk_profile.max_position_notional) if risk_profile.max_position_notional else None,
                "max_concurrent_positions": risk_profile.max_concurrent_positions,
                "cooldown_seconds": risk_profile.cooldown_seconds,
            }
            account_data = {
                "available_balance": str(account_state.available_balance),
                "open_positions": account_state.open_positions,
            }

            system_prompt, user_prompt = build_ai_prompt(
                signal_data, market_data, risk_data, account_data
            )

            # Create decision log entry
            decision = DecisionLog(
                trader_id=trader.id,
                signal_id=signal.id,
                client_order_id=client_order_id,
                status="pending",
                input_snapshot={
                    "signal": signal_data,
                    "market": market_data,
                    "risk": risk_data,
                    "account": account_data,
                },
                model_provider=trader.model_config.provider.value,
                model_name=trader.model_config.model_name,
                is_paper=trader.mode == "paper" or settings.PAPER_TRADING,
            )
            db.add(decision)
            db.flush()

            # Call AI model
            api_key = decrypt_secret(trader.model_config.api_key_encrypted)
            response = await model_router.generate(
                provider=trader.model_config.provider.value,
                model=trader.model_config.model_name,
                api_key=api_key,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                trader_id=str(trader.id),
            )

            if not response.success:
                decision.status = "failed"
                decision.execution_error = f"AI error: {response.error_type}"
                db.commit()
                decisions_created.append(str(decision.id))
                continue

            decision.tokens_used = response.usage.get("total_tokens") if response.usage else None

            # Validate AI output
            validation = validate_trade_plan(response.content)
            if not validation.valid:
                decision.status = "failed"
                decision.execution_error = "; ".join(validation.errors)
                db.commit()
                decisions_created.append(str(decision.id))
                continue

            plan = validation.plan
            decision.trade_plan = {
                "action": plan.action,
                "symbol": plan.symbol,
                "side": plan.side,
                "leverage": plan.leverage,
                "confidence": plan.confidence,
            }
            decision.confidence = Decimal(str(plan.confidence))
            decision.reason_summary = plan.reason_summary
            decision.evidence = plan.evidence.model_dump() if plan.evidence else None

            if plan.action == "skip":
                decision.status = "allowed"
                decision.risk_allowed = True
                decision.risk_reasons = ["Action is skip"]
                db.commit()
                decisions_created.append(str(decision.id))
                continue

            # Risk check
            risk_report = risk_manager.check(
                plan, risk_profile, account_state, current_price
            )
            decision.risk_allowed = risk_report.allowed
            decision.risk_reasons = risk_report.reasons

            if not risk_report.allowed:
                decision.status = "blocked"
                db.commit()
                decisions_created.append(str(decision.id))
                continue

            decision.normalized_plan = {
                "symbol": risk_report.normalized_plan.symbol,
                "side": risk_report.normalized_plan.side,
                "quantity": str(risk_report.normalized_plan.quantity),
                "leverage": risk_report.normalized_plan.leverage,
                "entry_type": risk_report.normalized_plan.entry_type,
                "entry_price": str(risk_report.normalized_plan.entry_price) if risk_report.normalized_plan.entry_price else None,
                "tp_price": str(risk_report.normalized_plan.tp_price) if risk_report.normalized_plan.tp_price else None,
                "sl_price": str(risk_report.normalized_plan.sl_price) if risk_report.normalized_plan.sl_price else None,
            }

            # Execute trade
            try:
                trade_plan = await _execute_trade(
                    risk_report.normalized_plan,
                    trader,
                    client_order_id,
                    db,
                )
                if trade_plan:
                    decision.trade_plan_id = trade_plan.id
                    decision.status = "executed" if trade_plan.status != "failed" else "failed"
                    if trade_plan.error_message:
                        decision.execution_error = trade_plan.error_message
            except Exception as e:
                decision.status = "failed"
                decision.execution_error = str(e)[:500]

            db.commit()
            decisions_created.append(str(decision.id))

    finally:
        await adapter.close()

    return ",".join(decisions_created) if decisions_created else None


def run_trader_cycle(trader_id: str) -> Optional[str]:
    """Run a single trading cycle for a trader.

    Args:
        trader_id: UUID of the trader to run

    Returns:
        Comma-separated decision IDs if any created, None otherwise
    """
    start_time = time.time()
    trader_id_var.set(trader_id)

    try:
        with trader_lock(trader_id):
            db = _get_db_session()
            try:
                result = asyncio.run(_run_trader_cycle_async(trader_id, db))
                worker_jobs_total.labels(task="trader_cycle", status="success").inc()
                return result
            finally:
                db.close()
    except LockNotAcquiredError:
        logger.warning(f"Skipping trader cycle - lock not acquired", extra={
            "trader_id": trader_id,
            "event": "lock_contention"
        })
        worker_jobs_total.labels(task="trader_cycle", status="skipped").inc()
        return None
    except Exception as e:
        logger.error(f"Trader cycle failed: {e}", extra={
            "trader_id": trader_id,
            "event": "cycle_error"
        })
        worker_jobs_total.labels(task="trader_cycle", status="failed").inc()
        raise
    finally:
        duration = time.time() - start_time
        worker_job_duration_seconds.labels(task="trader_cycle").observe(duration)
        trader_id_var.set(None)


def run_all_traders() -> dict:
    """Run trading cycle for all enabled traders.

    Returns:
        Dict with trader_id -> decision_ids mapping
    """
    start_time = time.time()
    db = _get_db_session()
    try:
        traders = db.query(Trader).filter(Trader.enabled == True).all()
        results = {}
        for trader in traders:
            try:
                with trader_lock(str(trader.id)):
                    decision_ids = asyncio.run(_run_trader_cycle_async(str(trader.id), db))
                    if decision_ids:
                        results[str(trader.id)] = decision_ids
            except LockNotAcquiredError:
                logger.warning(f"Skipping trader - lock not acquired", extra={
                    "trader_id": str(trader.id),
                    "event": "lock_contention"
                })
                continue
        worker_jobs_total.labels(task="run_all_traders", status="success").inc()
        return results
    except Exception as e:
        logger.error(f"Run all traders failed: {e}")
        worker_jobs_total.labels(task="run_all_traders", status="failed").inc()
        raise
    finally:
        duration = time.time() - start_time
        worker_job_duration_seconds.labels(task="run_all_traders").observe(duration)
        db.close()
