"""Server-Sent Events (SSE) stream for real-time data."""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Set
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.core.cache import realtime_cache
from app.core.crypto import decrypt_secret
from app.models import ExchangeAccount, Signal, DecisionLog, TradePlan, Trader
from app.adapters import BinanceAdapter, GateAdapter

router = APIRouter(prefix="/stream", tags=["stream"])

MVP_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Valid event types
VALID_TYPES = {"positions", "orders", "signals", "decisions", "executions", "pnl"}


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


def _sanitize_position(p) -> dict:
    """Sanitize position data (no secrets)."""
    return {
        "symbol": p.symbol,
        "side": p.side,
        "quantity": str(p.quantity),
        "entry_price": str(p.entry_price),
        "unrealized_pnl": str(p.unrealized_pnl),
        "leverage": p.leverage,
        "margin_type": p.margin_type,
    }


def _sanitize_order(o, symbol: str = "") -> dict:
    """Sanitize order data (no secrets)."""
    return {
        "order_id": o.order_id or "",
        "client_order_id": o.client_order_id,
        "symbol": symbol,
        "status": o.status.value if o.status else "unknown",
        "filled_qty": str(o.filled_qty) if o.filled_qty else None,
        "filled_price": str(o.filled_price) if o.filled_price else None,
    }


def _sanitize_signal(s: Signal) -> dict:
    """Sanitize signal data."""
    return {
        "id": str(s.id),
        "strategy_id": str(s.strategy_id),
        "symbol": s.symbol,
        "timeframe": s.timeframe,
        "side": s.side,
        "score": str(s.score),
        "reason_summary": s.reason_summary,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _sanitize_decision(d: DecisionLog) -> dict:
    """Sanitize decision log (no raw CoT, no secrets)."""
    return {
        "id": str(d.id),
        "trader_id": str(d.trader_id),
        "signal_id": str(d.signal_id) if d.signal_id else None,
        "client_order_id": d.client_order_id,
        "status": d.status,
        "confidence": str(d.confidence) if d.confidence else None,
        "reason_summary": d.reason_summary,
        "risk_allowed": d.risk_allowed,
        "risk_reasons": d.risk_reasons,
        "model_provider": d.model_provider,
        "model_name": d.model_name,
        "is_paper": d.is_paper,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def _sanitize_execution(p: TradePlan) -> dict:
    """Sanitize trade plan/execution data."""
    return {
        "id": str(p.id),
        "client_order_id": p.client_order_id,
        "symbol": p.symbol,
        "side": p.side,
        "quantity": str(p.quantity),
        "entry_price": str(p.entry_price) if p.entry_price else None,
        "tp_price": str(p.tp_price) if p.tp_price else None,
        "sl_price": str(p.sl_price) if p.sl_price else None,
        "leverage": str(p.leverage),
        "status": p.status,
        "is_paper": p.is_paper,
        "error_message": p.error_message[:100] if p.error_message else None,  # Truncate errors
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


async def _fetch_positions(account: ExchangeAccount) -> List[dict]:
    """Fetch positions from exchange or cache."""
    cached = realtime_cache.get_positions(str(account.id))
    if cached:
        return cached.get("positions", [])

    if settings.PAPER_TRADING:
        return []

    adapter = _get_adapter(account)
    try:
        positions = await adapter.get_positions()
        result = [_sanitize_position(p) for p in positions]
        realtime_cache.set_positions(str(account.id), result)
        return result
    finally:
        await adapter.close()


async def _fetch_orders(account: ExchangeAccount) -> List[dict]:
    """Fetch open orders from exchange or cache."""
    cached = realtime_cache.get_orders(str(account.id))
    if cached:
        return cached.get("orders", [])

    if settings.PAPER_TRADING:
        return []

    adapter = _get_adapter(account)
    try:
        orders = await adapter.get_open_orders()
        result = [_sanitize_order(o) for o in orders]
        realtime_cache.set_orders(str(account.id), result)
        return result
    finally:
        await adapter.close()


async def _fetch_pnl(account: ExchangeAccount) -> dict:
    """Fetch PnL summary from cache or calculate."""
    cached = realtime_cache.get_pnl(str(account.id))
    if cached:
        return cached

    # Basic PnL from positions
    positions = await _fetch_positions(account)
    total_unrealized = sum(float(p.get("unrealized_pnl", 0)) for p in positions)

    result = {
        "total_unrealized_pnl": str(total_unrealized),
        "position_count": len(positions),
        "estimated": True,
    }
    realtime_cache.set_pnl(str(account.id), result)
    return result


def _format_sse_event(event_id: str, event_type: str, data: dict) -> str:
    """Format SSE event."""
    payload = {
        "type": event_type,
        "ts": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }
    return f"id: {event_id}\nevent: message\ndata: {json.dumps(payload)}\n\n"


async def event_generator(
    request: Request,
    db: Session,
    types: Set[str],
    exchange_account_id: Optional[uuid.UUID],
    last_event_id: Optional[str],
):
    """Generate SSE events."""
    event_counter = int(datetime.now(timezone.utc).timestamp() * 1000)

    # Get exchange accounts for user
    accounts = db.query(ExchangeAccount).filter(
        ExchangeAccount.user_id == MVP_USER_ID,
        ExchangeAccount.status == "active",
    ).all()

    if exchange_account_id:
        accounts = [a for a in accounts if a.id == exchange_account_id]

    # Send initial catch-up events if reconnecting
    if last_event_id:
        events = realtime_cache.get_events_since(last_event_id)
        for event in events:
            if event["type"] in types:
                yield _format_sse_event(event["id"], event["type"], event["data"])

    # Track last signal/decision IDs to detect new ones
    last_signal_id = None
    last_decision_id = None

    while True:
        # Check if client disconnected
        if await request.is_disconnected():
            break

        event_counter += 1
        event_id = str(event_counter)

        try:
            # Positions snapshot
            if "positions" in types:
                for account in accounts:
                    positions = await _fetch_positions(account)
                    yield _format_sse_event(
                        f"{event_id}-pos-{account.id}",
                        "positions",
                        {
                            "exchange_account_id": str(account.id),
                            "exchange": account.exchange.value if hasattr(account.exchange, 'value') else account.exchange,
                            "positions": positions,
                        }
                    )

            # Orders snapshot
            if "orders" in types:
                for account in accounts:
                    orders = await _fetch_orders(account)
                    yield _format_sse_event(
                        f"{event_id}-ord-{account.id}",
                        "orders",
                        {
                            "exchange_account_id": str(account.id),
                            "exchange": account.exchange.value if hasattr(account.exchange, 'value') else account.exchange,
                            "orders": orders,
                        }
                    )

            # PnL snapshot
            if "pnl" in types:
                for account in accounts:
                    pnl = await _fetch_pnl(account)
                    yield _format_sse_event(
                        f"{event_id}-pnl-{account.id}",
                        "pnl",
                        {
                            "exchange_account_id": str(account.id),
                            "exchange": account.exchange.value if hasattr(account.exchange, 'value') else account.exchange,
                            **pnl,
                        }
                    )

            # New signals (append mode)
            if "signals" in types:
                latest_signal = db.query(Signal).order_by(
                    Signal.created_at.desc()
                ).first()
                if latest_signal and str(latest_signal.id) != last_signal_id:
                    last_signal_id = str(latest_signal.id)
                    yield _format_sse_event(
                        f"{event_id}-sig",
                        "signal",
                        _sanitize_signal(latest_signal),
                    )

            # New decisions (append mode)
            if "decisions" in types:
                latest_decision = db.query(DecisionLog).join(Trader).filter(
                    Trader.user_id == MVP_USER_ID,
                ).order_by(DecisionLog.created_at.desc()).first()
                if latest_decision and str(latest_decision.id) != last_decision_id:
                    last_decision_id = str(latest_decision.id)
                    yield _format_sse_event(
                        f"{event_id}-dec",
                        "decision",
                        _sanitize_decision(latest_decision),
                    )

            # Executions (append mode via cached events)
            if "executions" in types:
                events = realtime_cache.get_events_since(limit=5)
                for event in events:
                    if event["type"] == "execution":
                        yield _format_sse_event(
                            event["id"],
                            "execution",
                            event["data"],
                        )

        except Exception as e:
            # Log error but continue streaming
            yield _format_sse_event(
                f"{event_id}-err",
                "error",
                {"message": "Internal error", "code": "STREAM_ERROR"},
            )

        # Wait before next push (1-2 seconds)
        await asyncio.sleep(1.5)


@router.get("")
async def stream(
    request: Request,
    types: str = Query("positions,orders,pnl", description="Comma-separated event types"),
    exchange_account_id: Optional[uuid.UUID] = Query(None, description="Filter by exchange account"),
    db: Session = Depends(get_db),
):
    """
    Server-Sent Events stream for real-time data.

    Supported types: positions, orders, signals, decisions, executions, pnl

    Event format:
    ```
    { "type": "...", "ts": "...", "data": {...} }
    ```

    Use Last-Event-ID header for reconnection.
    """
    # Parse types
    requested_types = set(t.strip().lower() for t in types.split(","))
    invalid_types = requested_types - VALID_TYPES
    if invalid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid types: {invalid_types}. Valid: {VALID_TYPES}"
        )

    # Get Last-Event-ID for reconnection
    last_event_id = request.headers.get("Last-Event-ID")

    return StreamingResponse(
        event_generator(request, db, requested_types, exchange_account_id, last_event_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/snapshot")
async def get_snapshot(
    exchange_account_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get current snapshot of all real-time data (non-streaming).
    Useful for initial page load before SSE connects.
    """
    accounts = db.query(ExchangeAccount).filter(
        ExchangeAccount.user_id == MVP_USER_ID,
        ExchangeAccount.status == "active",
    ).all()

    if exchange_account_id:
        accounts = [a for a in accounts if a.id == exchange_account_id]

    result = {
        "mode": "paper" if settings.PAPER_TRADING else "live",
        "ts": datetime.now(timezone.utc).isoformat(),
        "accounts": [],
    }

    for account in accounts:
        account_data = {
            "id": str(account.id),
            "exchange": account.exchange.value if hasattr(account.exchange, 'value') else account.exchange,
            "label": account.label,
            "is_testnet": account.is_testnet,
            "positions": await _fetch_positions(account),
            "orders": await _fetch_orders(account),
            "pnl": await _fetch_pnl(account),
        }
        result["accounts"].append(account_data)

    # Latest signals
    signals = db.query(Signal).order_by(Signal.created_at.desc()).limit(10).all()
    result["signals"] = [_sanitize_signal(s) for s in signals]

    # Latest decisions
    decisions = db.query(DecisionLog).join(Trader).filter(
        Trader.user_id == MVP_USER_ID,
    ).order_by(DecisionLog.created_at.desc()).limit(10).all()
    result["decisions"] = [_sanitize_decision(d) for d in decisions]

    # Latest executions
    executions = db.query(TradePlan).join(ExchangeAccount).filter(
        ExchangeAccount.user_id == MVP_USER_ID,
    ).order_by(TradePlan.created_at.desc()).limit(10).all()
    result["executions"] = [_sanitize_execution(e) for e in executions]

    return result
