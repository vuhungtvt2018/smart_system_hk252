from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.services import dashboard_service

router = APIRouter()

@router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Get all metrics required for the Dashboard UI."""
    return dashboard_service.get_dashboard_metrics(db)

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    """Get all recent alerts."""
    return dashboard_service.get_alerts(db)
