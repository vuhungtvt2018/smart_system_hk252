from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PredictionRequest(BaseModel):
    customer_id: str
    tenure: int
    monthly_charges: float
    total_charges: float
    contract_type: str
    
    # other fields mock for now
    
class PredictionResponse(BaseModel):
    id: int
    customer_id: str
    churn_probability: float
    risk_tier: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PredictionBatchResponse(BaseModel):
    message: str
    processed_count: int
