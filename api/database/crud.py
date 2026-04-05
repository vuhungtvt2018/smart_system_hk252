from sqlalchemy.orm import Session
from . import model

def get_predictions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(model.CustomerPrediction).offset(skip).limit(limit).all()

def create_prediction(db: Session, customer_id: str, tenure: int, monthly_charges: float, total_charges: float, contract_type: str, churn_probability: float, risk_tier: str):
    db_prediction = model.CustomerPrediction(
        customer_id=customer_id,
        tenure=tenure,
        monthly_charges=monthly_charges,
        total_charges=total_charges,
        contract_type=contract_type,
        churn_probability=churn_probability,
        risk_tier=risk_tier
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction
