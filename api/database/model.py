from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from .session import Base

class CustomerPrediction(Base):
    __tablename__ = "customer_predictions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, index=True)
    # Features
    tenure = Column(Integer)
    monthly_charges = Column(Float)
    total_charges = Column(Float)
    contract_type = Column(String)
    
    # Prediction output
    churn_probability = Column(Float)
    risk_tier = Column(String) # HIGH, MEDIUM, LOW
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
