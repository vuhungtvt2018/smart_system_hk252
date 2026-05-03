import io
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import csv

from api.schemas.prediction_schema import (
    PredictionRequest, PredictionResponse,
    BatchPredictionResponse, BatchJobSummary,
    BatchPredictionResultItem,
)
from api.services import prediction_service
from api.database.session import get_db

router = APIRouter()


def verify_role_is_ml_or_admin(X_User_Role: str = Header(default="ML Engineer")):
    if X_User_Role not in ["Admin", "ML Engineer"]:
        raise HTTPException(status_code=403, detail="Permission Denied. Must be Admin or ML Engineer")
    return X_User_Role


# ── On-Demand Prediction ───────────────────────────────────────────────────────

@router.post("/predict", response_model=PredictionResponse)
def predict_churn(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    role: str = Depends(verify_role_is_ml_or_admin),
):
    """
    On-demand churn prediction for a single customer.
    Loads the `champion` model from MLflow and runs the full feature engineering
    pipeline using the pre-computed inference bundle — no training data required.
    """
    try:
        result = prediction_service.create_prediction(db, request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/history", response_model=List[PredictionResponse])
def get_prediction_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get recent on-demand prediction history. Accessible by all roles."""
    return prediction_service.get_recent_predictions(db, skip=skip, limit=limit)


# ── Batch Prediction ───────────────────────────────────────────────────────────

@router.post("/batch", response_model=BatchPredictionResponse)
async def batch_predict(
    file: UploadFile = File(..., description="CSV file containing customer records"),
    db: Session = Depends(get_db),
    role: str = Depends(verify_role_is_ml_or_admin),
):
    """
    Batch churn prediction from a CSV file.
    - Validates that all 19 required feature columns are present.
    - An optional `customerID` / `name` column is used for display.
    - Results are persisted to the database and returned in the response.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    try:
        job = prediction_service.create_batch_prediction(db, content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")

    # Build response
    results = [
        BatchPredictionResultItem(**r) for r in (job.results_json or [])
    ]
    return BatchPredictionResponse(
        job_id=job.id,
        filename=job.filename,
        processed_count=job.processed_count,
        high_count=job.high_count,
        medium_count=job.medium_count,
        low_count=job.low_count,
        status=job.status,
        results=results,
        created_at=job.created_at,
    )


@router.get("/batch/history", response_model=List[BatchJobSummary])
def get_batch_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get batch job history (lightweight summary, no per-row results)."""
    jobs = prediction_service.get_batch_jobs(db, skip=skip, limit=limit)
    return [
        BatchJobSummary(
            job_id=j.id,
            filename=j.filename,
            processed_count=j.processed_count,
            high_count=j.high_count,
            medium_count=j.medium_count,
            low_count=j.low_count,
            status=j.status,
            created_at=j.created_at,
        )
        for j in jobs
    ]


@router.get("/batch/{job_id}/results", response_model=BatchPredictionResponse)
def get_batch_job_results(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Get full results for a specific batch job including per-row predictions."""
    job = prediction_service.get_batch_job_detail(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Batch job {job_id} not found")
    results = [BatchPredictionResultItem(**r) for r in (job.results_json or [])]
    return BatchPredictionResponse(
        job_id=job.id,
        filename=job.filename,
        processed_count=job.processed_count,
        high_count=job.high_count,
        medium_count=job.medium_count,
        low_count=job.low_count,
        status=job.status,
        results=results,
        created_at=job.created_at,
    )


@router.get("/batch/{job_id}/download")
def download_batch_results(
    job_id: int,
    db: Session = Depends(get_db),
):
    """Download batch job results as a CSV file."""
    job = prediction_service.get_batch_job_detail(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Batch job {job_id} not found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["row_index", "customer_id", "churn_probability", "risk_tier"])
    for row in (job.results_json or []):
        writer.writerow([
            row.get("row_index", ""),
            row.get("customer_id", ""),
            row.get("churn_probability", ""),
            row.get("risk_tier", ""),
        ])
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{job_id}_results.csv"},
    )


@router.get("/template/download")
def download_csv_template():
    """Download a CSV template with the correct column headers for batch prediction."""
    headers = [
        "customerID", "gender", "SeniorCitizen", "Partner", "Dependents",
        "PhoneService", "MultipleLines", "InternetService",
        "OnlineSecurity", "OnlineBackup", "DeviceProtection",
        "TechSupport", "StreamingTV", "StreamingMovies",
        "tenure", "Contract", "PaperlessBilling", "PaymentMethod",
        "MonthlyCharges", "TotalCharges",
    ]
    sample = [
        "CUST-001", "Female", "0", "Yes", "No",
        "Yes", "No", "Fiber optic",
        "No", "Yes", "Yes",
        "No", "Yes", "Yes",
        "12", "Month-to-month", "Yes", "Electronic check",
        "79.85", "958.20",
    ]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerow(sample)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=batch_prediction_template.csv"},
    )
