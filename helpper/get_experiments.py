from mlflow.tracking import MlflowClient

client = MlflowClient(tracking_uri="http://localhost:5000")

experiments = client.search_experiments(view_type=3)  # 3 = ALL (active + deleted)

for exp in experiments:
    print(f"ID: {exp.experiment_id} | Name: {exp.name} | Stage: {exp.lifecycle_stage}")