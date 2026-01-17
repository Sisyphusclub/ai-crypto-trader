"""Model configs CRUD API."""
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.crypto import encrypt_secret, mask_secret
from app.models import ModelConfig
from app.api.schemas import ModelConfigCreate, ModelConfigUpdate, ModelConfigResponse, ModelProvider

router = APIRouter(prefix="/models", tags=["models"])

# MVP: hardcoded user_id (single-user system)
MVP_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _to_response(config: ModelConfig) -> ModelConfigResponse:
    """Convert DB model to response schema with masked secrets."""
    return ModelConfigResponse(
        id=config.id,
        provider=ModelProvider(config.provider.value if hasattr(config.provider, 'value') else config.provider),
        model_name=config.model_name,
        label=config.label,
        api_key_masked=mask_secret(config.api_key_encrypted[:20] if config.api_key_encrypted else ""),
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.post("", response_model=ModelConfigResponse, status_code=status.HTTP_201_CREATED)
def create_model_config(data: ModelConfigCreate, db: Session = Depends(get_db)):
    """Create a new model configuration."""
    config = ModelConfig(
        user_id=MVP_USER_ID,
        provider=data.provider.value,
        model_name=data.model_name,
        label=data.label,
        api_key_encrypted=encrypt_secret(data.api_key),
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return _to_response(config)


@router.get("", response_model=List[ModelConfigResponse])
def list_model_configs(db: Session = Depends(get_db)):
    """List all model configurations (secrets masked)."""
    configs = db.query(ModelConfig).filter(
        ModelConfig.user_id == MVP_USER_ID
    ).all()
    return [_to_response(c) for c in configs]


@router.get("/{config_id}", response_model=ModelConfigResponse)
def get_model_config(config_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a single model configuration by ID."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == MVP_USER_ID,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")
    return _to_response(config)


@router.put("/{config_id}", response_model=ModelConfigResponse)
def update_model_config(config_id: uuid.UUID, data: ModelConfigUpdate, db: Session = Depends(get_db)):
    """Update a model configuration."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == MVP_USER_ID,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")

    if data.model_name is not None:
        config.model_name = data.model_name
    if data.label is not None:
        config.label = data.label
    if data.api_key is not None:
        config.api_key_encrypted = encrypt_secret(data.api_key)

    db.commit()
    db.refresh(config)
    return _to_response(config)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model_config(config_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a model configuration."""
    config = db.query(ModelConfig).filter(
        ModelConfig.id == config_id,
        ModelConfig.user_id == MVP_USER_ID,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Model config not found")

    db.delete(config)
    db.commit()
