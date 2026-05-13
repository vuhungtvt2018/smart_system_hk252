from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.services.monitoring_service import get_monitoring_metrics

router = APIRouter(tags=["Monitoring"])

@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    """Get real-time monitoring metrics including data drift and model performance."""
    return get_monitoring_metrics(db)
