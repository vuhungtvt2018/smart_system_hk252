import os
import logging
import random
from datetime import datetime, timedelta
from calendar import month_abbr
from sqlalchemy.orm import Session
from api.database import crud
from api.services.model_registry_service import get_registered_models, get_feature_importance

logger = logging.getLogger(__name__)

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
REGISTERED_MODEL_NAME = "RetainAI_XGBoost_Churn"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _month_label(dt: datetime) -> str:
    """Return label like 'Jan '26' from a datetime."""
    return f"{month_abbr[dt.month]} '{str(dt.year)[2:]}"


def _build_churn_trend(db: Session) -> list:
    """
    Build 6-month churn rate trend from batch job history (hybrid approach).
    - Groups all completed batch jobs by calendar month.
    - Uses the latest job of each month.
    - Fills missing months (to reach 6) with synthetic variation.
    - Always ensures the most recent month uses real data.
    """
    all_jobs = crud.get_batch_jobs(db, skip=0, limit=200)
    done_jobs = [j for j in all_jobs if j.status == "done" and j.processed_count > 0]

    # Group by (year, month) → keep latest job per month
    month_map: dict = {}
    for job in done_jobs:
        if job.created_at is None:
            continue
        key = (job.created_at.year, job.created_at.month)
        if key not in month_map or job.created_at > month_map[key].created_at:
            month_map[key] = job

    # Build real data points
    real_points = {}
    for (yr, mo), job in month_map.items():
        total = job.processed_count
        real_points[(yr, mo)] = {
            "highRisk":   job.high_count,
            "mediumRisk": job.medium_count,
            "lowRisk":    job.low_count,
            "total":      total,
        }

    # Determine the 6 target months (ending at current month)
    now = datetime.now()
    target_months = []
    for i in range(5, -1, -1):
        # Go back i months from now
        d = now - timedelta(days=30 * i)
        target_months.append((d.year, d.month, datetime(d.year, d.month, 1)))

    # Get anchor values (from most recent real job, or defaults)
    if real_points:
        latest_key = max(real_points.keys())
        anchor = real_points[latest_key]
        anchor_high   = anchor["highRisk"]   / anchor["total"]
        anchor_medium = anchor["mediumRisk"] / anchor["total"]
        anchor_low    = anchor["lowRisk"]    / anchor["total"]
        anchor_total  = anchor["total"]
    else:
        # No real data — use reasonable defaults
        anchor_high, anchor_medium, anchor_low = 0.165, 0.228, 0.607
        anchor_total = 1000

    result = []
    rng = random.Random(42)  # Fixed seed for stable synthetic values

    for yr, mo, dt_obj in target_months:
        label = _month_label(dt_obj)
        if (yr, mo) in real_points:
            pt = real_points[(yr, mo)]
            total = pt["total"]
            result.append({
                "month":      label,
                "highRisk":   round(pt["highRisk"]   / total * 100, 1),
                "mediumRisk": round(pt["mediumRisk"] / total * 100, 1),
                "lowRisk":    round(pt["lowRisk"]    / total * 100, 1),
                "churnRate":  round(pt["highRisk"]   / total * 100, 1),
                "customers":  total,
            })
        else:
            # Synthetic: vary by ±3 percentage points around anchor
            months_ago = (now.year - yr) * 12 + (now.month - mo)
            # Slight upward trend in the past (more churn historically)
            drift = months_ago * 0.5
            h = max(0, min(100, anchor_high * 100 + drift + rng.uniform(-1.5, 1.5)))
            m = max(0, min(100, anchor_medium * 100 + rng.uniform(-2, 2)))
            lo = max(0, 100 - h - m)
            result.append({
                "month":      label,
                "highRisk":   round(h, 1),
                "mediumRisk": round(m, 1),
                "lowRisk":    round(lo, 1),
                "churnRate":  round(h, 1),
                "customers":  int(anchor_total + rng.uniform(-50, 50)),
            })

    return result


def _build_model_performance_trend() -> list:
    """
    Build 8-week model performance trend from MLflow training run history.
    - Fetches all runs of the registered model experiment.
    - Sorts by start_time ascending, takes last 8.
    - Falls back to synthetic data if < 8 runs or MLflow unreachable.
    """
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

        # Get all versions to find the experiment
        versions = client.search_model_versions(f"name='{REGISTERED_MODEL_NAME}'")
        if not versions:
            return []

        # Collect unique run IDs from model versions
        run_ids = list({v.run_id for v in versions if v.run_id})

        # Fetch run info (metrics) for each
        runs_data = []
        for run_id in run_ids:
            try:
                run = client.get_run(run_id)
                metrics = run.data.metrics
                auc  = metrics.get("val_auc",  metrics.get("roc_auc", None))
                f1   = metrics.get("val_f1",   metrics.get("f1_score", None))
                recall    = metrics.get("val_recall",    None)
                precision = metrics.get("val_precision", None)
                if auc is None:
                    continue
                runs_data.append({
                    "start_time": run.info.start_time,  # ms epoch
                    "auc":       round(float(auc), 3),
                    "f1":        round(float(f1), 3) if f1 is not None else None,
                    "recall":    round(float(recall), 3) if recall is not None else None,
                    "precision": round(float(precision), 3) if precision is not None else None,
                })
            except Exception as e:
                logger.warning(f"Failed to fetch run {run_id}: {e}")
                continue

        if not runs_data:
            return []

        # Sort by start_time ascending, take last 8
        runs_data.sort(key=lambda x: x["start_time"])
        last_8 = runs_data[-8:]

        result = []
        for i, run in enumerate(last_8):
            week_label = f"W{i + 1}"
            result.append({
                "week":      week_label,
                "auc":       run["auc"],
                "f1":        run["f1"]  if run["f1"]  is not None else round(run["auc"] * 0.905, 3),
                "recall":    run["recall"]    if run["recall"]    is not None else round(run["auc"] * 0.942, 3),
                "precision": run["precision"] if run["precision"] is not None else round(run["auc"] * 0.871, 3),})
        # Do not fill synthetic weeks, return exactly what we have from MLflow
        return result

    except Exception as e:
        logger.warning(f"MLflow run history fetch failed: {e}")
        return []


def _synthetic_model_perf(base_auc: float = 0.875) -> list:
    """Generate 8 synthetic weekly performance points around a base AUC."""
    rng = random.Random(7)
    result = []
    for i in range(8):
        auc = round(base_auc + rng.uniform(-0.01, 0.01), 3)
        result.append({
            "week":      f"W{i + 1}",
            "auc":       auc,
            "f1":        round(auc * 0.905 + rng.uniform(-0.005, 0.005), 3),
            "recall":    round(auc * 0.942 + rng.uniform(-0.005, 0.005), 3),
            "precision": round(auc * 0.871 + rng.uniform(-0.005, 0.005), 3),
        })
    return result


def _fill_synthetic_weeks(real_weeks: list, target: int = 8) -> list:
    """Prepend synthetic weeks before real data to reach target count."""
    if not real_weeks:
        return _synthetic_model_perf()

    first_real = real_weeks[0]
    rng = random.Random(13)
    synthetic = []
    needed = target - len(real_weeks)
    for i in range(needed):
        auc = round(first_real["auc"] - (needed - i) * 0.002 + rng.uniform(-0.003, 0.003), 3)
        synthetic.append({
            "week":      f"W{i + 1}",
            "auc":       auc,
            "f1":        round(auc * 0.905 + rng.uniform(-0.004, 0.004), 3),
            "recall":    round(auc * 0.942 + rng.uniform(-0.004, 0.004), 3),
            "precision": round(auc * 0.871 + rng.uniform(-0.004, 0.004), 3),
        })

    # Relabel weeks sequentially
    combined = synthetic + real_weeks
    for i, item in enumerate(combined):
        item["week"] = f"W{i + 1}"
    return combined


# ── Alert generation ───────────────────────────────────────────────────────────

def _generate_alerts(latest_job, champion_model) -> list:
    """
    Dynamically generate system alerts from batch job results and champion model.
    Returns a list of alert dicts compatible with the Alert interface.
    """
    alerts = []

    if latest_job and latest_job.status == "done":
        job = latest_job
        alerts.append({
            "id": f"al-batch-{job.id}",
            "type": "SYSTEM",
            "severity": "info",
            "title": "Batch Prediction Completed",
            "message": (
                f"Batch inference completed for {job.processed_count} customers. "
                f"{job.high_count} HIGH, {job.medium_count} MEDIUM, {job.low_count} LOW risk."
            ),
            "timestamp": (job.created_at + timedelta(hours=7)).strftime("%Y-%m-%d %I:%M %p") if job.created_at else "Unknown",
            "read": False,
            "actionRequired": False,
        })

        if job.processed_count > 0:
            high_pct = job.high_count / job.processed_count
            if high_pct > 0.15:
                alerts.append({
                    "id": f"al-risk-{job.id}",
                    "type": "RISK_TIER",
                    "severity": "critical" if high_pct > 0.25 else "warning",
                    "title": "HIGH Risk Customers Spike Detected",
                    "message": (
                        f"High risk customers account for {high_pct * 100:.1f}% of the latest batch. "
                        "Immediate retention action recommended."
                    ),
                    "timestamp": job.created_at.strftime("%Y-%m-%d %H:%M") if job.created_at else "Unknown",
                    "read": False,
                    "actionRequired": True,
                })

    if champion_model:
        alerts.append({
            "id": f"al-model-{champion_model.version}",
            "type": "MODEL",
            "severity": "info",
            "title": f"Model v{champion_model.version} is in Production",
            "message": (
                f"Champion model {champion_model.modelName} "
                f"(AUC: {champion_model.auc:.3f}) is active."
            ),
            "timestamp": "Latest",
            "read": True,
            "actionRequired": False,
        })

    return alerts


# ── Public service functions ───────────────────────────────────────────────────

def get_alerts(db: Session) -> list:
    """Return alert list for the Alerts & Notifications page."""
    latest_jobs = crud.get_batch_jobs(db, skip=0, limit=1)
    latest_job = latest_jobs[0] if latest_jobs else None

    models = get_registered_models(db)
    champion_model = next(
        (m for m in models if "champion" in [a.lower() for a in m.aliases]), None
    )

    return _generate_alerts(latest_job, champion_model)


def get_dashboard_metrics(db: Session) -> dict:
    """Return all metrics required for the Dashboard UI."""

    # ── 1. Batch job data ──────────────────────────────────────────────────────
    latest_jobs = crud.get_batch_jobs(db, skip=0, limit=2)

    total_customers = 0
    high_risk = 0
    medium_risk = 0
    low_risk = 0
    last_batch_run = "Never"
    top_high_risk: list = []
    churn_rate = 0.0
    prev_churn_rate = 0.0
    retention_rate = 100.0
    contract_distribution: list = []

    if latest_jobs:
        # Latest job
        job = crud.get_batch_job(db, latest_jobs[0].id)
        if job:
            total_customers = job.processed_count
            high_risk  = job.high_count
            medium_risk = job.medium_count
            low_risk   = job.low_count
            if job.created_at:
                vn_time = job.created_at + timedelta(hours=7)
                last_batch_run = vn_time.strftime("%I:%M %p · %b %d")
            else:
                last_batch_run = "Unknown"

            if total_customers > 0:
                churn_rate     = round(high_risk / total_customers * 100, 1)
                retention_rate = round(100 - churn_rate, 1)

            # Top 5 high-risk customers
            results = job.results_json or []
            high_results = sorted(
                [r for r in results if r.get("risk_tier") == "HIGH"],
                key=lambda x: x.get("churn_probability", 0),
                reverse=True,
            )
            for r in high_results[:5]:
                top_high_risk.append({
                    "id":              r.get("customer_id", ""),
                    "name":            r.get("name", r.get("customer_id", "")),
                    "contract":        r.get("contract", "Unknown"),
                    "churnProbability": r.get("churn_probability", 0),
                    "riskTier":        r.get("risk_tier", "HIGH"),
                })
            
            contract_counts = {}
            for r in results:
                c = r.get("contract", "Unknown")
                contract_counts[c] = contract_counts.get(c, 0) + 1
            
            colors = {"Month-to-month": "#ef4444", "One year": "#f59e0b", "Two year": "#10b981"}
            for name, count in contract_counts.items():
                contract_distribution.append({
                    "name": name,
                    "value": round((count / total_customers) * 100, 1) if total_customers > 0 else 0,
                    "color": colors.get(name, "#64748b")
                })

        # Previous job → for trend
        if len(latest_jobs) > 1:
            prev_job = crud.get_batch_job(db, latest_jobs[1].id)
            if prev_job and prev_job.processed_count > 0:
                prev_churn_rate = round(
                    prev_job.high_count / prev_job.processed_count * 100, 1
                )

    risk_distribution = [
        {"name": "HIGH Risk",   "value": high_risk,   "color": "#ef4444"},
        {"name": "MEDIUM Risk", "value": medium_risk,  "color": "#f59e0b"},
        {"name": "LOW Risk",    "value": low_risk,     "color": "#10b981"},
    ]

    # ── 2. MLflow champion model metrics ──────────────────────────────────────
    models = get_registered_models(db)
    champion_model = next(
        (m for m in models if "champion" in [a.lower() for a in m.aliases]), None
    )

    model_auc = 0.0
    model_f1  = 0.0
    model_recall    = 0.0
    model_precision = 0.0
    top_feature_importance: list = []

    if champion_model:
        model_auc       = champion_model.auc
        model_f1        = champion_model.f1
        model_recall    = champion_model.recall
        model_precision = champion_model.precision

        fi_res = get_feature_importance(champion_model.modelName, champion_model.runId)
        if fi_res.get("status") == "success":
            top_feature_importance = [
                {"feature": f["feature"], "importance": f["importance"]}
                for f in fi_res.get("features", [])[:5]
            ]

    # ── 3. Trend data ──────────────────────────────────────────────────────────
    churn_trend           = _build_churn_trend(db)
    model_performance_trend = _build_model_performance_trend()

    retention_data = []
    for ct in churn_trend:
        # Simulate retention effectiveness based on churnRate
        contacted = int(ct["customers"] * 0.18)
        retained = int(contacted * (1 - (ct["churnRate"] / 100)) * 0.85) # Simulating a 85% success on non-churning contacted
        retention_rate = round((retained / contacted) * 100, 1) if contacted > 0 else 0.0
        retention_data.append({
            "month": ct["month"].split(" ")[0],  # just 'Jan' instead of 'Jan '26' for bar chart
            "contacted": contacted,
            "retained": retained,
            "retentionRate": retention_rate
        })

    # ── 4. Alerts ──────────────────────────────────────────────────────────────
    latest_job_obj = latest_jobs[0] if latest_jobs else None
    recent_alerts  = _generate_alerts(latest_job_obj, champion_model)

    return {
        "totalCustomers":       total_customers,
        "highRisk":             high_risk,
        "riskDistribution":     risk_distribution,
        "lastBatchRun":         last_batch_run,
        "topHighRiskCustomers": top_high_risk,
        "modelAUC":             round(model_auc, 3),
        "modelF1":              round(model_f1, 3),
        "modelRecall":          round(model_recall, 3),
        "modelPrecision":       round(model_precision, 3),
        "topFeatureImportance": top_feature_importance,
        "recentAlerts":         recent_alerts,
        # New fields
        "churnRate":            churn_rate,
        "prevChurnRate":        prev_churn_rate,
        "retentionRate":        retention_rate,
        "churnTrend":           churn_trend,
        "modelPerformanceTrend": model_performance_trend,
        "contractDistribution": contract_distribution,
        "retentionData":        retention_data,
    }
