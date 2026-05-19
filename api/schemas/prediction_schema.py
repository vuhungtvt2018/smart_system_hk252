from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ── Raw Input Features (19 original fields) ───────────────────────────────────
class PredictionRequest(BaseModel):
    """Full customer feature set matching the Telco Churn dataset schema."""
    # Identifier (optional – used for display/history only)
    customer_id: Optional[str] = Field(None, description="Customer ID for tracking")

    # Demographic
    gender: str = Field(..., description="Male / Female")
    senior_citizen: int = Field(..., ge=0, le=1, description="0 = No, 1 = Yes")
    partner: str = Field(..., description="Yes / No")
    dependents: str = Field(..., description="Yes / No")

    # Services
    phone_service: str = Field(..., description="Yes / No")
    multiple_lines: str = Field(..., description="Yes / No / No phone service")
    internet_service: str = Field(..., description="DSL / Fiber optic / No")
    online_security: str = Field(..., description="Yes / No / No internet service")
    online_backup: str = Field(..., description="Yes / No / No internet service")
    device_protection: str = Field(..., description="Yes / No / No internet service")
    tech_support: str = Field(..., description="Yes / No / No internet service")
    streaming_tv: str = Field(..., description="Yes / No / No internet service")
    streaming_movies: str = Field(..., description="Yes / No / No internet service")

    # Account
    tenure: int = Field(..., ge=0, description="Months as customer")
    contract: str = Field(..., description="Month-to-month / One year / Two year")
    paperless_billing: str = Field(..., description="Yes / No")
    payment_method: str = Field(
        ...,
        description="Electronic check / Mailed check / Bank transfer (automatic) / Credit card (automatic)",
    )
    monthly_charges: float = Field(..., gt=0, description="Monthly charge (USD)")
    total_charges: float = Field(..., ge=0, description="Total charges (USD)")


# ── On-Demand Response ─────────────────────────────────────────────────────────
class PredictionResponse(BaseModel):
    id: int
    customer_id: Optional[str]
    churn_probability: float
    risk_tier: str   # HIGH | MEDIUM | LOW
    created_at: datetime

    class Config:
        from_attributes = True


# ── Batch schemas ──────────────────────────────────────────────────────────────
class BatchPredictionResultItem(BaseModel):
    """Per-row result from a batch prediction job."""
    row_index: int
    customer_id: Optional[str]
    churn_probability: float
    risk_tier: str
    
    # Extra fields for display
    gender: Optional[str] = None
    senior_citizen: Optional[int] = None
    tenure: Optional[int] = None
    contract: Optional[str] = None
    internet_service: Optional[str] = None
    monthly_charges: Optional[float] = None
    total_charges: Optional[float] = None
    payment_method: Optional[str] = None
    partner: Optional[str] = None
    dependents: Optional[str] = None
    phone_service: Optional[str] = None
    multiple_lines: Optional[str] = None
    online_security: Optional[str] = None
    online_backup: Optional[str] = None
    device_protection: Optional[str] = None
    tech_support: Optional[str] = None
    streaming_tv: Optional[str] = None
    streaming_movies: Optional[str] = None
    paperless_billing: Optional[str] = None


class BatchPredictionResponse(BaseModel):
    job_id: int
    filename: str
    processed_count: int
    high_count: int
    medium_count: int
    low_count: int
    status: str
    results: List[BatchPredictionResultItem]
    created_at: datetime

    class Config:
        from_attributes = True


class BatchJobSummary(BaseModel):
    """Lightweight summary for history list (no per-row results)."""
    job_id: int
    filename: str
    processed_count: int
    high_count: int
    medium_count: int
    low_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Column Validation Error ────────────────────────────────────────────────────
class ColumnValidationError(BaseModel):
    missing_columns: List[str]
    message: str
