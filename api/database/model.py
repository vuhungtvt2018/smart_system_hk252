from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base
from .session import Base

MLflowBase = declarative_base()

class CustomerPrediction(Base):
    """Stores individual on-demand predictions with all 19 raw features."""
    __tablename__ = "customer_predictions"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(String, index=True, nullable=True)

    # ── Demographic ───────────────────────────────────────────────────────────
    gender = Column(String, nullable=True)
    senior_citizen = Column(Integer, nullable=True)   # 0 / 1
    partner = Column(String, nullable=True)
    dependents = Column(String, nullable=True)

    # ── Services ──────────────────────────────────────────────────────────────
    phone_service = Column(String, nullable=True)
    multiple_lines = Column(String, nullable=True)
    internet_service = Column(String, nullable=True)
    online_security = Column(String, nullable=True)
    online_backup = Column(String, nullable=True)
    device_protection = Column(String, nullable=True)
    tech_support = Column(String, nullable=True)
    streaming_tv = Column(String, nullable=True)
    streaming_movies = Column(String, nullable=True)

    # ── Account ───────────────────────────────────────────────────────────────
    tenure = Column(Integer, nullable=True)
    contract = Column(String, nullable=True)
    paperless_billing = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    monthly_charges = Column(Float, nullable=True)
    total_charges = Column(Float, nullable=True)

    # ── Prediction output ─────────────────────────────────────────────────────
    churn_probability = Column(Float, nullable=False)
    risk_tier = Column(String, nullable=False)  # HIGH | MEDIUM | LOW

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BatchJob(Base):
    """Tracks each batch prediction job and its per-row results."""
    __tablename__ = "batch_jobs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    processed_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    status = Column(String, default="processing")   # processing | done | error
    error_message = Column(Text, nullable=True)
    # Per-row results stored as JSON array for easy retrieval
    results_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# MLFlow Entities (Mapped to MLFlow's auto-generated tables)

class MLflowRegisteredModel(MLflowBase):
    __tablename__ = "registered_models"
    __table_args__ = {'extend_existing': True}

    name = Column(String, primary_key=True)
    creation_time = Column(Integer)
    last_updated_time = Column(Integer)
    description = Column(String)

class MLflowModelVersion(MLflowBase):
    __tablename__ = "model_versions"
    __table_args__ = {'extend_existing': True}

    name = Column(String, primary_key=True)
    version = Column(Integer, primary_key=True)
    creation_time = Column(Integer)
    last_updated_time = Column(Integer)
    user_id = Column(String)
    current_stage = Column(String)
    description = Column(String)
    source = Column(String)
    run_id = Column(String)
    status = Column(String)
    status_message = Column(String)

class MLflowRun(MLflowBase):
    __tablename__ = "runs"
    __table_args__ = {'extend_existing': True}

    run_uuid = Column(String, primary_key=True)
    name = Column(String)
    source_type = Column(String)
    source_name = Column(String)
    entry_point_name = Column(String)
    user_id = Column(String)
    status = Column(String)
    start_time = Column(Integer)
    end_time = Column(Integer)
    source_version = Column(String)
    lifecycle_stage = Column(String)
    artifact_uri = Column(String)
    experiment_id = Column(Integer)
    deleted_time = Column(Integer)

class MLflowMetric(MLflowBase):
    __tablename__ = "metrics"
    __table_args__ = {'extend_existing': True}

    key = Column(String, primary_key=True)
    value = Column(Float)
    timestamp = Column(Integer, primary_key=True)
    run_uuid = Column(String, primary_key=True)
    step = Column(Integer, primary_key=True)
    is_nan = Column(Boolean, primary_key=True)

class MLflowParam(MLflowBase):
    __tablename__ = "params"
    __table_args__ = {'extend_existing': True}

    key = Column(String, primary_key=True)
    value = Column(String)
    run_uuid = Column(String, primary_key=True)

class MLflowTag(MLflowBase):
    __tablename__ = "tags"
    __table_args__ = {'extend_existing': True}

    key = Column(String, primary_key=True)
    value = Column(String)
    run_uuid = Column(String, primary_key=True)

class MLflowRegisteredModelAlias(MLflowBase):
    __tablename__ = "registered_model_aliases"
    __table_args__ = {'extend_existing': True}

    name = Column(String, primary_key=True)
    alias = Column(String, primary_key=True)
    version = Column(Integer)

class MLflowRegisteredModelTag(MLflowBase):
    __tablename__ = "registered_model_tags"
    __table_args__ = {'extend_existing': True}

    name = Column(String, primary_key=True)
    key = Column(String, primary_key=True)
    value = Column(String)
