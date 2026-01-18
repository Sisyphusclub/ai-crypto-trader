"""Traders API endpoints."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.models import Trader, ExchangeAccount, ModelConfig, Strategy, User
from app.api.schemas import (
    TraderCreate,
    TraderUpdate,
    TraderResponse,
    TraderStartRequest,
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/traders", tags=["traders"])


def _build_response(trader: Trader) -> TraderResponse:
    """Build trader response with related labels."""
    return TraderResponse(
        id=trader.id,
        name=trader.name,
        exchange_account_id=trader.exchange_account_id,
        exchange_label=trader.exchange_account.label if trader.exchange_account else None,
        model_config_id=trader.model_config_id,
        model_label=trader.model_config.label if trader.model_config else None,
        strategy_id=trader.strategy_id,
        strategy_name=trader.strategy.name if trader.strategy else None,
        enabled=trader.enabled,
        mode=trader.mode,
        max_concurrent_positions=trader.max_concurrent_positions,
        daily_loss_cap=str(trader.daily_loss_cap) if trader.daily_loss_cap else None,
        created_at=trader.created_at,
        updated_at=trader.updated_at,
    )


@router.get("", response_model=List[TraderResponse])
def list_traders(
    enabled: bool = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all traders for the current user."""
    query = db.query(Trader).filter(Trader.user_id == user.id)
    if enabled is not None:
        query = query.filter(Trader.enabled == enabled)
    traders = query.order_by(Trader.created_at.desc()).limit(limit).all()
    return [_build_response(t) for t in traders]


@router.post("", response_model=TraderResponse, status_code=status.HTTP_201_CREATED)
def create_trader(
    data: TraderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new trader."""
    # Verify exchange account
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == data.exchange_account_id,
        ExchangeAccount.user_id == user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    # Verify model config
    model = db.query(ModelConfig).filter(
        ModelConfig.id == data.model_config_id,
        ModelConfig.user_id == user.id,
    ).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model config not found")

    # Verify strategy
    strategy = db.query(Strategy).filter(
        Strategy.id == data.strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    trader = Trader(
        user_id=user.id,
        name=data.name,
        exchange_account_id=data.exchange_account_id,
        model_config_id=data.model_config_id,
        strategy_id=data.strategy_id,
        mode=data.mode.value,
        max_concurrent_positions=data.max_concurrent_positions,
        daily_loss_cap=data.daily_loss_cap,
        enabled=False,
    )
    db.add(trader)
    db.commit()
    db.refresh(trader)
    return _build_response(trader)


@router.get("/{trader_id}", response_model=TraderResponse)
def get_trader(
    trader_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a specific trader by ID."""
    trader = db.query(Trader).filter(
        Trader.id == trader_id,
        Trader.user_id == user.id,
    ).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return _build_response(trader)


@router.patch("/{trader_id}", response_model=TraderResponse)
def update_trader(
    trader_id: uuid.UUID,
    data: TraderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a trader."""
    trader = db.query(Trader).filter(
        Trader.id == trader_id,
        Trader.user_id == user.id,
    ).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    if data.name is not None:
        trader.name = data.name
    if data.enabled is not None:
        trader.enabled = data.enabled
    if data.mode is not None:
        trader.mode = data.mode.value
    if data.max_concurrent_positions is not None:
        trader.max_concurrent_positions = data.max_concurrent_positions
    if data.daily_loss_cap is not None:
        trader.daily_loss_cap = data.daily_loss_cap

    db.commit()
    db.refresh(trader)
    return _build_response(trader)


@router.delete("/{trader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trader(
    trader_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a trader."""
    trader = db.query(Trader).filter(
        Trader.id == trader_id,
        Trader.user_id == user.id,
    ).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    db.delete(trader)
    db.commit()


@router.post("/{trader_id}/start", response_model=TraderResponse)
def start_trader(
    trader_id: uuid.UUID,
    data: TraderStartRequest = TraderStartRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start a trader (enable it)."""
    trader = db.query(Trader).filter(
        Trader.id == trader_id,
        Trader.user_id == user.id,
    ).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    # Live mode requires confirmation
    if trader.mode == "live" and not settings.PAPER_TRADING:
        if not data.confirm:
            raise HTTPException(
                status_code=400,
                detail="Live trading requires confirm=true"
            )

    trader.enabled = True
    db.commit()
    db.refresh(trader)
    return _build_response(trader)


@router.post("/{trader_id}/stop", response_model=TraderResponse)
def stop_trader(
    trader_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Stop a trader (disable it)."""
    trader = db.query(Trader).filter(
        Trader.id == trader_id,
        Trader.user_id == user.id,
    ).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    trader.enabled = False
    db.commit()
    db.refresh(trader)
    return _build_response(trader)
