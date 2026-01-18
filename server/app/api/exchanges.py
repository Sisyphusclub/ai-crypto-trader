"""Exchange accounts CRUD API."""
import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.crypto import encrypt_secret, mask_secret
from app.models import ExchangeAccount, ExchangeType as DBExchangeType, User
from app.api.schemas import ExchangeCreate, ExchangeUpdate, ExchangeResponse, ExchangeType
from app.api.auth import get_current_user

router = APIRouter(prefix="/exchanges", tags=["exchanges"])


def _to_response(account: ExchangeAccount) -> ExchangeResponse:
    """Convert DB model to response schema with masked secrets."""
    return ExchangeResponse(
        id=account.id,
        exchange=ExchangeType(account.exchange.value if hasattr(account.exchange, 'value') else account.exchange),
        label=account.label,
        api_key_masked=mask_secret(account.api_key_encrypted[:20] if account.api_key_encrypted else ""),
        is_testnet=account.is_testnet,
        status=account.status,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.post("", response_model=ExchangeResponse, status_code=status.HTTP_201_CREATED)
def create_exchange(data: ExchangeCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create a new exchange account configuration."""
    account = ExchangeAccount(
        user_id=user.id,
        exchange=data.exchange.value,
        label=data.label,
        api_key_encrypted=encrypt_secret(data.api_key),
        api_secret_encrypted=encrypt_secret(data.api_secret),
        is_testnet=data.is_testnet,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_response(account)


@router.get("", response_model=List[ExchangeResponse])
def list_exchanges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List all exchange accounts (secrets masked)."""
    accounts = db.query(ExchangeAccount).filter(
        ExchangeAccount.user_id == user.id
    ).all()
    return [_to_response(a) for a in accounts]


@router.get("/{exchange_id}", response_model=ExchangeResponse)
def get_exchange(exchange_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a single exchange account by ID."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_id,
        ExchangeAccount.user_id == user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")
    return _to_response(account)


@router.put("/{exchange_id}", response_model=ExchangeResponse)
def update_exchange(exchange_id: uuid.UUID, data: ExchangeUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Update an exchange account configuration."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_id,
        ExchangeAccount.user_id == user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    if data.label is not None:
        account.label = data.label
    if data.api_key is not None:
        account.api_key_encrypted = encrypt_secret(data.api_key)
    if data.api_secret is not None:
        account.api_secret_encrypted = encrypt_secret(data.api_secret)
    if data.is_testnet is not None:
        account.is_testnet = data.is_testnet

    db.commit()
    db.refresh(account)
    return _to_response(account)


@router.delete("/{exchange_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exchange(exchange_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete an exchange account configuration."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_id,
        ExchangeAccount.user_id == user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    db.delete(account)
    db.commit()


class RotateKeyRequest(BaseModel):
    new_api_key: str
    new_api_secret: str


class RotateKeyResponse(BaseModel):
    status: str
    rotated_at: str


@router.post("/{exchange_id}/rotate-key", response_model=RotateKeyResponse)
def rotate_exchange_key(
    exchange_id: uuid.UUID,
    data: RotateKeyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rotate API keys for an exchange account."""
    account = db.query(ExchangeAccount).filter(
        ExchangeAccount.id == exchange_id,
        ExchangeAccount.user_id == user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Exchange account not found")

    # Update keys
    account.api_key_encrypted = encrypt_secret(data.new_api_key)
    account.api_secret_encrypted = encrypt_secret(data.new_api_secret)

    db.commit()

    return RotateKeyResponse(
        status="rotated",
        rotated_at=datetime.utcnow().isoformat(),
    )
