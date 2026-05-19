import os
import json
import urllib.request
import urllib.error
from sqlalchemy.orm import Session
from api.database.model import (
    MLflowModelVersion, MLflowRun, MLflowMetric, MLflowParam, MLflowTag,
    MLflowRegisteredModelAlias, MLflowRegisteredModelTag,
)
from api.schemas.model_registry_schema import ModelVersionSchema
from datetime import datetime, timedelta

MLFLOW_TRACKING_URI = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")


def get_registered_models(db: Session):
    versions = db.query(MLflowModelVersion).all()

    if not versions:
        return []

    run_ids = [v.run_id for v in versions if v.run_id]

    # Fetch runs
    runs = db.query(MLflowRun).filter(MLflowRun.run_uuid.in_(run_ids)).all() if run_ids else []
    runs_dict = {run.run_uuid: run for run in runs}

    # Fetch metrics
    metrics = db.query(MLflowMetric).filter(MLflowMetric.run_uuid.in_(run_ids)).all() if run_ids else []
    metrics_dict = {}
    for m in metrics:
        if m.run_uuid not in metrics_dict:
            metrics_dict[m.run_uuid] = {}
        # Keep latest step for simplicity
        metrics_dict[m.run_uuid][m.key] = m.value

    # Fetch params
    params = db.query(MLflowParam).filter(MLflowParam.run_uuid.in_(run_ids)).all() if run_ids else []
    params_dict = {}
    for p in params:
        if p.run_uuid not in params_dict:
            params_dict[p.run_uuid] = {}
        params_dict[p.run_uuid][p.key] = p.value

    # Fetch tags
    tags = db.query(MLflowTag).filter(MLflowTag.run_uuid.in_(run_ids)).all() if run_ids else []
    tags_dict = {}
    for t in tags:
        if t.run_uuid not in tags_dict:
            tags_dict[t.run_uuid] = {}
        tags_dict[t.run_uuid][t.key] = t.value

    # Fetch aliases
    model_aliases = db.query(MLflowRegisteredModelAlias).all()
    aliases_dict = {}
    for a in model_aliases:
        key = (a.name, a.version)
        if key not in aliases_dict:
            aliases_dict[key] = []
        aliases_dict[key].append(a.alias)

    # Fetch registered model tags
    model_tags = db.query(MLflowRegisteredModelTag).all()
    reg_tags_dict = {}
    for t in model_tags:
        if t.name not in reg_tags_dict:
            reg_tags_dict[t.name] = []
        reg_tags_dict[t.name].append(f"{t.key}:{t.value}" if t.value else t.key)

    result = []
    for v in versions:
        run = runs_dict.get(v.run_id)
        run_metrics = metrics_dict.get(v.run_id, {})
        run_params = params_dict.get(v.run_id, {})
        run_tags = tags_dict.get(v.run_id, {})

        # Get Aliases and Tags for this version
        v_aliases = aliases_dict.get((v.name, v.version), [])
        if not v_aliases:
            v_aliases = ["Default"]

        v_tags = reg_tags_dict.get(v.name, [])
        if not v_tags:
            v_tags = ["Default"]

        # Format dates
        trained_at = "Unknown"
        if run and run.start_time:
            trained_dt = datetime.fromtimestamp(run.start_time / 1000.0) + timedelta(hours=7)
            trained_at = trained_dt.strftime('%Y-%m-%d %I:%M %p')

        promoted_at = None
        if v.last_updated_time:
            promoted_dt = datetime.fromtimestamp(v.last_updated_time / 1000.0) + timedelta(hours=7)
            promoted_at = promoted_dt.strftime('%Y-%m-%d %I:%M %p')

        result.append(ModelVersionSchema(
            id=f"{v.name}_{v.version}",
            version=f"v{v.version}.0.0",
            rawVersion=str(v.version),
            modelName=v.name,
            aliases=v_aliases,
            tags=v_tags,
            auc=run_metrics.get("val_auc", run_metrics.get("accuracy", run_metrics.get("auc", 0.0))),
            f1=run_metrics.get("val_f1", run_metrics.get("f1", 0.0)),
            recall=run_metrics.get("val_recall", run_metrics.get("recall", 0.0)),
            precision=run_metrics.get("val_precision", run_metrics.get("precision", 0.0)),
            trainedAt=trained_at,
            trainedBy=run.user_id if run and run.user_id else "system",
            datasetVersion=run_params.get("dataset", "default_dataset"),
            algorithm=run_tags.get("model_type", "XGBoost"),
            notes=v.description or "No notes provided",
            promotedBy=v.user_id if v.user_id else None,
            promotedAt=promoted_at,
            runId=v.run_id,
        ))

    return result


def set_model_alias(model_name: str, version: str, alias: str) -> dict:
    """
    Uses MLflowClient to assign an alias to a specific model version.
    If setting 'champion', first remove the alias from any other version.
    """
    try:
        from mlflow.tracking import MlflowClient
        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)

        # If assigning 'champion', strip it from any existing holder first
        if alias.lower() == "champion":
            try:
                existing = client.get_model_version_by_alias(model_name, "champion")
                if existing and str(existing.version) != str(version):
                    client.delete_registered_model_alias(model_name, "champion")
            except Exception:
                pass  # Alias doesn't exist yet – that's fine

        client.set_registered_model_alias(model_name, alias, str(version))
        return {"status": "success", "model": model_name, "version": version, "alias": alias}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def remove_model_alias(model_name: str, alias: str) -> dict:
    """Remove a named alias from the registered model."""
    try:
        from mlflow.tracking import MlflowClient
        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)
        client.delete_registered_model_alias(model_name, alias)
        return {"status": "success", "model": model_name, "alias": alias}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def get_feature_importance(model_name: str, run_id: str) -> dict:
    """
    Fetches feature_importance/feature_importance.json artifact from MLflow
    for the given run. Returns sorted feature list.
    """
    try:
        from mlflow.tracking import MlflowClient
        client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)

        # Download artifact to a temp directory
        import tempfile
        with tempfile.TemporaryDirectory() as tmp_dir:
            local_path = client.download_artifacts(
                run_id, "feature_importance/feature_importance.json", tmp_dir
            )
            with open(local_path, "r", encoding="utf-8") as f:
                data = json.load(f)

        features = data.get("features", [])
        # Ensure sorted descending
        features = sorted(features, key=lambda x: x["importance"], reverse=True)
        return {"status": "success", "run_id": run_id, "features": features}
    except Exception as e:
        return {"status": "error", "message": str(e), "features": []}
