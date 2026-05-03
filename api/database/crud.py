from sqlalchemy.orm import Session
from typing import Optional, List
from . import model


# ── On-Demand Predictions ──────────────────────────────────────────────────────

def get_predictions(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(model.CustomerPrediction)
        .order_by(model.CustomerPrediction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_prediction(
    db: Session,
    customer_id: Optional[str],
    # Demographic
    gender: str, senior_citizen: int, partner: str, dependents: str,
    # Services
    phone_service: str, multiple_lines: str, internet_service: str,
    online_security: str, online_backup: str, device_protection: str,
    tech_support: str, streaming_tv: str, streaming_movies: str,
    # Account
    tenure: int, contract: str, paperless_billing: str, payment_method: str,
    monthly_charges: float, total_charges: float,
    # Prediction output
    churn_probability: float, risk_tier: str,
):
    db_prediction = model.CustomerPrediction(
        customer_id=customer_id,
        gender=gender, senior_citizen=senior_citizen,
        partner=partner, dependents=dependents,
        phone_service=phone_service, multiple_lines=multiple_lines,
        internet_service=internet_service, online_security=online_security,
        online_backup=online_backup, device_protection=device_protection,
        tech_support=tech_support, streaming_tv=streaming_tv,
        streaming_movies=streaming_movies,
        tenure=tenure, contract=contract, paperless_billing=paperless_billing,
        payment_method=payment_method, monthly_charges=monthly_charges,
        total_charges=total_charges,
        churn_probability=churn_probability, risk_tier=risk_tier,
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction


# ── Batch Jobs ─────────────────────────────────────────────────────────────────

def create_batch_job(db: Session, filename: str) -> model.BatchJob:
    job = model.BatchJob(filename=filename, status="processing")
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def update_batch_job(
    db: Session,
    job_id: int,
    processed_count: int,
    high_count: int,
    medium_count: int,
    low_count: int,
    status: str,
    results_json: Optional[list] = None,
    error_message: Optional[str] = None,
) -> Optional[model.BatchJob]:
    job = db.query(model.BatchJob).filter(model.BatchJob.id == job_id).first()
    if not job:
        return None
    job.processed_count = processed_count
    job.high_count = high_count
    job.medium_count = medium_count
    job.low_count = low_count
    job.status = status
    if results_json is not None:
        job.results_json = results_json
    if error_message is not None:
        job.error_message = error_message
    db.commit()
    db.refresh(job)
    return job


def get_batch_jobs(db: Session, skip: int = 0, limit: int = 50) -> List[model.BatchJob]:
    return (
        db.query(model.BatchJob)
        .order_by(model.BatchJob.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_batch_job(db: Session, job_id: int) -> Optional[model.BatchJob]:
    return db.query(model.BatchJob).filter(model.BatchJob.id == job_id).first()
