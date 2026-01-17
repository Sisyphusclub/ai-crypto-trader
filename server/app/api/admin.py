"""Admin API for config export/import and system management."""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Strategy, Trader, ExchangeAccount, ModelConfig

router = APIRouter(prefix="/admin", tags=["admin"])

MVP_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


class StrategyExport(BaseModel):
    name: str
    enabled: bool
    exchange_scope: List[str]
    symbols: List[str]
    timeframe: str
    indicators_json: dict
    triggers_json: dict
    risk_json: dict
    cooldown_seconds: int


class TraderExport(BaseModel):
    name: str
    enabled: bool
    mode: str
    max_concurrent_positions: int
    daily_loss_cap: Optional[str] = None
    strategy_name: str
    exchange_label: str
    model_label: str


class ConfigExport(BaseModel):
    version: str = "1.0"
    exported_at: str
    strategies: List[StrategyExport]
    traders: List[TraderExport]


class ConfigImport(BaseModel):
    strategies: List[StrategyExport] = []


@router.get("/export/config", response_model=ConfigExport)
def export_config(db: Session = Depends(get_db)):
    """Export system configuration (strategies and traders, no secrets)."""
    strategies = db.query(Strategy).filter(
        Strategy.user_id == MVP_USER_ID
    ).all()

    traders = db.query(Trader).filter(
        Trader.user_id == MVP_USER_ID
    ).all()

    strategy_exports = []
    for s in strategies:
        strategy_exports.append(StrategyExport(
            name=s.name,
            enabled=s.enabled,
            exchange_scope=s.exchange_scope or [],
            symbols=s.symbols or [],
            timeframe=s.timeframe,
            indicators_json=s.indicators_json or {},
            triggers_json=s.triggers_json or {},
            risk_json=s.risk_json or {},
            cooldown_seconds=s.cooldown_seconds,
        ))

    trader_exports = []
    for t in traders:
        trader_exports.append(TraderExport(
            name=t.name,
            enabled=t.enabled,
            mode=t.mode,
            max_concurrent_positions=t.max_concurrent_positions,
            daily_loss_cap=str(t.daily_loss_cap) if t.daily_loss_cap else None,
            strategy_name=t.strategy.name if t.strategy else "",
            exchange_label=t.exchange_account.label if t.exchange_account else "",
            model_label=t.model_config.label if t.model_config else "",
        ))

    return ConfigExport(
        exported_at=datetime.utcnow().isoformat(),
        strategies=strategy_exports,
        traders=trader_exports,
    )


@router.post("/import/config")
def import_config(data: ConfigImport, db: Session = Depends(get_db)):
    """Import strategies configuration."""
    imported = {"strategies": 0, "skipped": 0}

    for s in data.strategies:
        # Check if strategy with same name exists
        existing = db.query(Strategy).filter(
            Strategy.user_id == MVP_USER_ID,
            Strategy.name == s.name,
        ).first()

        if existing:
            imported["skipped"] += 1
            continue

        strategy = Strategy(
            user_id=MVP_USER_ID,
            name=s.name,
            enabled=False,  # Always import disabled
            exchange_scope=s.exchange_scope,
            symbols=s.symbols,
            timeframe=s.timeframe,
            indicators_json=s.indicators_json,
            triggers_json=s.triggers_json,
            risk_json=s.risk_json,
            cooldown_seconds=s.cooldown_seconds,
        )
        db.add(strategy)
        imported["strategies"] += 1

    db.commit()

    return {
        "status": "imported",
        "imported": imported,
    }
