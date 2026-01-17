"""Alerts API endpoints."""
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Alert, AlertSeverity, AlertCategory

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertResponse(BaseModel):
    id: uuid.UUID
    severity: str
    category: str
    title: str
    message: str
    context_json: Optional[dict] = None
    acknowledged: bool
    acknowledged_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertCreate(BaseModel):
    severity: str
    category: str
    title: str
    message: str
    context_json: Optional[dict] = None


class AlertStats(BaseModel):
    total: int
    unacknowledged: int
    by_severity: dict
    by_category: dict


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List alerts with optional filters."""
    query = db.query(Alert).order_by(Alert.created_at.desc())

    if severity:
        query = query.filter(Alert.severity == severity)
    if category:
        query = query.filter(Alert.category == category)
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)

    return query.offset(offset).limit(limit).all()


@router.get("/stats", response_model=AlertStats)
def get_alert_stats(db: Session = Depends(get_db)):
    """Get alert statistics."""
    total = db.query(Alert).count()
    unacknowledged = db.query(Alert).filter(Alert.acknowledged == False).count()

    by_severity = {}
    for severity in AlertSeverity:
        count = db.query(Alert).filter(
            Alert.severity == severity.value,
            Alert.acknowledged == False
        ).count()
        if count > 0:
            by_severity[severity.value] = count

    by_category = {}
    for category in AlertCategory:
        count = db.query(Alert).filter(
            Alert.category == category.value,
            Alert.acknowledged == False
        ).count()
        if count > 0:
            by_category[category.value] = count

    return AlertStats(
        total=total,
        unacknowledged=unacknowledged,
        by_severity=by_severity,
        by_category=by_category,
    )


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: uuid.UUID, db: Session = Depends(get_db)):
    """Get a single alert by ID."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: uuid.UUID, db: Session = Depends(get_db)):
    """Acknowledge a single alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    db.commit()

    return {"status": "acknowledged", "id": str(alert_id)}


@router.post("/acknowledge-all")
def acknowledge_all_alerts(
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Acknowledge all matching alerts."""
    query = db.query(Alert).filter(Alert.acknowledged == False)

    if severity:
        query = query.filter(Alert.severity == severity)
    if category:
        query = query.filter(Alert.category == category)

    count = query.update({
        Alert.acknowledged: True,
        Alert.acknowledged_at: datetime.utcnow(),
    })
    db.commit()

    return {"status": "acknowledged", "count": count}


def create_alert(
    db: Session,
    severity: AlertSeverity,
    category: AlertCategory,
    title: str,
    message: str,
    context: Optional[dict] = None,
) -> Alert:
    """Create a new alert (utility function for internal use)."""
    alert = Alert(
        severity=severity,
        category=category,
        title=title,
        message=message,
        context_json=context,
    )
    db.add(alert)
    db.commit()
    return alert
