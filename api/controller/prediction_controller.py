from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List

from api.schemas.prediction_schema import PredictionRequest, PredictionResponse
from api.services import prediction_service
from api.database.session import get_db

router = APIRouter()

def verify_role_is_ml_or_admin(X_User_Role: str = Header(default="Business User")):
    if X_User_Role not in ["Admin", "ML Engineer"]:
        raise HTTPException(status_code=403, detail="Permission Denied. Must be Admin or ML Engineer")
    return X_User_Role

@router.post("/predict", response_model=PredictionResponse)
def predict_churn(request: PredictionRequest, db: Session = Depends(get_db), role: str = Depends(verify_role_is_ml_or_admin)):
    """
    On-demand prediction of churn.
    Only accessible by Admin or ML Engineer roles.
    """
    return prediction_service.create_prediction(db, request)

@router.get("/history", response_model=List[PredictionResponse])
def get_prediction_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get recent predictions.
    Accessible by all roles (Admin, ML Engineer, Business User).
    """
    return prediction_service.get_recent_predictions(db, skip=skip, limit=limit)
