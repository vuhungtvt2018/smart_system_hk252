#!/bin/bash
set -e

echo "Starting MLflow background store migration..."
# MLFLOW_BACKEND_STORE_URI is set in docker-compose.yml
# mlflow db upgrade "$MLFLOW_BACKEND_STORE_URI" || echo "Database upgrade migration failed or already applied, skipping..."

echo "Starting MLflow server..."
mlflow server \
    --host 0.0.0.0 \
    --port 5000 \
    --backend-store-uri "$MLFLOW_BACKEND_STORE_URI" \
    --default-artifact-root "$MLFLOW_ARTIFACT_ROOT" \
    --serve-artifacts \
    --allowed-hosts '*'
