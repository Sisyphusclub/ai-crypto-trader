"""Strategies CRUD API."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Strategy, Signal, User
from app.api.schemas import (
    StrategyCreate,
    StrategyUpdate,
    StrategyResponse,
    StrategyValidateResponse,
    SignalResponse,
    SignalDetailResponse,
    ExchangeType,
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/strategies", tags=["strategies"])


def _to_response(strategy: Strategy) -> StrategyResponse:
    """Convert DB model to response schema."""
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        enabled=strategy.enabled,
        exchange_scope=strategy.exchange_scope or [],
        symbols=strategy.symbols or [],
        timeframe=strategy.timeframe,
        indicators_json=strategy.indicators_json or {},
        triggers_json=strategy.triggers_json or {},
        risk_json=strategy.risk_json or {},
        cooldown_seconds=strategy.cooldown_seconds,
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )


def _validate_config(strategy: Strategy) -> tuple[List[str], List[str]]:
    """Validate strategy configuration. Returns (errors, warnings)."""
    errors = []
    warnings = []

    if not strategy.symbols:
        errors.append("At least one symbol is required")

    if not strategy.exchange_scope:
        errors.append("At least one exchange is required")

    indicators_cfg = strategy.indicators_json or {}
    indicators = indicators_cfg.get("indicators", [])
    if not indicators:
        errors.append("At least one indicator is required")

    indicator_names = set()
    for ind in indicators:
        ind_type = ind.get("type", "").upper()
        period = ind.get("period", 0)
        name = ind.get("name") or f"{ind_type.lower()}_{period}"

        if name in indicator_names:
            errors.append(f"Duplicate indicator name: {name}")
        indicator_names.add(name)

        if period < 1 or period > 500:
            errors.append(f"Invalid period for {name}: must be 1-500")

    triggers_cfg = strategy.triggers_json or {}
    for rule in triggers_cfg.get("rules", []):
        for cond in rule.get("conditions", []):
            ind_ref = cond.get("indicator")
            if ind_ref and ind_ref not in indicator_names:
                errors.append(f"Trigger references undefined indicator: {ind_ref}")

            compare_to = cond.get("compare_to")
            if compare_to and compare_to not in indicator_names:
                errors.append(f"Crossover references undefined indicator: {compare_to}")

            op = cond.get("operator")
            if op in ("<", ">") and cond.get("value") is None:
                errors.append(f"Threshold operator '{op}' requires a value")
            if op in ("crosses_above", "crosses_below") and not compare_to:
                errors.append(f"Crossover operator '{op}' requires compare_to")

    if len(strategy.symbols) > 10:
        warnings.append("Evaluating more than 10 symbols may cause delays")

    if strategy.cooldown_seconds < 300:
        warnings.append("Short cooldown (<5min) may generate many signals")

    valid_timeframes = {"1m", "5m", "15m", "30m", "1h", "4h", "1d"}
    if strategy.timeframe not in valid_timeframes:
        errors.append(f"Invalid timeframe: {strategy.timeframe}")

    return errors, warnings


@router.post("", response_model=StrategyResponse, status_code=status.HTTP_201_CREATED)
def create_strategy(
    data: StrategyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new trading strategy."""
    risk_json = data.risk.model_dump()
    cooldown = risk_json.pop("cooldown_seconds", 3600)

    strategy = Strategy(
        user_id=user.id,
        name=data.name,
        exchange_scope=[e.value for e in data.exchange_scope],
        symbols=data.symbols,
        timeframe=data.timeframe.value,
        indicators_json=data.indicators.model_dump(),
        triggers_json=data.triggers.model_dump(),
        risk_json=risk_json,
        cooldown_seconds=cooldown,
    )
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return _to_response(strategy)


@router.get("", response_model=List[StrategyResponse])
def list_strategies(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all strategies."""
    strategies = db.query(Strategy).filter(
        Strategy.user_id == user.id
    ).order_by(Strategy.created_at.desc()).all()
    return [_to_response(s) for s in strategies]


@router.get("/{strategy_id}", response_model=StrategyResponse)
def get_strategy(
    strategy_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a single strategy by ID."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return _to_response(strategy)


@router.put("/{strategy_id}", response_model=StrategyResponse)
def update_strategy(
    strategy_id: uuid.UUID,
    data: StrategyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a strategy."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if data.name is not None:
        strategy.name = data.name
    if data.enabled is not None:
        strategy.enabled = data.enabled
    if data.exchange_scope is not None:
        strategy.exchange_scope = [e.value for e in data.exchange_scope]
    if data.symbols is not None:
        strategy.symbols = data.symbols
    if data.timeframe is not None:
        strategy.timeframe = data.timeframe.value
    if data.indicators is not None:
        strategy.indicators_json = data.indicators.model_dump()
    if data.triggers is not None:
        strategy.triggers_json = data.triggers.model_dump()
    if data.risk is not None:
        risk_json = data.risk.model_dump()
        cooldown = risk_json.pop("cooldown_seconds", None)
        strategy.risk_json = risk_json
        if cooldown is not None:
            strategy.cooldown_seconds = cooldown

    db.commit()
    db.refresh(strategy)
    return _to_response(strategy)


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_strategy(
    strategy_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a strategy."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    db.delete(strategy)
    db.commit()


@router.post("/{strategy_id}/validate", response_model=StrategyValidateResponse)
def validate_strategy(
    strategy_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Validate strategy configuration."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    errors, warnings = _validate_config(strategy)
    return StrategyValidateResponse(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


@router.post("/{strategy_id}/toggle", response_model=StrategyResponse)
def toggle_strategy(
    strategy_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Toggle strategy enabled/disabled."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if not strategy.enabled:
        errors, _ = _validate_config(strategy)
        if errors:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot enable invalid strategy: {'; '.join(errors)}"
            )

    strategy.enabled = not strategy.enabled
    db.commit()
    db.refresh(strategy)
    return _to_response(strategy)


@router.get("/{strategy_id}/signals", response_model=List[SignalResponse])
def get_strategy_signals(
    strategy_id: uuid.UUID,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get signals for a strategy."""
    strategy = db.query(Strategy).filter(
        Strategy.id == strategy_id,
        Strategy.user_id == user.id,
    ).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    signals = db.query(Signal).filter(
        Signal.strategy_id == strategy_id
    ).order_by(Signal.created_at.desc()).limit(limit).all()

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
