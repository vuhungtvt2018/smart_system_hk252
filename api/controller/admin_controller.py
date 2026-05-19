from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from api.database.session import get_db
from api.services import admin_service

router = APIRouter()

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    """Get all users dynamically."""
    return admin_service.get_users(db)

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    """Get all audit logs dynamically from batch jobs and MLflow events."""
    return admin_service.get_audit_logs(db)
