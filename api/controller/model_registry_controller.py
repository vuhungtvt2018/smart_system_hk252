from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from api.database.session import get_db
from api.schemas.model_registry_schema import (
    ModelVersionSchema, SetAliasRequest, RemoveAliasRequest, AliasActionResponse,
)
from api.services.model_registry_service import (
    get_registered_models, set_model_alias, remove_model_alias, get_feature_importance,
)

router = APIRouter(tags=["Model Registry"])


@router.get("", response_model=List[ModelVersionSchema])
def list_registered_models(db: Session = Depends(get_db)):
    """Fetch all registered model versions from MLflow database."""
    return get_registered_models(db)


@router.post("/set-alias", response_model=AliasActionResponse)
def set_alias(request: SetAliasRequest):
    """
    Set a named alias (e.g. 'champion') on a specific model version.
    If 'champion' is assigned to another version it is moved automatically.
    """
    result = set_model_alias(request.model_name, request.version, request.alias)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    return result


@router.delete("/remove-alias", response_model=AliasActionResponse)
def remove_alias(model_name: str, alias: str):
    """Remove a named alias from the registered model."""
    result = remove_model_alias(model_name, alias)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error"))
    return result


@router.get("/feature-importance")
def fetch_feature_importance(model_name: str, run_id: str):
    """
    Download and return the feature_importance.json artifact stored in MLflow
    for the given run_id. Used by the Monitoring page to display real data.
    """
    result = get_feature_importance(model_name, run_id)
    if result["status"] == "error":
        # Return empty list gracefully so UI falls back to placeholder
        return {"status": "error", "message": result.get("message"), "features": []}
    return result
