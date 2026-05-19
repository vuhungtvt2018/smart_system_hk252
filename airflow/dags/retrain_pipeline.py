import os
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'retrain_pipeline',
    default_args=default_args,
    description='Automated XGBoost Churn Training Pipeline',
    schedule_interval=None,
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['machine_learning', 'training'],
) as dag:

    # Using BashOperator to run the Python training script.
    # The dataset_path is passed via DAG run configuration.
    
    # We will just run fold 0 for demonstration purposes in the pipeline.
    # A complete pipeline might use a dynamic task mapping to run all 20 folds.
    
    run_training_fold_0 = BashOperator(
        task_id='run_xgboost_training_fold_0',
        bash_command=(
            "python /app/models/xgb_training.py "
            "--fold 0 "
            "--dataset_path {{ dag_run.conf['dataset_path'] }} "
            "{% if dag_run.conf.get('test_dataset_path') %}--test_dataset_path {{ dag_run.conf['test_dataset_path'] }} {% endif %}"
            "--tracking_uri http://mlflow:5000 "
            "--experiment_name XGBoost_Churn_Pipeline"
        )
    )

    run_training_fold_0
