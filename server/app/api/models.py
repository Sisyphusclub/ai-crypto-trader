"""Model configs CRUD API."""
import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.crypto import encrypt_secret, mask_secret
from app.models import ModelConfig, User
from app.api.schemas import ModelConfigCreate, ModelConfigUpdate, ModelConfigResponse, ModelProvider
from app.api.auth import get_current_user

router = APIRouter(prefix="/models", tags=["models"])


def _to_response(config: ModelConfig) -> ModelConfigResponse:
    """Convert DB model to response schema with masked secrets."""
    return ModelConfigResponse(
        id=config.id,
        provider=ModelProvider(config.provider.value if hasattr(config.provider, 'value') else config.provider),
        model_name=config.model_name,
        label=config.label,
        api_key_masked=mask_secret(config.api_key_encrypted[:20] if config.api_key_encrypted else ""),
        base_url=config.base_url,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=ModelConfigResponse, status_code=status.HTTP_201_CREATED)
def create_model_config(data: ModelConfigCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create a new model configuration."""
    config = ModelConfig(
        user_id=user.id,
        provider=data.provider.value,
        model_name=data.model_name,
        label=data.label,
        api_key_encrypted=encrypt_secret(data.api_key),
        base_url=data.base_url,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return _to_response(config)


@router.get("", response_model=List[ModelConfigResponse])
def list_model_configs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List all model configurations (secrets masked)."""
    configs = db.query(ModelConfig).filter(
        ModelConfig.user_id == user.id
    ).all()
    return [_to_response(c) for c in configs]


@router.get("/{config_id}", response_model=ModelConfigResponse)
def get_model_config(config_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a single model configuration by ID."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == user.id,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")
    return _to_response(config)


@router.put("/{config_id}", response_model=ModelConfigResponse)
def update_model_config(config_id: uuid.UUID, data: ModelConfigUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Update a model configuration."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == user.id,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")

    if data.model_name is not None:
        config.model_name = data.model_name
    if data.label is not None:
        config.label = data.label
    if data.api_key is not None:
        config.api_key_encrypted = encrypt_secret(data.api_key)
    if data.base_url is not None:
        config.base_url = data.base_url

    db.commit()
    db.refresh(config)
    return _to_response(config)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_config(config_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Delete a model configuration."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == user.id,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")

    db.delete(config)
    db.commit()


class RotateModelKeyRequest(BaseModel):
    new_api_key: str


class RotateModelKeyResponse(BaseModel):
    status: str
    rotated_at: str


@router.post("/{config_id}/rotate-key", response_model=RotateModelKeyResponse)
def rotate_model_key(
    config_id: uuid.UUID,
    data: RotateModelKeyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rotate API key for a model configuration."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == user.id,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")

    config.api_key_encrypted = encrypt_secret(data.new_api_key)
    db.commit()

    return RotateModelKeyResponse(
        status="rotated",
        rotated_at=datetime.utcnow().isoformat(),
    )
