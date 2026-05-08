from pydantic import BaseModel, Field
from typing import Optional, List


class ModelVersionSchema(BaseModel):
    id: str
    version: str
    rawVersion: str = ""      # Numeric version string for alias API calls
    modelName: str = ""       # Registered model name in MLflow
    runId: Optional[str] = None  # MLflow run ID for artifact fetching
    aliases: List[str]
    tags: List[str]
    auc: float
    f1: float
    recall: float
    precision: float
    trainedAt: str
    trainedBy: str
    datasetVersion: str
    algorithm: str
    notes: str
    promotedBy: Optional[str] = None
    promotedAt: Optional[str] = None

    class Config:
        from_attributes = True


class SetAliasRequest(BaseModel):
    model_name: str
    version: str
    alias: str


class RemoveAliasRequest(BaseModel):
    model_name: str
    alias: str


class AliasActionResponse(BaseModel):
    status: str
    model: Optional[str] = None
    version: Optional[str] = None
    alias: Optional[str] = None
    message: Optional[str] = None
