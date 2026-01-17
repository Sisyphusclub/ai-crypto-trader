"""Trade API endpoints."""
import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.core.crypto import decrypt_secret
from app.models import ExchangeAccount, TradePlan, Execution
from app.api.schemas import (
    TradePreviewRequest,
    TradePreviewResponse,
    TradeExecuteRequest,
    TradeExecuteResponse,
    PositionResponse,
    OrderResponse,
    TradePlanResponse,
    TradeSide,
)
from app.adapters import ExchangeAdapter, BinanceAdapter, GateAdapter
from app.adapters.base import OrderSide

router = APIRouter(prefix="/trade", tags=["trade"])

MVP_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _get_adapter(account: ExchangeAccount) -> ExchangeAdapter:
    """Create exchange adapter from account config."""
    api_key = decrypt_secret(account.api_key_encrypted)
    api_secret = decrypt_secret(account.api_secret_encrypted)
    exchange = account.exchange.value if hasattr(account.exchange, 'value') else account.exchange

    if exchange == "binance":
        return BinanceAdapter(api_key, api_secret, testnet=account.is_testnet)
    elif exchange == "gate":
        return GateAdapter(api_key, api_secret, testnet=account.is_testnet)
    else:
        raise ValueError(f"Unsupported exchange: {exchange}")


def _generate_client_order_id(prefix: str = "ACT") -> str:
    """Generate unique client order ID."""
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


@router.post("/preview", response_model=TradePreviewResponse)
async def preview_trade(
    data: TradePreviewRequest,
    db: Session = Depends(get_db),
):
    """Preview a trade before execution."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == data.exchange_account_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    is_paper = settings.PAPER_TRADING
    warnings = []

    if is_paper:
        entry_estimate = "0.00"
        margin_estimate = "0.00"
    else:
        adapter = _get_adapter(account)
        try:
            symbol_info = await adapter.get_symbol_info(data.symbol)
            balance = await adapter.get_balance()
            qty = Decimal(str(data.quantity))
            qty = adapter.round_quantity(qty, symbol_info.quantity_precision)

            if qty < symbol_info.min_quantity:
                warnings.append(f"Quantity below minimum: {symbol_info.min_quantity}")
            if qty > symbol_info.max_quantity:
                warnings.append(f"Quantity above maximum: {symbol_info.max_quantity}")

            entry_estimate = "market"
            margin_estimate = str(qty * Decimal("100") / data.leverage)

            if Decimal(margin_estimate) > balance:
                warnings.append(f"Insufficient balance: {balance} USDT")
        except Exception as e:
            warnings.append(f"Failed to fetch market data: {str(e)[:50]}")
            entry_estimate = "unavailable"
            margin_estimate = "unavailable"
        finally:
            await adapter.close()

    return TradePreviewResponse(
        symbol=data.symbol,
        side=data.side,
        quantity=str(data.quantity),
        entry_price_estimate=entry_estimate,
        tp_price=str(data.tp_price) if data.tp_price else None,
        sl_price=str(data.sl_price) if data.sl_price else None,
        leverage=data.leverage,
        estimated_margin=margin_estimate,
        is_paper=is_paper,
        warnings=warnings,
    )


@router.post("/execute", response_model=TradeExecuteResponse)
async def execute_trade(
    data: TradeExecuteRequest,
    db: Session = Depends(get_db),
):
    """Execute a trade plan."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == data.exchange_account_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    is_paper = settings.PAPER_TRADING
    if not is_paper and not data.confirm:
        raise HTTPException(
            status_code=400,
            detail="Live trading requires confirm=true"
        )

    client_order_id = _generate_client_order_id()

    trade_plan = TradePlan(
        exchange_account_id=account.id,
        client_order_id=client_order_id,
        symbol=data.symbol,
        side=data.side.value,
        quantity=Decimal(str(data.quantity)),
        tp_price=Decimal(str(data.tp_price)) if data.tp_price else None,
        sl_price=Decimal(str(data.sl_price)) if data.sl_price else None,
        leverage=Decimal(str(data.leverage)),
        status="pending",
        is_paper=is_paper,
    )
    db.add(trade_plan)
    db.commit()
    db.refresh(trade_plan)

    if is_paper:
        trade_plan.status = "entry_filled"
        trade_plan.entry_price = Decimal("50000.00")
        if data.tp_price or data.sl_price:
            trade_plan.status = "tp_sl_placed"
        db.commit()
        db.refresh(trade_plan)
    else:
        adapter = _get_adapter(account)
        try:
            await adapter.set_leverage(data.symbol, data.leverage)

            order_side = OrderSide.BUY if data.side == TradeSide.LONG else OrderSide.SELL
            result = await adapter.place_market_order(
                symbol=data.symbol,
                side=order_side,
                quantity=Decimal(str(data.quantity)),
                client_order_id=client_order_id,
            )

            entry_exec = Execution(
                trade_plan_id=trade_plan.id,
                order_type="entry",
                exchange_order_id=result.order_id,
                client_order_id=client_order_id,
                symbol=data.symbol,
                side=order_side.value,
                quantity=Decimal(str(data.quantity)),
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

                if data.tp_price or data.sl_price:
                    close_side = OrderSide.SELL if data.side == TradeSide.LONG else OrderSide.BUY
                    qty = Decimal(str(data.quantity))

                    if data.tp_price:
                        tp_id = f"{client_order_id}_TP"
                        tp_result = await adapter.place_take_profit(
                            symbol=data.symbol,
                            side=close_side,
                            quantity=qty,
                            stop_price=Decimal(str(data.tp_price)),
                            client_order_id=tp_id,
                        )
                        trade_plan.tp_order = tp_result.raw_response
                        tp_exec = Execution(
                            trade_plan_id=trade_plan.id,
                            order_type="tp",
                            exchange_order_id=tp_result.order_id,
                            client_order_id=tp_id,
                            symbol=data.symbol,
                            side=close_side.value,
                            quantity=qty,
                            status=tp_result.status.value if tp_result.status else "pending",
                            exchange_response=tp_result.raw_response,
                            is_paper=False,
                        )
                        db.add(tp_exec)

                    if data.sl_price:
                        sl_id = f"{client_order_id}_SL"
                        sl_result = await adapter.place_stop_loss(
                            symbol=data.symbol,
                            side=close_side,
                            quantity=qty,
                            stop_price=Decimal(str(data.sl_price)),
                            client_order_id=sl_id,
                        )
                        trade_plan.sl_order = sl_result.raw_response
                        sl_exec = Execution(
                            trade_plan_id=trade_plan.id,
                            order_type="sl",
                            exchange_order_id=sl_result.order_id,
                            client_order_id=sl_id,
                            symbol=data.symbol,
                            side=close_side.value,
                            quantity=qty,
                            status=sl_result.status.value if sl_result.status else "pending",
                            exchange_response=sl_result.raw_response,
                            is_paper=False,
                        )
                        db.add(sl_exec)

                    trade_plan.status = "tp_sl_placed"
            else:
                trade_plan.status = "failed"
                trade_plan.error_message = result.error_message

            db.commit()
            db.refresh(trade_plan)
        except Exception as e:
            trade_plan.status = "failed"
            trade_plan.error_message = str(e)[:500]
            db.commit()
        finally:
            await adapter.close()

    return TradeExecuteResponse(
        trade_plan_id=trade_plan.id,
        client_order_id=trade_plan.client_order_id,
        status=trade_plan.status,
        symbol=trade_plan.symbol,
        side=TradeSide(trade_plan.side),
        quantity=str(trade_plan.quantity),
        entry_price=str(trade_plan.entry_price) if trade_plan.entry_price else None,
        tp_price=str(trade_plan.tp_price) if trade_plan.tp_price else None,
        sl_price=str(trade_plan.sl_price) if trade_plan.sl_price else None,
        is_paper=trade_plan.is_paper,
        error_message=trade_plan.error_message,
    )


@router.get("/positions", response_model=List[PositionResponse])
async def get_positions(
    exchange_account_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get all open positions for an exchange account."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_account_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    if settings.PAPER_TRADING:
        return []

    adapter = _get_adapter(account)
    try:
        positions = await adapter.get_positions()
        return [
            PositionResponse(
                symbol=p.symbol,
                side=p.side,
                quantity=str(p.quantity),
                entry_price=str(p.entry_price),
                unrealized_pnl=str(p.unrealized_pnl),
                leverage=p.leverage,
                margin_type=p.margin_type,
            )
            for p in positions
        ]
    finally:
        await adapter.close()


@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    exchange_account_id: uuid.UUID,
    symbol: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get open orders for an exchange account."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_account_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    if settings.PAPER_TRADING:
        return []

    adapter = _get_adapter(account)
    try:
        orders = await adapter.get_open_orders(symbol)
        return [
            OrderResponse(
                order_id=o.order_id or "",
                client_order_id=o.client_order_id,
                symbol=symbol or "unknown",
                status=o.status.value if o.status else "unknown",
                filled_qty=str(o.filled_qty) if o.filled_qty else None,
                filled_price=str(o.filled_price) if o.filled_price else None,
            )
            for o in orders
        ]
    finally:
        await adapter.close()


@router.get("/plans", response_model=List[TradePlanResponse])
def get_trade_plans(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get recent trade plans."""
    plans = db.query(TradePlan).join(ExchangeAccount).filter(
        ExchangeAccount.user_id == MVP_USER_ID,
    ).order_by(TradePlan.created_at.desc()).limit(limit).all()

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


@router.get("/plans/{plan_id}", response_model=TradePlanResponse)
def get_trade_plan(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Get a specific trade plan by ID."""
    plan = db.query(TradePlan).join(ExchangeAccount).filter(
        TradePlan.id == plan_id,
        ExchangeAccount.user_id == MVP_USER_ID,
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Trade plan not found")

    return TradePlanResponse(
        id=plan.id,
        client_order_id=plan.client_order_id,
        symbol=plan.symbol,
        side=plan.side,
        quantity=str(plan.quantity),
        entry_price=str(plan.entry_price) if plan.entry_price else None,
        tp_price=str(plan.tp_price) if plan.tp_price else None,
        sl_price=str(plan.sl_price) if plan.sl_price else None,
        leverage=str(plan.leverage),
        status=plan.status,
        is_paper=plan.is_paper,
        error_message=plan.error_message,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )
