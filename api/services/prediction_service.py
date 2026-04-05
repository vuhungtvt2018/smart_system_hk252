from sqlalchemy.orm import Session
from api.schemas.prediction_schema import PredictionRequest
from api.database import crud
from api.database.utils import format_risk_tier
import random

def create_prediction(db: Session, request: PredictionRequest):
    # Dummy logic for ML model inference
    churn_probability = round(random.uniform(0.1, 0.95), 2)
    risk_tier = format_risk_tier(churn_probability)
    
    return crud.create_prediction(
        db=db,
        customer_id=request.customer_id,
        tenure=request.tenure,
        monthly_charges=request.monthly_charges,
        total_charges=request.total_charges,
        contract_type=request.contract_type,
        churn_probability=churn_probability,
        risk_tier=risk_tier
    )

def get_recent_predictions(db: Session, skip: int = 0, limit: int = 100):
    return crud.get_predictions(db, skip=skip, limit=limit)
