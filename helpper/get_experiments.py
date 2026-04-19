from mlflow.tracking import MlflowClient

client = MlflowClient(tracking_uri="http://localhost:5000")

experiments = client.search_experiments(view_type=3)  # 3 = ALL (active + deleted)

for exp in experiments:
    print(f"ID: {exp.experiment_id} | Name: {exp.name} | Stage: {exp.lifecycle_stage}")




# Fix lỗi không lấy được artifact_uri

# docker exec -it retainai_postgres psql -U retainai_user -d retainai_db -c "SELECT run_uuid, artifact_uri FROM runs ORDER BY start_time DESC LIMIT 6;"

"""
docker exec -it retainai_postgres psql -U retainai_user -d retainai_db -c "
UPDATE runs 
SET artifact_uri = REPLACE(
    artifact_uri, 
    '/ivs/my_folder/master/hk252/smart_system/smart_system_hk252/mlruns', 
    '/mlruns'
);
"
"""

# docker exec -it retainai_postgres psql -U retainai_user -d retainai_db -c "SELECT run_uuid, artifact_uri FROM runs LIMIT 6;"









# docker compose down -v
# docker volume ls
# docker volume rm smart_system_hk252_postgres_data
# docker system prune -a -f
# rm -r -fo mlruns


# docker compose build mlflow
# docker compose up -d