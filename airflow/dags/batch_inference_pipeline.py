from datetime import datetime, timedelta
from airflow import DAG
# pyrefly: ignore [missing-import]
from airflow.operators.bash import BashOperator

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=1),
}

with DAG(
    'batch_inference_pipeline',
    default_args=default_args,
    description='Automated XGBoost Batch Inference Pipeline',
    schedule_interval=None,
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['machine_learning', 'inference'],
) as dag:

    run_batch_inference = BashOperator(
        task_id='run_batch_inference_worker',
        bash_command=(
            "python /app/models/batch_worker.py "
            "--job_id {{ dag_run.conf['job_id'] }} "
            "--file_path {{ dag_run.conf['file_path'] }}"
        )
    )

    run_batch_inference
