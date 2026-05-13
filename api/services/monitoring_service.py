import os
import math
import logging
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session

from api.database import crud
from api.services.dashboard_service import _build_model_performance_trend

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploaded")
TEST_DATASET_PATH = os.path.join(DATA_DIR, "test_dataset.csv")

def _calculate_psi_for_feature(expected_dist: dict, actual_dist: dict) -> float:
    psi = 0.0
    all_keys = set(expected_dist.keys()).union(set(actual_dist.keys()))
    for key in all_keys:
        # small epsilon to avoid division by zero or log(0)
        expected_pct = max(expected_dist.get(key, 0.0), 0.0001)
        actual_pct = max(actual_dist.get(key, 0.0), 0.0001)
        psi += (actual_pct - expected_pct) * math.log(actual_pct / expected_pct)
    return psi

def _get_categorical_distribution(series: pd.Series) -> dict:
    counts = series.value_counts(normalize=True).to_dict()
    return counts

def _get_numerical_distribution(series: pd.Series, bins) -> dict:
    binned = pd.cut(series, bins=bins, include_lowest=True)
    counts = binned.value_counts(normalize=True).to_dict()
    return {str(k): v for k, v in counts.items()}

def get_monitoring_metrics(db: Session) -> dict:
    """Returns PSI metrics calculated from test_dataset vs recent batch inference jobs, and model performance trend."""
    model_performance = _build_model_performance_trend()

    # If no test_dataset, we cannot compute drift properly
    if not os.path.exists(TEST_DATASET_PATH):
        logger.warning(f"Baseline test dataset not found at {TEST_DATASET_PATH}. Cannot compute PSI.")
        return {
            "psiData": [],
            "psiTrendData": [],
            "modelPerformanceData": model_performance
        }

    try:
        baseline_df = pd.read_csv(TEST_DATASET_PATH)
    except Exception as e:
        logger.error(f"Failed to read test_dataset.csv: {e}")
        return {
            "psiData": [],
            "psiTrendData": [],
            "modelPerformanceData": model_performance
        }

    # Ensure numerics
    baseline_df["tenure"] = pd.to_numeric(baseline_df.get("tenure", pd.Series(dtype=int)), errors="coerce").fillna(0)
    baseline_df["MonthlyCharges"] = pd.to_numeric(baseline_df.get("MonthlyCharges", pd.Series(dtype=float)), errors="coerce").fillna(0.0)

    # Get recent batch jobs that have completed and have results
    batch_jobs = crud.get_batch_jobs(db, skip=0, limit=20)
    done_jobs = [j for j in batch_jobs if j.status == "done" and j.results_json]
    
    if not done_jobs:
        return {
            "psiData": [],
            "psiTrendData": [],
            "modelPerformanceData": model_performance
        }

    # Sort done jobs by created_at ascending to build trend (oldest to newest)
    done_jobs.sort(key=lambda j: j.created_at)
    
    tenure_bins = [0, 12, 24, 48, 60, 1000]
    mc_bins = [0, 30, 60, 90, 120, 1000]

    baseline_dists = {
        "Contract": _get_categorical_distribution(baseline_df.get("Contract", pd.Series(dtype=str))),
        "InternetService": _get_categorical_distribution(baseline_df.get("InternetService", pd.Series(dtype=str))),
        "PaymentMethod": _get_categorical_distribution(baseline_df.get("PaymentMethod", pd.Series(dtype=str))),
        "tenure": _get_numerical_distribution(baseline_df["tenure"], tenure_bins),
        "MonthlyCharges": _get_numerical_distribution(baseline_df["MonthlyCharges"], mc_bins),
    }

    psi_trend_data = []
    latest_job_psi_data = []
    
    # Process all jobs for trend
    for job in done_jobs:
        results = job.results_json
        if not results:
            continue
        
        actual_df = pd.DataFrame(results)
        
        # Mapping from JSON keys to Baseline feature names
        actual_mapping = {
            "Contract": "contract",
            "InternetService": "internet_service",
            "PaymentMethod": "payment_method",
            "tenure": "tenure",
            "MonthlyCharges": "monthly_charges"
        }
        
        actual_dists = {}
        for feature, json_key in actual_mapping.items():
            if feature in ["tenure", "MonthlyCharges"]:
                series = pd.to_numeric(actual_df.get(json_key, pd.Series(dtype=float)), errors="coerce").fillna(0)
                actual_dists[feature] = _get_numerical_distribution(series, tenure_bins if feature == "tenure" else mc_bins)
            else:
                actual_dists[feature] = _get_categorical_distribution(actual_df.get(json_key, pd.Series(dtype=str)))
        
        overall_psi = 0.0
        job_psi_data = []
        for feature in baseline_dists.keys():
            psi_val = _calculate_psi_for_feature(baseline_dists[feature], actual_dists[feature])
            job_psi_data.append({"feature": feature, "psi": psi_val})
            overall_psi = max(overall_psi, psi_val) # overall PSI = max feature PSI
        
        # Truncate time for shorter chart labels
        date_str = job.created_at.strftime("%m-%d %H:%M") if job.created_at else "Unknown"
        psi_trend_data.append({
            "date": date_str,
            "psi": round(overall_psi, 3),
        })
        
        latest_job_psi_data = job_psi_data
        
    # The last processed job in `done_jobs` provides the snapshot for `psiData`
    psi_data = []
    for item in latest_job_psi_data:
        psi_val = item["psi"]
        if psi_val < 0.1:
            status = "OK"
        elif psi_val < 0.2:
            status = "WARNING"
        else:
            status = "CRITICAL"
            
        psi_data.append({
            "feature": item["feature"],
            "psi": round(psi_val, 3),
            "status": status
        })

    # Sort features by highest drift
    psi_data.sort(key=lambda x: x["psi"], reverse=True)

    return {
        "psiData": psi_data,
        "psiTrendData": psi_trend_data,
        "modelPerformanceData": model_performance
    }
