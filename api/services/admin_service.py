import os
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from api.database import crud
from api.services.model_registry_service import get_registered_models

logger = logging.getLogger(__name__)
MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
REGISTERED_MODEL_NAME = "RetainAI_XGBoost_Churn"

# Mocked system users (augmenting MLflow data)
SYSTEM_USERS = [
    {
        "id": "u-admin",
        "name": "Admin User",
        "email": "admin@retainai.io",
        "role": "Admin",
        "status": "Active",
        "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "createdAt": "2025-01-10",
        "avatar": "AU"
    },
    {
        "id": "u-airflow",
        "name": "Airflow Pipeline",
        "email": "auto-airflow@retainai.io",
        "role": "ML Engineer",
        "status": "Active",
        "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "createdAt": "2025-01-15",
        "avatar": "AP"
    }
]

def get_users(db: Session) -> list:
    """
    Get users by combining predefined system users with dynamic MLflow users.
    """
    users = list(SYSTEM_USERS)
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        
        # We will extract unique user_ids from model versions
        versions = client.search_model_versions(f"name='{REGISTERED_MODEL_NAME}'")
        
        mlflow_users = set()
        for v in versions:
            if v.user_id and v.user_id not in [u["email"] for u in users] and v.user_id not in [u["name"] for u in users]:
                mlflow_users.add(v.user_id)
        
        # Extract from runs if possible
        experiment = client.get_experiment_by_name(REGISTERED_MODEL_NAME)
        if experiment:
            runs = client.search_runs(experiment_ids=[experiment.experiment_id])
            for r in runs:
                uid = r.data.tags.get("mlflow.user")
                if uid and uid not in [u["email"] for u in users] and uid not in [u["name"] for u in users]:
                    mlflow_users.add(uid)

        for i, uid in enumerate(mlflow_users):
            # MLflow usernames are typically local system users or simple names
            name = uid.split("@")[0].replace(".", " ").title() if "@" in uid else uid.title()
            email = uid if "@" in uid else f"{uid}@retainai.io"
            avatar = "".join([n[0] for n in name.split()[:2]]).upper() or "U"
            
            users.append({
                "id": f"u-mlflow-{i}",
                "name": name,
                "email": email,
                "role": "ML Engineer",
                "status": "Active",
                "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "createdAt": "2026-01-01",
                "avatar": avatar
            })
            
    except Exception as e:
        logger.warning(f"Could not load users from MLflow: {e}")

    # Add a few Business Users for demonstration
    if len(users) < 4:
        users.extend([
            {"id": "u-biz1", "name": "Sarah Connor", "email": "sarah.c@retainai.io", "role": "Business User", "status": "Active", "lastLogin": "Recent", "createdAt": "2025-02-15", "avatar": "SC"},
            {"id": "u-biz2", "name": "Tom Bradley", "email": "tom.b@retainai.io", "role": "Business User", "status": "Locked", "lastLogin": "2026-03-20 09:00", "createdAt": "2025-05-22", "avatar": "TB"}
        ])

    return users


def get_audit_logs(db: Session) -> list:
    """
    Dynamically construct audit logs from:
    1. Batch Jobs from the database
    2. MLflow Model Versions (Promotions & Submissions)
    3. MLflow Runs (Training)
    """
    logs = []
    
    # 1. Batch Jobs
    jobs = crud.get_batch_jobs(db, skip=0, limit=100)
    for job in jobs:
        if job.created_at:
            vn_time = job.created_at + timedelta(hours=7)
            status = "SUCCESS" if job.status == "done" else "FAILED" if job.status == "error" else "WARNING"
            detail = f"Batch inference: {job.processed_count} customers processed" if job.status == "done" else f"Batch inference failed: {job.error_message}"
            logs.append({
                "id": f"log-batch-{job.id}",
                "timestamp": vn_time.strftime("%Y-%m-%d %H:%M"),
                "user": "auto-airflow@retainai.io",
                "role": "ML Engineer",
                "action": "PREDICT_BATCH",
                "detail": detail,
                "ip": "10.0.0.5 (Airflow Worker)",
                "status": status,
                "sort_time": vn_time.timestamp()
            })

    # 2. MLflow Events
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        
        versions = client.search_model_versions(f"name='{REGISTERED_MODEL_NAME}'")
        for v in versions:
            user = v.user_id if v.user_id else "ml-engineer"
            email = user if "@" in user else f"{user}@retainai.io"
            
            # Model Submission
            creation_dt = datetime.fromtimestamp(v.creation_timestamp / 1000.0)
            logs.append({
                "id": f"log-ms-{v.version}",
                "timestamp": creation_dt.strftime("%Y-%m-%d %H:%M"),
                "user": email,
                "role": "ML Engineer",
                "action": "MODEL_SUBMIT",
                "detail": f"Submitted model v{v.version} for tracking",
                "ip": "10.0.0.12 (MLflow SDK)",
                "status": "SUCCESS",
                "sort_time": creation_dt.timestamp()
            })
            
            # Model Promotion (Check Aliases)
            if v.aliases and "champion" in [a.lower() for a in v.aliases]:
                update_dt = datetime.fromtimestamp(v.last_updated_timestamp / 1000.0)
                logs.append({
                    "id": f"log-mp-{v.version}",
                    "timestamp": update_dt.strftime("%Y-%m-%d %H:%M"),
                    "user": "admin@retainai.io",
                    "role": "Admin",
                    "action": "MODEL_PROMOTE",
                    "detail": f"Promoted model v{v.version} to champion",
                    "ip": "10.0.0.2 (Admin Console)",
                    "status": "SUCCESS",
                    "sort_time": update_dt.timestamp()
                })
        
        # Training Runs
        experiment = client.get_experiment_by_name(REGISTERED_MODEL_NAME)
        if experiment:
            runs = client.search_runs(experiment_ids=[experiment.experiment_id], max_results=50)
            for r in runs:
                user = r.data.tags.get("mlflow.user", "ml-engineer")
                email = user if "@" in user else f"{user}@retainai.io"
                start_dt = datetime.fromtimestamp(r.info.start_time / 1000.0)
                
                logs.append({
                    "id": f"log-run-{r.info.run_id[:8]}",
                    "timestamp": start_dt.strftime("%Y-%m-%d %H:%M"),
                    "user": email,
                    "role": "ML Engineer",
                    "action": "TRAINING_RUN",
                    "detail": f"Triggered training run {r.info.run_name}",
                    "ip": "10.0.0.12 (MLflow SDK)",
                    "status": "SUCCESS" if r.info.status == "FINISHED" else "FAILED",
                    "sort_time": start_dt.timestamp()
                })
    except Exception as e:
        logger.warning(f"Could not load MLflow events for audit log: {e}")

    # Add a few system config updates if empty
    if not logs:
        now = datetime.now()
        logs.append({
            "id": "log-sys-1",
            "timestamp": now.strftime("%Y-%m-%d %H:%M"),
            "user": "admin@retainai.io",
            "role": "Admin",
            "action": "CONFIG_UPDATE",
            "detail": "System initialization and DB setup",
            "ip": "127.0.0.1",
            "status": "SUCCESS",
            "sort_time": now.timestamp()
        })

    # Sort descending by timestamp
    logs.sort(key=lambda x: x.get("sort_time", 0), reverse=True)
    
    # Remove sort_time and return top 200
    for log in logs:
        if "sort_time" in log:
            del log["sort_time"]
            
    return logs[:200]
