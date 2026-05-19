import os
import shutil
import urllib.request
import urllib.error
import urllib.parse
import json
import base64
from fastapi import UploadFile

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploaded")
# Inside Docker, host.docker.internal points to the host machine (Windows/Mac)
AIRFLOW_BASE_URL = os.getenv("AIRFLOW_BASE_URL", "http://host.docker.internal:8080/api/v1")
AIRFLOW_DAG_ID   = os.getenv("AIRFLOW_DAG_ID", "retrain_pipeline")
AIRFLOW_URL      = f"{AIRFLOW_BASE_URL}/dags/{AIRFLOW_DAG_ID}/dagRuns"

AIRFLOW_USER = os.getenv("AIRFLOW_USER", "admin")
AIRFLOW_PASS = os.getenv("AIRFLOW_PASS", "admin")

_AUTH_HEADER = "Basic " + base64.b64encode(f"{AIRFLOW_USER}:{AIRFLOW_PASS}".encode()).decode()

os.makedirs(DATA_DIR, exist_ok=True)

class TrainingService:
    @staticmethod
    async def save_uploaded_dataset(file: UploadFile) -> str:
        """
        Saves the uploaded CSV dataset to the data/uploaded directory.
        Returns the absolute path to the saved file.
        """
        file_path = os.path.join(DATA_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    @staticmethod
    async def save_test_dataset(file: UploadFile) -> str:
        """
        Saves the uploaded test dataset, always overwriting as 'test_dataset.csv'.
        """
        file_path = os.path.join(DATA_DIR, "test_dataset.csv")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path

    @staticmethod
    def has_test_dataset() -> bool:
        """
        Checks if 'test_dataset.csv' exists in the uploaded directory.
        """
        file_path = os.path.join(DATA_DIR, "test_dataset.csv")
        return os.path.exists(file_path)

    @staticmethod
    def trigger_airflow_dag(dataset_path: str) -> dict:
        """
        Triggers the Airflow DAG 'retrain_pipeline' using the Airflow REST API.
        """
        filename = os.path.basename(dataset_path)
        container_path = f"/app/data/uploaded/{filename}"
        
        if not TrainingService.has_test_dataset():
            return {"status": "error", "message": "A test dataset is required but none was found in the directory."}
            
        data = {
            "conf": {
                "dataset_path": container_path,
                "test_dataset_path": "/app/data/uploaded/test_dataset.csv"
            }
        }

        req = urllib.request.Request(
            AIRFLOW_URL,
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": _AUTH_HEADER,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode())
                return {"status": "success", "message": "DAG triggered successfully", "details": result}
        except urllib.error.URLError as e:
            error_message = str(e.reason) if hasattr(e, 'reason') else str(e)
            return {"status": "error", "message": f"Failed to trigger Airflow DAG: {error_message}"}

    @staticmethod
    def get_dag_runs() -> dict:
        """
        Fetches recent DAG runs from Airflow REST API.
        Returns running_count (active tasks) and list of up to 20 recent runs.
        """
        # Fetch the last 20 runs ordered by newest first
        url = AIRFLOW_URL + "?limit=20&order_by=-execution_date"
        req = urllib.request.Request(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": _AUTH_HEADER,
            },
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                runs_raw = data.get("dag_runs", [])

                runs = []
                running_count = 0
                for r in runs_raw:
                    state = r.get("state", "unknown")
                    if state in ("running", "queued"):
                        running_count += 1
                    conf = r.get("conf") or {}
                    runs.append({
                        "dag_run_id": r.get("dag_run_id", ""),
                        "state":      state,
                        "start_date": r.get("start_date") or r.get("execution_date", ""),
                        "end_date":   r.get("end_date"),
                        "conf":       conf,
                    })

                return {
                    "status":        "success",
                    "running_count": running_count,
                    "runs":          runs,
                }
        except urllib.error.URLError as e:
            error_message = str(e.reason) if hasattr(e, 'reason') else str(e)
            return {
                "status":        "error",
                "message":       f"Cannot reach Airflow: {error_message}",
                "running_count": 0,
                "runs":          [],
            }
