import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
import mlflow
import mlflow.sklearn

from sklearn.metrics import confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt
import os
from mlflow.models import infer_signature

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------------------------------------
# 0. Hyperparameters
# -------------------------------------------------------
n_estimators = 100
max_depth = 10

# -------------------------------------------------------
# 1. Tạo data giả lập
# -------------------------------------------------------
np.random.seed(42)
N = 100

data = pd.DataFrame({
    "tenure": np.random.randint(1, 72, N),
    "monthly_charges": np.random.uniform(20, 120, N),
    "total_charges": np.random.uniform(100, 8000, N),
    # contract_type: 0 = month-to-month, 1 = one year, 2 = two year
    "contract_type": np.random.choice([0, 1, 2], N, p=[0.5, 0.3, 0.2]),
    "support_calls": np.random.poisson(2, N),
    "internet_usage": np.random.uniform(1, 500, N),
})

# Tạo nhãn churn dựa trên logic đơn giản: tenure thấp + phí cao => churn cao hơn
churn_score = (
    (1 - data["tenure"] / 72) * 0.4
    + (data["monthly_charges"] / 120) * 0.4
    + (data["contract_type"] == 0).astype(float) * 0.2
)
data["churn"] = (churn_score + np.random.normal(0, 0.1, N) > 0.5).astype(int)

print(f"Data shape: {data.shape}")
print(f"Churn rate: {data['churn'].mean():.2%}")

X = data.drop("churn", axis=1)
y = data["churn"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)


# -------------------------------------------------------
# Log params
# -------------------------------------------------------
mlflow.log_param("n_estimators", n_estimators)
mlflow.log_param("max_depth", max_depth)
mlflow.log_param("train_size", len(X_train))
mlflow.log_param("test_size", len(X_test))

# -------------------------------------------------------
# 2. Kết nối MLflow server đang chạy trong Docker
# -------------------------------------------------------
mlflow.end_run()
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("retainai-churn-prediction")

# -------------------------------------------------------
# 3. Train model và log lên MLflow
# -------------------------------------------------------
with mlflow.start_run(run_name="random_forest_v1"):

    # ============================
    # Train
    # ============================
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Log model
    mlflow.sklearn.log_model(
        sk_model=model,
        name="churn_model",
        registered_model_name="churn_model"  # tự động register luôn
    )

        
    # ============================
    # Evaluate
    # ============================
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"\nAccuracy: {acc:.4f}")
    print(f"AUC-ROC:  {auc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Log metrics
    mlflow.log_metric("accuracy", acc)
    mlflow.log_metric("auc_roc", auc)
    

    # ============================
    # Confusion matrix
    # ============================
    cm = confusion_matrix(y_test, y_pred)
    t_n, f_p, f_n, t_p = cm.ravel()

    fig, ax = plt.subplots()
    sns.heatmap(cm, annot=True, fmt="d", ax=ax)
    ax.set_title("Confusion Matrix")

    cm_path = os.path.join(OUTPUT_DIR, "confusion_matrix.png")
    print('cm_path ', cm_path)
    plt.savefig(cm_path)
    print("\nConfusion matrix:")
    print(cm)

    # Log confusion matrix
    mlflow.log_artifact(cm_path)
    mlflow.log_metric("tn", t_n)
    mlflow.log_metric("fp", f_p)
    mlflow.log_metric("fn", f_n)
    mlflow.log_metric("tp", t_p)


    # ============================
    # Feature Importance
    # ============================
    importances = model.feature_importances_
    feature_names = X.columns

    fi_df = pd.DataFrame({
    "feature": feature_names,
    "importance": importances
    }).sort_values(by="importance", ascending=False)

    fi_path = os.path.join(OUTPUT_DIR, "feature_importance.csv")
    print('fi_path ', fi_path)
    fi_df.to_csv(fi_path, index=False)

    fi_df.plot(kind="barh", x="feature", y="importance")
    plt.savefig(os.path.join(OUTPUT_DIR, "fi_plot.png"))

    # Log Feature Importance
    mlflow.log_artifact(fi_path)
    mlflow.log_artifact(os.path.join(OUTPUT_DIR, "fi_plot.png"))


    # ============================
    # Get run id
    # ============================  
    run_id = mlflow.active_run().info.run_id
    print(f"\n✅ Done! Run ID: {run_id}")
    print("👉 Vào http://localhost:5000 để xem model vừa log.")