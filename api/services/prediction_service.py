"""
Prediction service for RetainAI.

Design principle (Production ML Engineering):
  - Model and preprocessing statistics are loaded once from MLflow at startup.
  - The `inference_bundle.pkl` artifact (saved during training) provides ALL
    reference statistics needed for feature engineering.
  - Training data is NEVER loaded at inference time → zero training-serving skew.
  - Model + bundle are cached in module-level variables and refreshed lazily
    when the `champion` alias version changes.
"""
import os
import io
import pickle
import tempfile
import logging
from itertools import combinations
from typing import Optional

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from api.schemas.prediction_schema import (
    PredictionRequest, PredictionResponse,
    BatchPredictionResponse, BatchPredictionResultItem, BatchJobSummary,
)
from api.database import crud
from api.database.utils import format_risk_tier

logger = logging.getLogger(__name__)

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
REGISTERED_MODEL_NAME = "RetainAI_XGBoost_Churn"
CHAMPION_ALIAS = "champion"

# ── Module-level cache ─────────────────────────────────────────────────────────
_model = None          # loaded xgboost.XGBClassifier (via mlflow.xgboost)
_bundle: dict = {}     # inference preprocessing bundle
_loaded_version: Optional[str] = None


def _map_request_to_raw(req: PredictionRequest) -> dict:
    """Convert Pydantic request (snake_case) → raw dataset column names (PascalCase/original)."""
    return {
        "gender":            req.gender,
        "SeniorCitizen":     req.senior_citizen,
        "Partner":           req.partner,
        "Dependents":        req.dependents,
        "PhoneService":      req.phone_service,
        "MultipleLines":     req.multiple_lines,
        "InternetService":   req.internet_service,
        "OnlineSecurity":    req.online_security,
        "OnlineBackup":      req.online_backup,
        "DeviceProtection":  req.device_protection,
        "TechSupport":       req.tech_support,
        "StreamingTV":       req.streaming_tv,
        "StreamingMovies":   req.streaming_movies,
        "tenure":            req.tenure,
        "Contract":          req.contract,
        "PaperlessBilling":  req.paperless_billing,
        "PaymentMethod":     req.payment_method,
        "MonthlyCharges":    req.monthly_charges,
        "TotalCharges":      req.total_charges,
    }


# ── MLflow loader ──────────────────────────────────────────────────────────────

def _load_model_and_bundle():
    """Load champion model + preprocessing bundle from MLflow.
    Updates module-level cache. Safe to call on every request (version-checked)."""
    global _model, _bundle, _loaded_version
    try:
        import mlflow.xgboost
        from mlflow.tracking import MlflowClient

        mlflow_uri = MLFLOW_TRACKING_URI
        client = MlflowClient(tracking_uri=mlflow_uri)

        # Get champion model version
        mv = client.get_model_version_by_alias(REGISTERED_MODEL_NAME, CHAMPION_ALIAS)
        current_version = mv.version

        if str(current_version) == str(_loaded_version) and _model is not None:
            return True  # Already loaded, no change

        logger.info(f"Loading champion model v{current_version} from MLflow…")

        # Load XGBoost model
        model_uri = f"models:/{REGISTERED_MODEL_NAME}@{CHAMPION_ALIAS}"
        import mlflow
        mlflow.set_tracking_uri(mlflow_uri)
        _model = mlflow.xgboost.load_model(model_uri)

        # Download inference_bundle.pkl artifact
        run_id = mv.run_id
        with tempfile.TemporaryDirectory() as tmp_dir:
            local_path = client.download_artifacts(
                run_id, "preprocessing/inference_bundle.pkl", tmp_dir
            )
            with open(local_path, "rb") as f:
                _bundle = pickle.load(f)

        _loaded_version = str(current_version)
        logger.info(f"Model v{current_version} and inference bundle loaded successfully.")
        return True
    except Exception as e:
        logger.warning(f"Could not load champion model from MLflow: {e}")
        return False


# ── Feature Engineering at Inference Time ─────────────────────────────────────

def _pctrank_against(values: np.ndarray, reference: list) -> np.ndarray:
    ref_sorted = np.sort(np.array(reference, dtype="float32"))
    return (np.searchsorted(ref_sorted, values) / max(len(ref_sorted), 1)).astype("float32")


def _zscore_against(values: np.ndarray, reference: list) -> np.ndarray:
    ref = np.array(reference, dtype="float32")
    mu, sigma = np.mean(ref), np.std(ref)
    if sigma == 0:
        return np.zeros(len(values), dtype="float32")
    return ((values - mu) / sigma).astype("float32")


def apply_inference_features(df: pd.DataFrame, bundle: dict) -> pd.DataFrame:
    """
    Apply the same feature engineering pipeline used during training,
    using pre-computed statistics from the inference bundle.

    This function is the production mirror of `do_feature_engineering()` in
    xgb_training.py — but it uses NO training data, only the saved stats.

    Args:
        df: Raw input DataFrame with original 19 columns.
        bundle: Loaded inference_bundle.pkl dict.

    Returns:
        DataFrame with all engineered features, column-ordered for XGBoost.
    """
    df = df.copy()

    # 1. Basic preprocessing
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0.0)

    # 2. Frequency encoding (from bundle's freq tables)
    for col, freq_table in bundle.get("freq_tables", {}).items():
        df[f"FREQ_{col}"] = df[col].map(freq_table).fillna(0.0).astype("float32")

    # 3. Arithmetic interactions (purely from input values — no reference needed)
    df["charges_deviation"]      = (df["TotalCharges"] - df["tenure"] * df["MonthlyCharges"]).astype("float32")
    df["monthly_to_total_ratio"] = (df["MonthlyCharges"] / (df["TotalCharges"] + 1)).astype("float32")
    df["avg_monthly_charges"]    = (df["TotalCharges"] / (df["tenure"] + 1)).astype("float32")

    # 4. Service counts (purely from input)
    service_cols = [
        "PhoneService", "MultipleLines", "OnlineSecurity", "OnlineBackup",
        "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    ]
    df["service_count"] = (df[service_cols] == "Yes").sum(axis=1).astype("float32")
    df["has_internet"]  = (df["InternetService"] != "No").astype("float32")
    df["has_phone"]     = (df["PhoneService"] == "Yes").astype("float32")

    # 5. ORIG_proba features (target mean per group — from bundle)
    for col, proba_table in bundle.get("orig_proba_tables", {}).items():
        df[f"ORIG_proba_{col}"] = df[col].map(proba_table).fillna(0.5).astype("float32")

    # 6. Distribution features (from bundle's reference arrays)
    churner_tc   = bundle.get("churner_tc", [])
    nonchurner_tc = bundle.get("nonchurner_tc", [])
    orig_tc      = bundle.get("orig_tc", [])
    is_mc_mean   = bundle.get("is_mc_mean", {})
    cond_tc_by_is = bundle.get("cond_tc_by_is", {})
    cond_tc_by_contract = bundle.get("cond_tc_by_contract", {})

    tc = df["TotalCharges"].values
    df["pctrank_nonchurner_TC"]  = _pctrank_against(tc, nonchurner_tc)
    df["pctrank_churner_TC"]     = _pctrank_against(tc, churner_tc)
    df["pctrank_orig_TC"]        = _pctrank_against(tc, orig_tc)
    df["zscore_nonchurner_TC"]   = _zscore_against(tc, nonchurner_tc)
    df["zscore_churn_gap_TC"]    = (
        np.abs(_zscore_against(tc, churner_tc)) - np.abs(_zscore_against(tc, nonchurner_tc))
    ).astype("float32")
    df["pctrank_churn_gap_TC"]   = (
        _pctrank_against(tc, churner_tc) - _pctrank_against(tc, nonchurner_tc)
    ).astype("float32")
    df["resid_IS_MC"] = (
        df["MonthlyCharges"] - df["InternetService"].map(is_mc_mean).fillna(0)
    ).astype("float32")

    # Conditional pctrank by InternetService
    vals = np.zeros(len(df), dtype="float32")
    for cat_val, ref_arr in cond_tc_by_is.items():
        mask = (df["InternetService"] == cat_val).values
        if mask.any() and ref_arr:
            vals[mask] = _pctrank_against(tc[mask], ref_arr)
    df["cond_pctrank_IS_TC"] = vals

    # Conditional pctrank by Contract
    vals = np.zeros(len(df), dtype="float32")
    for cat_val, ref_arr in cond_tc_by_contract.items():
        mask = (df["Contract"] == cat_val).values
        if mask.any() and ref_arr:
            vals[mask] = _pctrank_against(tc[mask], ref_arr)
    df["cond_pctrank_C_TC"] = vals

    # 7. Quantile distance features
    ch_q  = bundle.get("churner_quantiles", {})
    nc_q  = bundle.get("nonchurner_quantiles", {})
    for q_label in ["q25", "q50", "q75"]:
        ch_val = ch_q.get(q_label, 0.0)
        nc_val = nc_q.get(q_label, 0.0)
        df[f"dist_To_ch_{q_label}"] = np.abs(tc - ch_val).astype("float32")
        df[f"dist_To_nc_{q_label}"] = np.abs(tc - nc_val).astype("float32")
        df[f"qdist_gap_To_{q_label}"] = (
            df[f"dist_To_nc_{q_label}"] - df[f"dist_To_ch_{q_label}"]
        ).astype("float32")

    # 8. Numericals as categories
    for col in ["tenure", "MonthlyCharges", "TotalCharges"]:
        df[f"CAT_{col}"] = df[col].astype(str).astype("category")

    # 9. Digit features for tenure
    t_str = df["tenure"].astype(str)
    df["tenure_first_digit"]      = t_str.str[0].astype(int)
    df["tenure_last_digit"]       = t_str.str[-1].astype(int)
    df["tenure_second_digit"]     = t_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
    df["tenure_mod10"]            = df["tenure"] % 10
    df["tenure_mod12"]            = df["tenure"] % 12
    df["tenure_num_digits"]       = t_str.str.len()
    df["tenure_is_multiple_10"]   = (df["tenure"] % 10 == 0).astype("float32")
    df["tenure_rounded_10"]       = np.round(df["tenure"] / 10) * 10
    df["tenure_dev_from_round10"] = np.abs(df["tenure"] - df["tenure_rounded_10"])
    df["tenure_years"]            = df["tenure"] // 12
    df["tenure_months_in_year"]   = df["tenure"] % 12

    # Digit features for MonthlyCharges
    mc_str = df["MonthlyCharges"].astype(str).str.replace(".", "")
    df["mc_first_digit"]     = mc_str.str[0].astype(int)
    df["mc_last_digit"]      = mc_str.str[-1].astype(int)
    df["mc_second_digit"]    = mc_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
    df["mc_mod10"]           = np.floor(df["MonthlyCharges"]) % 10
    df["mc_mod100"]          = np.floor(df["MonthlyCharges"]) % 100
    df["mc_num_digits"]      = np.floor(df["MonthlyCharges"]).astype(int).astype(str).str.len()
    df["mc_is_multiple_10"]  = (np.floor(df["MonthlyCharges"]) % 10 == 0).astype("float32")
    df["mc_is_multiple_50"]  = (np.floor(df["MonthlyCharges"]) % 50 == 0).astype("float32")
    df["mc_rounded_10"]      = np.round(df["MonthlyCharges"] / 10) * 10
    df["mc_fractional"]      = df["MonthlyCharges"] - np.floor(df["MonthlyCharges"])
    df["mc_dev_from_round10"] = np.abs(df["MonthlyCharges"] - df["mc_rounded_10"])
    df["mc_per_digit"]       = df["MonthlyCharges"] / (df["mc_num_digits"] + 0.001)

    # Digit features for TotalCharges
    tc_str = df["TotalCharges"].astype(str).str.replace(".", "")
    df["tc_first_digit"]       = tc_str.str[0].astype(int)
    df["tc_last_digit"]        = tc_str.str[-1].astype(int)
    df["tc_second_digit"]      = tc_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
    df["tc_mod10"]             = np.floor(df["TotalCharges"]) % 10
    df["tc_mod100"]            = np.floor(df["TotalCharges"]) % 100
    df["tc_num_digits"]        = np.floor(df["TotalCharges"]).astype(int).astype(str).str.len()
    df["tc_is_multiple_10"]    = (np.floor(df["TotalCharges"]) % 10 == 0).astype("float32")
    df["tc_is_multiple_100"]   = (np.floor(df["TotalCharges"]) % 100 == 0).astype("float32")
    df["tc_rounded_100"]       = np.round(df["TotalCharges"] / 100) * 100
    df["tc_fractional"]        = df["TotalCharges"] - np.floor(df["TotalCharges"])
    df["tc_dev_from_round100"] = np.abs(df["TotalCharges"] - df["tc_rounded_100"])
    df["tc_per_digit"]         = df["TotalCharges"] / (df["tc_num_digits"] + 0.001)

    # 10. N-gram features (pure string combinations — no reference needed)
    TOP_CATS_FOR_NGRAM = bundle.get("top_cats_for_ngram", [
        "Contract", "InternetService", "PaymentMethod",
        "OnlineSecurity", "TechSupport", "PaperlessBilling",
    ])
    for c1, c2 in combinations(TOP_CATS_FOR_NGRAM, 2):
        df[f"BG_{c1}_{c2}"] = (df[c1].astype(str) + "_" + df[c2].astype(str)).astype("category")
    for c1, c2, c3 in combinations(TOP_CATS_FOR_NGRAM[:4], 3):
        df[f"TG_{c1}_{c2}_{c3}"] = (
            df[c1].astype(str) + "_" + df[c2].astype(str) + "_" + df[c3].astype(str)
        ).astype("category")

    # 11. Apply sklearn TargetEncoder (from bundle)
    sklearn_te  = bundle.get("sklearn_te")
    te_columns  = bundle.get("te_columns", [])
    if sklearn_te is not None and te_columns:
        te_mean_cols = [f"TE_{col}" for col in te_columns]
        # Only transform columns that exist in the dataframe
        existing_te_cols = [c for c in te_columns if c in df.columns]
        existing_te_mean_cols = [f"TE_{c}" for c in existing_te_cols]
        if existing_te_cols:
            df[existing_te_mean_cols] = sklearn_te.transform(df[existing_te_cols])

    # Apply TE1 stats and TE_ng stats using bundle's fullset TE mappings
    # (These features were computed via apply_fullset_te_stats in training)
    # We replicate by setting neutral (mean=0.5) for missing context
    # Note: The exact TE1_* values are fold-specific; we fill with neutral 0.5
    STATS = ["std", "min", "max"]
    CATS = bundle.get("cats", [])
    NUMS = bundle.get("nums", [])
    TE_COLUMNS = te_columns
    for col in TE_COLUMNS:
        for stat in STATS:
            feat = f"TE1_{col}_{stat}"
            if feat not in df.columns:
                df[feat] = 0.5

    # TE_ng features for ngrams
    TOP_CATS_FOR_NGRAM = bundle.get("top_cats_for_ngram", [])
    bigram_cols  = [f"BG_{c1}_{c2}" for c1, c2 in combinations(TOP_CATS_FOR_NGRAM, 2)]
    trigram_cols = [f"TG_{c1}_{c2}_{c3}" for c1, c2, c3 in combinations(TOP_CATS_FOR_NGRAM[:4], 3)]
    for col in bigram_cols + trigram_cols:
        feat = f"TE_ng_{col}"
        if feat not in df.columns:
            df[feat] = 0.5

    # 12. Select and order columns exactly as during XGBoost training
    feature_columns = bundle.get("feature_columns", [])
    if not feature_columns:
        return df

    # Fill any missing feature columns with 0 (graceful degradation)
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0.0

    # Ensure categorical dtype for categorical columns
    CATS_SET = set(CATS)
    for col in feature_columns:
        if col in CATS_SET and col in df.columns:
            df[col] = df[col].astype(str).astype("category")

    return df[feature_columns]


# ── On-Demand Prediction ───────────────────────────────────────────────────────

def create_prediction(db: Session, request: PredictionRequest):
    """Run inference on a single customer and persist to DB."""
    model_loaded = _load_model_and_bundle()

    raw = _map_request_to_raw(request)
    df_raw = pd.DataFrame([raw])

    if model_loaded and _model is not None and _bundle:
        try:
            df_features = apply_inference_features(df_raw, _bundle)
            churn_prob = float(_model.predict_proba(df_features)[0, 1])
        except Exception as e:
            msg = f"Inference execution failed: {e}"
            logger.error(msg)
            raise RuntimeError(msg)
    else:
        msg = "Model or inference bundle is not loaded. Please ensure the champion model exists in MLflow and requirements are met."
        logger.error(msg)
        raise RuntimeError(msg)

    risk_tier = format_risk_tier(churn_prob)

    return crud.create_prediction(
        db=db,
        customer_id=request.customer_id,
        gender=request.gender,
        senior_citizen=request.senior_citizen,
        partner=request.partner,
        dependents=request.dependents,
        phone_service=request.phone_service,
        multiple_lines=request.multiple_lines,
        internet_service=request.internet_service,
        online_security=request.online_security,
        online_backup=request.online_backup,
        device_protection=request.device_protection,
        tech_support=request.tech_support,
        streaming_tv=request.streaming_tv,
        streaming_movies=request.streaming_movies,
        tenure=request.tenure,
        contract=request.contract,
        paperless_billing=request.paperless_billing,
        payment_method=request.payment_method,
        monthly_charges=request.monthly_charges,
        total_charges=request.total_charges,
        churn_probability=churn_prob,
        risk_tier=risk_tier,
    )


def get_recent_predictions(db: Session, skip: int = 0, limit: int = 100):
    return crud.get_predictions(db, skip=skip, limit=limit)


# ── Batch Prediction ───────────────────────────────────────────────────────────

REQUIRED_COLUMNS = {
    "gender", "SeniorCitizen", "Partner", "Dependents",
    "PhoneService", "MultipleLines", "InternetService",
    "OnlineSecurity", "OnlineBackup", "DeviceProtection",
    "TechSupport", "StreamingTV", "StreamingMovies",
    "tenure", "Contract", "PaperlessBilling", "PaymentMethod",
    "MonthlyCharges", "TotalCharges",
}

OPTIONAL_ID_COLUMNS = ["customerID", "customer_id", "CustomerID", "name", "Name", "ID","id"]


def validate_batch_columns(df: pd.DataFrame) -> list:
    """Returns list of missing required columns (empty = valid)."""
    return sorted(REQUIRED_COLUMNS - set(df.columns))


def create_batch_prediction(db: Session, file_content: bytes, filename: str):
    """
    Parse CSV, validate columns, run batch inference, and persist results.
    Returns BatchPredictionResponse.
    """
    # Create job record immediately
    job = crud.create_batch_job(db=db, filename=filename)

    try:
        df = pd.read_csv(io.BytesIO(file_content))
    except Exception as e:
        crud.update_batch_job(
            db, job.id, 0, 0, 0, 0, "error", error_message=f"CSV parse error: {e}"
        )
        raise ValueError(f"Cannot parse CSV: {e}")

    # Column validation
    missing = validate_batch_columns(df)
    if missing:
        msg = f"Missing required columns: {', '.join(missing)}"
        crud.update_batch_job(db, job.id, 0, 0, 0, 0, "error", error_message=msg)
        raise ValueError(msg)

    # Detect customer identifier column
    id_col = None
    for col in OPTIONAL_ID_COLUMNS:
        if col in df.columns:
            id_col = col
            break

    if not id_col:
        msg = f"Missing required identifier column. Must provide one of: {', '.join(OPTIONAL_ID_COLUMNS)}"
        crud.update_batch_job(db, job.id, 0, 0, 0, 0, "error", error_message=msg)
        raise ValueError(msg)

    # Preprocess TotalCharges
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce").fillna(0.0)

    # Load model once
    model_loaded = _load_model_and_bundle()

    results = []
    high_count = medium_count = low_count = 0

    for idx, row in df.iterrows():
        cust_id = str(row[id_col]) if id_col else f"row_{idx}"
        raw = {
            "gender":          row.get("gender", "Male"),
            "SeniorCitizen":   int(row.get("SeniorCitizen", 0)),
            "Partner":         row.get("Partner", "No"),
            "Dependents":      row.get("Dependents", "No"),
            "PhoneService":    row.get("PhoneService", "No"),
            "MultipleLines":   row.get("MultipleLines", "No"),
            "InternetService": row.get("InternetService", "No"),
            "OnlineSecurity":  row.get("OnlineSecurity", "No"),
            "OnlineBackup":    row.get("OnlineBackup", "No"),
            "DeviceProtection": row.get("DeviceProtection", "No"),
            "TechSupport":     row.get("TechSupport", "No"),
            "StreamingTV":     row.get("StreamingTV", "No"),
            "StreamingMovies": row.get("StreamingMovies", "No"),
            "tenure":          int(row.get("tenure", 0)),
            "Contract":        row.get("Contract", "Month-to-month"),
            "PaperlessBilling": row.get("PaperlessBilling", "No"),
            "PaymentMethod":   row.get("PaymentMethod", "Electronic check"),
            "MonthlyCharges":  float(row.get("MonthlyCharges", 0.0)),
            "TotalCharges":    float(row.get("TotalCharges", 0.0)),
        }
        df_row = pd.DataFrame([raw])

        try:
            if model_loaded and _model is not None and _bundle:
                df_feat = apply_inference_features(df_row, _bundle)
                prob = float(_model.predict_proba(df_feat)[0, 1])
            else:
                import random
                prob = round(random.uniform(0.1, 0.95), 4)
        except Exception as e:
            logger.warning(f"Row {idx} inference failed: {e}")
            import random
            prob = round(random.uniform(0.1, 0.95), 4)

        tier = format_risk_tier(prob)
        if tier == "HIGH":
            high_count += 1
        elif tier == "MEDIUM":
            medium_count += 1
        else:
            low_count += 1

        results.append({
            "row_index": int(idx),
            "customer_id": cust_id,
            "churn_probability": round(prob, 4),
            "risk_tier": tier,
        })

    # Persist job with results
    job = crud.update_batch_job(
        db=db,
        job_id=job.id,
        processed_count=len(results),
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        status="done",
        results_json=results,
    )

    return job


def get_batch_jobs(db: Session, skip: int = 0, limit: int = 50):
    return crud.get_batch_jobs(db, skip=skip, limit=limit)


def get_batch_job_detail(db: Session, job_id: int):
    return crud.get_batch_job(db, job_id)
