import os
os.environ["MLFLOW_ARTIFACT_URI"] = "http://localhost:5000"
os.environ["MLFLOW_TRACKING_URI"] = "http://localhost:5000"
os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_UPLOAD"] = "true"

from sklearn import datasets
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix
)
import mlflow
from mlflow.data import from_pandas
from mlflow.models.signature import infer_signature

def log_common():
    mlflow.log_params(common_params)
    mlflow.set_tags(common_tags)


# -------------------------------------------------------
# 1. Kết nối MLflow server đang chạy trong Docker
# -------------------------------------------------------
mlflow.end_run()
mlflow.set_tracking_uri("http://localhost:5000")
os.environ["MLFLOW_ENABLE_PROXY_MULTIPART_UPLOAD"] = "true"
mlflow.set_registry_uri("http://localhost:5000")
mlflow.set_experiment("Iris")

mlflow.enable_system_metrics_logging()
# mlflow.autolog()                    # Log tự động - Không nên dùng trong production


# -------------------------------------------------------
# 2. Data processing
# -------------------------------------------------------
# Load the Iris dataset
X, y = datasets.load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

common_params = {
    "dataset": "iris",
    "train_size": len(X_train),
    "test_size": len(X_test),
    "random_state": 42
}

common_tags = {
    "project": "iris_classification",
    "owner": "hungvu"
}


# -------------------------------------------------------
# 3. Train model và log lên MLflow
# -------------------------------------------------------
with mlflow.start_run(run_name="Classification") as parent_run:

     log_common()
     mlflow.log_input(from_pandas(datasets.load_iris(as_frame=True).frame, name="iris_dataset"), context="training")

     # ---------------------------------------------------
     # Child Runs
     # ---------------------------------------------------
     for max_iter in [100, 200]:
          with mlflow.start_run(run_name=f"LR_{max_iter}", nested=True) as child_run:

               log_common()
               
               mlflow.set_tag("model_type", "LogisticRegression")
               mlflow.log_param("max_iter", max_iter)

               model = LogisticRegression(max_iter=max_iter)
               model.fit(X_train, y_train)

               # Log model
               model_info = mlflow.sklearn.log_model(
                    sk_model=model, name="iris_model",
                    registered_model_name=f"iris_model_{max_iter}",
               )

               # Evaluate
               y_pred = model.predict(X_test)
               accuracy = accuracy_score(y_test, y_pred)
               prec = precision_score(y_test, y_pred, average="weighted")
               rec = recall_score(y_test, y_pred, average="weighted")
               f1 = f1_score(y_test, y_pred, average="weighted")

               cm = confusion_matrix(y_test, y_pred)
               plt.figure()
               sns.heatmap(cm, annot=True, fmt="d")
               plt.xlabel("Predicted")
               plt.ylabel("Actual")
               plt.title(f"Confusion Matrix (max_iter={max_iter})")
               mlflow.log_figure(plt.gcf(), f"confusion_matrix_{max_iter}.png")
               # mlflow.log_artifact(f"confusion_matrix_{max_iter}.png", "model_plot")
               plt.close()
               
               mlflow.log_metrics({
                    "accuracy": accuracy,
                    "precision": prec,
                    "recall": rec,
                    "f1": f1
               })

               mlflow_run_id = child_run.info.run_id
               print("MLFlow Run ID: ", mlflow_run_id)
               


               # iris_feature_names = datasets.load_iris().feature_names
               # df_test = pd.DataFrame(X_test, columns=iris_feature_names)
               # df_test["label"] = y_test
               # result = mlflow.models.evaluate(
               #      model_info.model_uri,
               #      df_test,
               #      targets="label",
               #      model_type="classifier",     # regressor
               #      evaluator_config={
               #           "log_explainer": True,
               #           "explainer_type": "exact",
               #      },
               # )

               # # Access metrics
               # print(result.metrics.keys())
               # for metric_name, value in result.metrics.items():
               #      print(f"{metric_name}: {value:.3f}")

               # # Access artifacts (plots, tables)
               # for artifact_name, path in result.artifacts.items():
               #      print(f"{artifact_name}: {path}")

               # # Access evaluation table
               # eval_table = result.tables["eval_results_table"]
               # print(eval_table)


               # # Load the model back for inference
               # loaded_model = mlflow.pyfunc.load_model(model_info.model_uri)
               # y_pred = loaded_model.predict(X_test)

               # iris_feature_names = datasets.load_iris().feature_names
               # result = pd.DataFrame(X_test, columns=iris_feature_names)
               # result["actual_class"] = y_test
               # result["predicted_class"] = y_pred

               # print(result[:4])


     # Get run id
     run_id = mlflow.active_run().info.run_id
     print(f"\n✅ Done! Run ID: {run_id}")
     print("👉 Vào http://localhost:5000 để xem model vừa log.")