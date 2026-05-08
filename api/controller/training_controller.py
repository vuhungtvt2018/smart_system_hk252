from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from api.services.training_service import TrainingService

router = APIRouter()


class TriggerTrainingRequest(BaseModel):
    dataset_path: str


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        file_path = await TrainingService.save_uploaded_dataset(file)
        return {"status": "success", "message": "File uploaded successfully", "dataset_path": file_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.post("/trigger")
def trigger_training(request: TriggerTrainingRequest):
    result = TrainingService.trigger_airflow_dag(request.dataset_path)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return result


@router.get("/dag-status")
def get_dag_status():
    """
    Returns current Airflow DAG runs for the retrain_pipeline DAG.
    Includes running_count (queued + running) so the UI can enforce
    the 5-concurrent-task limit.
    """
    result = TrainingService.get_dag_runs()
    # Return gracefully even if Airflow is unreachable (status='error')
    return result
