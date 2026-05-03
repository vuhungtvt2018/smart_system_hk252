import argparse
import os
import time
import gc
import tempfile
import json
import pandas as pd
import numpy as np
import xgboost as xgb
from itertools import combinations
from sklearn.metrics import (
    roc_auc_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import TargetEncoder
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for Airflow/Docker
import matplotlib.pyplot as plt

import mlflow
import mlflow.xgboost
from mlflow.tracking import MlflowClient

# -- Constants & Config --
class CFG:
    TARGET = "Churn"
    N_FOLDS = 20
    INNER_FOLDS = 5
    RANDOM_SEED = 42

TOP_CATS_FOR_NGRAM = [
    "Contract", "InternetService", "PaymentMethod",
    "OnlineSecurity", "TechSupport", "PaperlessBilling",
]

XGB_PARAMS = {
    "n_estimators": 1000,
    "learning_rate": 0.008,
    "max_depth": 5,
    "subsample": 0.81,
    "colsample_bytree": 0.32,
    "min_child_weight": 6,
    "reg_alpha": 3.5017,
    "reg_lambda": 1.2925,
    "gamma": 0.79,
    "random_state": CFG.RANDOM_SEED,
    "early_stopping_rounds": 100,
    "objective": "binary:logistic",
    "eval_metric": "auc",
    "enable_categorical": True,
    "tree_method": "hist",
    "n_jobs": -1
}

STATS = ["std", "min", "max"]

CATS = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService",
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    "Contract", "PaperlessBilling", "PaymentMethod",
]
NUMS = ["tenure", "MonthlyCharges", "TotalCharges"]

# -- Data Loading & Feature Engineering Helpers --
def load_datasets(dataset_path: str) -> tuple:
    from sklearn.model_selection import train_test_split
    
    orig = pd.read_csv(dataset_path)
    
    # Preprocessing to ensure target exists and is formatted
    if CFG.TARGET in orig.columns:
        if orig[CFG.TARGET].dtype == object:
            orig[CFG.TARGET] = orig[CFG.TARGET].map({"No": 0, "Yes": 1}).astype(int)
    
    orig["TotalCharges"] = pd.to_numeric(orig["TotalCharges"], errors="coerce")
    orig["TotalCharges"].fillna(orig["TotalCharges"].median(), inplace=True)
    if "customerID" in orig.columns:
        orig.drop(columns=["customerID"], inplace=True)
        
    # Split into train and test
    train, test = train_test_split(orig, test_size=0.2, random_state=CFG.RANDOM_SEED, stratify=orig[CFG.TARGET])
    
    # reset index
    train.reset_index(drop=True, inplace=True)
    test.reset_index(drop=True, inplace=True)

    return train, test, orig

def add_frequency_encoding(train, test, orig, num_cols, new_nums):
    for col in num_cols:
        freq = pd.concat([train[col], orig[col], test[col]]).value_counts(normalize=True)
        feat = f"FREQ_{col}"
        for df in [train, test, orig]:
            df[feat] = df[col].map(freq).fillna(0).astype("float32")
        new_nums.append(feat)

def add_arithmetic_interactions(dfs, new_nums):
    for df in dfs:
        df["charges_deviation"] = (df["TotalCharges"] - df["tenure"] * df["MonthlyCharges"]).astype("float32")
        df["monthly_to_total_ratio"] = (df["MonthlyCharges"] / (df["TotalCharges"] + 1)).astype("float32")
        df["avg_monthly_charges"] = (df["TotalCharges"] / (df["tenure"] + 1)).astype("float32")
    new_nums += ["charges_deviation", "monthly_to_total_ratio", "avg_monthly_charges"]

def add_service_counts(dfs, new_nums):
    service_cols = [
        "PhoneService", "MultipleLines", "OnlineSecurity", "OnlineBackup",
        "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    ]
    for df in dfs:
        df["service_count"] = (df[service_cols] == "Yes").sum(axis=1).astype("float32")
        df["has_internet"] = (df["InternetService"] != "No").astype("float32")
        df["has_phone"] = (df["PhoneService"] == "Yes").astype("float32")
    new_nums += ["service_count", "has_internet", "has_phone"]

def add_orig_proba_features(train, test, orig, feature_cols, target, new_nums):
    for col in feature_cols:
        tmp = orig.groupby(col)[target].mean()
        feat = f"ORIG_proba_{col}"
        train[feat] = train[col].map(tmp).fillna(0.5).astype("float32")
        test[feat]  = test[col].map(tmp).fillna(0.5).astype("float32")
        new_nums.append(feat)

def pctrank_against(values, reference):
    ref_sorted = np.sort(reference)
    return (np.searchsorted(ref_sorted, values) / len(ref_sorted)).astype("float32")

def zscore_against(values, reference):
    mu, sigma = np.mean(reference), np.std(reference)
    if sigma == 0: return np.zeros(len(values), dtype="float32")
    return ((values - mu) / sigma).astype("float32")

def add_distribution_features(train, test, orig, target, new_nums):
    churner_tc = orig.loc[orig[target] == 1, "TotalCharges"].values
    nonchurner_tc = orig.loc[orig[target] == 0, "TotalCharges"].values
    orig_tc = orig["TotalCharges"].values
    is_mc_mean = orig.groupby("InternetService")["MonthlyCharges"].mean()

    for df in [train, test]:
        tc = df["TotalCharges"].values
        df["pctrank_nonchurner_TC"] = pctrank_against(tc, nonchurner_tc)
        df["pctrank_churner_TC"] = pctrank_against(tc, churner_tc)
        df["pctrank_orig_TC"] = pctrank_against(tc, orig_tc)
        df["zscore_churn_gap_TC"] = (np.abs(zscore_against(tc, churner_tc)) - np.abs(zscore_against(tc, nonchurner_tc))).astype("float32")
        df["zscore_nonchurner_TC"] = zscore_against(tc, nonchurner_tc)
        df["pctrank_churn_gap_TC"] = (pctrank_against(tc, churner_tc) - pctrank_against(tc, nonchurner_tc)).astype("float32")
        df["resid_IS_MC"] = (df["MonthlyCharges"] - df["InternetService"].map(is_mc_mean).fillna(0)).astype("float32")

        vals = np.zeros(len(df), dtype="float32")
        for cat_val in orig["InternetService"].unique():
            mask = df["InternetService"] == cat_val
            ref = orig.loc[orig["InternetService"] == cat_val, "TotalCharges"].values
            if len(ref) > 0 and mask.sum() > 0: vals[mask] = pctrank_against(df.loc[mask, "TotalCharges"].values, ref)
        df["cond_pctrank_IS_TC"] = vals

        vals = np.zeros(len(df), dtype="float32")
        for cat_val in orig["Contract"].unique():
            mask = df["Contract"] == cat_val
            ref = orig.loc[orig["Contract"] == cat_val, "TotalCharges"].values
            if len(ref) > 0 and mask.sum() > 0: vals[mask] = pctrank_against(df.loc[mask, "TotalCharges"].values, ref)
        df["cond_pctrank_C_TC"] = vals

    dist_features = [
        "pctrank_nonchurner_TC", "zscore_churn_gap_TC", "pctrank_churn_gap_TC",
        "resid_IS_MC", "cond_pctrank_IS_TC", "zscore_nonchurner_TC",
        "pctrank_orig_TC", "pctrank_churner_TC", "cond_pctrank_C_TC",
    ]
    new_nums += dist_features

def add_quantile_distance_features(train, test, orig, target, new_nums):
    churner_tc = orig.loc[orig[target] == 1, "TotalCharges"].values
    nonchurner_tc = orig.loc[orig[target] == 0, "TotalCharges"].values

    qdist_features = []
    for q_label, q_val in [("q25", 0.25), ("q50", 0.50), ("q75", 0.75)]:
        ch_q = np.quantile(churner_tc, q_val)
        nc_q = np.quantile(nonchurner_tc, q_val)
        for df in [train, test]:
            df[f"dist_To_ch_{q_label}"] = np.abs(df["TotalCharges"] - ch_q).astype("float32")
            df[f"dist_To_nc_{q_label}"] = np.abs(df["TotalCharges"] - nc_q).astype("float32")
            df[f"qdist_gap_To_{q_label}"] = (df[f"dist_To_nc_{q_label}"] - df[f"dist_To_ch_{q_label}"]).astype("float32")
        qdist_features += [f"dist_To_ch_{q_label}", f"dist_To_nc_{q_label}", f"qdist_gap_To_{q_label}"]

    selected = [
        "qdist_gap_To_q50", "dist_To_ch_q50", "dist_To_nc_q50",
        "dist_To_nc_q25", "qdist_gap_To_q25",
        "dist_To_nc_q75", "dist_To_ch_q75", "qdist_gap_To_q75",
    ]
    new_nums += selected

def add_numericals_as_categories(train, test, num_cols, num_as_cat):
    for col in num_cols:
        feat = f"CAT_{col}"
        num_as_cat.append(feat)
        for df in [train, test]: df[feat] = df[col].astype(str).astype("category")

def add_digit_features(dfs, new_nums):
    for df in dfs:
        t_str = df["tenure"].astype(str)
        df["tenure_first_digit"] = t_str.str[0].astype(int)
        df["tenure_last_digit"] = t_str.str[-1].astype(int)
        df["tenure_second_digit"] = t_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
        df["tenure_mod10"] = df["tenure"] % 10
        df["tenure_mod12"] = df["tenure"] % 12
        df["tenure_num_digits"] = t_str.str.len()
        df["tenure_is_multiple_10"] = (df["tenure"] % 10 == 0).astype("float32")
        df["tenure_rounded_10"] = np.round(df["tenure"] / 10) * 10
        df["tenure_dev_from_round10"] = np.abs(df["tenure"] - df["tenure_rounded_10"])
        df["tenure_years"] = df["tenure"] // 12
        df["tenure_months_in_year"] = df["tenure"] % 12

        mc_str = df["MonthlyCharges"].astype(str).str.replace(".", "")
        df["mc_first_digit"] = mc_str.str[0].astype(int)
        df["mc_last_digit"] = mc_str.str[-1].astype(int)
        df["mc_second_digit"] = mc_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
        df["mc_mod10"] = np.floor(df["MonthlyCharges"]) % 10
        df["mc_mod100"] = np.floor(df["MonthlyCharges"]) % 100
        df["mc_num_digits"] = np.floor(df["MonthlyCharges"]).astype(int).astype(str).str.len()
        df["mc_is_multiple_10"] = (np.floor(df["MonthlyCharges"]) % 10 == 0).astype("float32")
        df["mc_is_multiple_50"] = (np.floor(df["MonthlyCharges"]) % 50 == 0).astype("float32")
        df["mc_rounded_10"] = np.round(df["MonthlyCharges"] / 10) * 10
        df["mc_fractional"] = df["MonthlyCharges"] - np.floor(df["MonthlyCharges"])
        df["mc_dev_from_round10"] = np.abs(df["MonthlyCharges"] - df["mc_rounded_10"])
        df["mc_per_digit"] = df["MonthlyCharges"] / (df["mc_num_digits"] + 0.001)

        tc_str = df["TotalCharges"].astype(str).str.replace(".", "")
        df["tc_first_digit"] = tc_str.str[0].astype(int)
        df["tc_last_digit"] = tc_str.str[-1].astype(int)
        df["tc_second_digit"] = tc_str.apply(lambda x: int(x[1]) if len(x) > 1 else 0)
        df["tc_mod10"] = np.floor(df["TotalCharges"]) % 10
        df["tc_mod100"] = np.floor(df["TotalCharges"]) % 100
        df["tc_num_digits"] = np.floor(df["TotalCharges"]).astype(int).astype(str).str.len()
        df["tc_is_multiple_10"] = (np.floor(df["TotalCharges"]) % 10 == 0).astype("float32")
        df["tc_is_multiple_100"] = (np.floor(df["TotalCharges"]) % 100 == 0).astype("float32")
        df["tc_rounded_100"] = np.round(df["TotalCharges"] / 100) * 100
        df["tc_fractional"] = df["TotalCharges"] - np.floor(df["TotalCharges"])
        df["tc_dev_from_round100"] = np.abs(df["TotalCharges"] - df["tc_rounded_100"])
        df["tc_per_digit"] = df["TotalCharges"] / (df["tc_num_digits"] + 0.001)

    digit_features = [
        "tenure_first_digit", "tenure_last_digit", "tenure_second_digit",
        "tenure_mod10", "tenure_mod12", "tenure_num_digits",
        "tenure_is_multiple_10", "tenure_rounded_10", "tenure_dev_from_round10",
        "mc_first_digit", "mc_last_digit", "mc_second_digit",
        "mc_mod10", "mc_mod100", "mc_num_digits",
        "mc_is_multiple_10", "mc_is_multiple_50",
        "mc_rounded_10", "mc_fractional", "mc_dev_from_round10",
        "tc_first_digit", "tc_last_digit", "tc_second_digit",
        "tc_mod10", "tc_mod100", "tc_num_digits",
        "tc_is_multiple_10", "tc_is_multiple_100",
        "tc_rounded_100", "tc_fractional", "tc_dev_from_round100",
        "tenure_years", "tenure_months_in_year",
        "mc_per_digit", "tc_per_digit",
    ]
    new_nums += digit_features

def add_ngram_features(train, test, top_cats):
    bigram_cols = []
    trigram_cols = []
    for c1, c2 in combinations(top_cats, 2):
        col_name = f"BG_{c1}_{c2}"
        for df in [train, test]: df[col_name] = (df[c1].astype(str) + "_" + df[c2].astype(str)).astype("category")
        bigram_cols.append(col_name)

    for c1, c2, c3 in combinations(top_cats[:4], 3):
        col_name = f"TG_{c1}_{c2}_{c3}"
        for df in [train, test]: df[col_name] = (df[c1].astype(str) + "_" + df[c2].astype(str) + "_" + df[c3].astype(str)).astype("category")
        trigram_cols.append(col_name)

    return bigram_cols, trigram_cols

def do_feature_engineering(train, test, orig):
    NEW_NUMS = []
    NUM_AS_CAT = []
    
    add_frequency_encoding(train, test, orig, NUMS, NEW_NUMS)
    add_arithmetic_interactions([train, test, orig], NEW_NUMS)
    add_service_counts([train, test, orig], NEW_NUMS)
    add_orig_proba_features(train, test, orig, CATS + NUMS, CFG.TARGET, NEW_NUMS)
    add_distribution_features(train, test, orig, CFG.TARGET, NEW_NUMS)
    add_quantile_distance_features(train, test, orig, CFG.TARGET, NEW_NUMS)
    add_numericals_as_categories(train, test, NUMS, NUM_AS_CAT)
    add_digit_features([train, test], NEW_NUMS)
    BIGRAM_COLS, TRIGRAM_COLS = add_ngram_features(train, test, TOP_CATS_FOR_NGRAM)
    NGRAM_COLS = BIGRAM_COLS + TRIGRAM_COLS
    
    FEATURES = NUMS + CATS + NEW_NUMS + NUM_AS_CAT + NGRAM_COLS
    TE_COLUMNS = NUM_AS_CAT + CATS
    TE_NGRAM_COLUMNS = NGRAM_COLS
    TO_REMOVE = NUM_AS_CAT + CATS + NGRAM_COLS
    
    return FEATURES, TE_COLUMNS, TE_NGRAM_COLUMNS, TO_REMOVE, NUM_AS_CAT


def build_inference_bundle(orig: pd.DataFrame, sklearn_te, te_columns: list, feature_columns: list) -> dict:
    """
    Build a self-contained preprocessing bundle from training statistics.
    This is saved as an MLflow artifact so inference NEVER needs training data.

    The approach eliminates training-serving skew by ensuring the same statistics
    computed during training are reused identically at inference time.

    Args:
        orig: Full original dataset (train+test) used during feature engineering.
        sklearn_te: Fitted sklearn TargetEncoder object.
        te_columns: Columns the TargetEncoder was fitted on.
        feature_columns: The exact ordered list of columns fed to XGBoost.

    Returns:
        Dictionary with all reference statistics needed for inference-time FE.
    """
    churner_tc   = orig.loc[orig[CFG.TARGET] == 1, "TotalCharges"].values
    nonchurner_tc = orig.loc[orig[CFG.TARGET] == 0, "TotalCharges"].values
    orig_tc      = orig["TotalCharges"].values

    # Frequency tables (fitted on full dataset)
    freq_tables = {}
    for col in NUMS:
        freq = pd.concat([orig[col]]).value_counts(normalize=True)
        freq_tables[col] = freq.to_dict()

    # Target mean per group (ORIG_proba features)
    orig_proba_tables = {}
    for col in CATS + NUMS:
        tmp = orig.groupby(col)[CFG.TARGET].mean()
        orig_proba_tables[col] = tmp.to_dict()

    # MonthlyCharges mean by InternetService (for residual feature)
    is_mc_mean = orig.groupby("InternetService")["MonthlyCharges"].mean().to_dict()

    # Conditional pctrank reference arrays by InternetService and Contract
    cond_tc_by_is = {
        cat_val: orig.loc[orig["InternetService"] == cat_val, "TotalCharges"].values.tolist()
        for cat_val in orig["InternetService"].unique()
    }
    cond_tc_by_contract = {
        cat_val: orig.loc[orig["Contract"] == cat_val, "TotalCharges"].values.tolist()
        for cat_val in orig["Contract"].unique()
    }

    # Quantile values for churner/non-churner
    churner_quantiles   = {q: float(np.quantile(churner_tc, v))   for q, v in [("q25", 0.25), ("q50", 0.50), ("q75", 0.75)]}
    nonchurner_quantiles = {q: float(np.quantile(nonchurner_tc, v)) for q, v in [("q25", 0.25), ("q50", 0.50), ("q75", 0.75)]}

    bundle = {
        # Distribution reference arrays (kept as lists for JSON-serialisability via pickle)
        "churner_tc":        churner_tc.tolist(),
        "nonchurner_tc":     nonchurner_tc.tolist(),
        "orig_tc":           orig_tc.tolist(),
        # Lookup tables
        "freq_tables":       freq_tables,
        "orig_proba_tables": orig_proba_tables,
        "is_mc_mean":        is_mc_mean,
        "cond_tc_by_is":     cond_tc_by_is,
        "cond_tc_by_contract": cond_tc_by_contract,
        # Scalar quantiles
        "churner_quantiles":    churner_quantiles,
        "nonchurner_quantiles": nonchurner_quantiles,
        # Sklearn TargetEncoder (fitted object)
        "sklearn_te":        sklearn_te,
        "te_columns":        te_columns,
        # XGBoost feature column order (critical for correct prediction)
        "feature_columns":   feature_columns,
        # Metadata
        "cats":              CATS,
        "nums":              NUMS,
        "top_cats_for_ngram": TOP_CATS_FOR_NGRAM,
    }
    return bundle

# -- XGBoost Helpers --
from xgb_worker import (
    apply_inner_kfold_te_stats,
    apply_fullset_te_stats,
    apply_inner_kfold_ngram_te,
    apply_fullset_ngram_te,
    apply_sklearn_te,
    prepare_for_xgboost
)

def train_fold_mlflow(fold_idx, dataset_path, tracking_uri, experiment_name):
    # 1. Load Data
    train_df, test_df, orig_df = load_datasets(dataset_path)
    
    # 2. Feature Engineering
    FEATURES, TE_COLUMNS, TE_NGRAM_COLUMNS, TO_REMOVE, NUM_AS_CAT = do_feature_engineering(train_df, test_df, orig_df)
    
    # 3. Setup Fold Splits
    np.random.seed(CFG.RANDOM_SEED)
    skf_outer = StratifiedKFold(n_splits=CFG.N_FOLDS, shuffle=True, random_state=CFG.RANDOM_SEED)
    
    splits = list(skf_outer.split(train_df, train_df[CFG.TARGET]))
    train_idx, val_idx = splits[fold_idx]
    
    # 4. Slice outer fold
    X_tr  = train_df.loc[train_idx, FEATURES + [CFG.TARGET]].reset_index(drop=True).copy()
    y_tr  = train_df.loc[train_idx, CFG.TARGET].values
    X_val = train_df.loc[val_idx, FEATURES].reset_index(drop=True).copy()
    y_val = train_df.loc[val_idx, CFG.TARGET].values
    X_te  = test_df[FEATURES].reset_index(drop=True).copy()

    # 5. Target Encoding
    apply_inner_kfold_te_stats(X_tr, y_tr, TE_COLUMNS, STATS, CFG.INNER_FOLDS, CFG.RANDOM_SEED, CFG.TARGET)
    apply_fullset_te_stats(X_tr, X_val, X_te, TE_COLUMNS, STATS, CFG.TARGET)
    
    apply_inner_kfold_ngram_te(X_tr, y_tr, TE_NGRAM_COLUMNS, CFG.INNER_FOLDS, CFG.RANDOM_SEED, CFG.TARGET)
    apply_fullset_ngram_te(X_tr, X_val, X_te, TE_NGRAM_COLUMNS, CFG.TARGET)
    
    fitted_sklearn_te = apply_sklearn_te(X_tr, y_tr, X_val, X_te, TE_COLUMNS, CFG.INNER_FOLDS, CFG.RANDOM_SEED)

    # 6. Prepare DataFrames for XGBoost
    X_tr, X_val, X_te, cols_xgb = prepare_for_xgboost(
        X_tr, X_val, X_te, CATS, NUM_AS_CAT, TO_REMOVE, CFG.TARGET
    )

    # 7. Setup MLflow
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)
    
    with mlflow.start_run(run_name=f"fold_{fold_idx}") as run:
        # Log parameters
        mlflow.log_params(XGB_PARAMS)
        mlflow.log_param("fold_idx", fold_idx)
        mlflow.log_param("inner_folds", CFG.INNER_FOLDS)
        mlflow.log_param("random_seed", CFG.RANDOM_SEED)
        mlflow.log_param("dataset_path", dataset_path)

        # Train XGBoost
        # Airflow environment usually doesn't have multiple GPUs, use cpu
        fold_params = {**XGB_PARAMS, "device": "cpu", "tree_method": "hist"}
        model = xgb.XGBClassifier(**fold_params)
        
        t0 = time.time()
        model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
        elapsed = (time.time() - t0) / 60

        # Predictions & Metrics
        oof_preds = model.predict_proba(X_val)[:, 1]
        oof_binary = (oof_preds >= 0.5).astype(int)

        fold_auc       = roc_auc_score(y_val, oof_preds)
        fold_precision = precision_score(y_val, oof_binary, zero_division=0)
        fold_recall    = recall_score(y_val, oof_binary, zero_division=0)
        fold_f1        = f1_score(y_val, oof_binary, zero_division=0)

        mlflow.log_metric("val_auc",       fold_auc)
        mlflow.log_metric("val_precision", fold_precision)
        mlflow.log_metric("val_recall",    fold_recall)
        mlflow.log_metric("val_f1",        fold_f1)
        mlflow.log_metric("elapsed_min",   elapsed)

        print(
            f"Fold {fold_idx} | AUC: {fold_auc:.4f} | "
            f"Precision: {fold_precision:.4f} | Recall: {fold_recall:.4f} | "
            f"F1: {fold_f1:.4f} | Elapsed: {elapsed:.1f} min"
        )

        # Log classification report as text artifact
        report = classification_report(y_val, oof_binary, target_names=["No Churn", "Churn"])
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp_txt:
            tmp_txt.write(f"Fold {fold_idx} – Classification Report\n")
            tmp_txt.write("=" * 50 + "\n")
            tmp_txt.write(report)
            tmp_txt_path = tmp_txt.name
        mlflow.log_artifact(tmp_txt_path, artifact_path="evaluation")
        os.unlink(tmp_txt_path)

        # Feature Importance – top 30 features chart
        importances = model.feature_importances_
        feature_names = np.array(cols_xgb)
        sorted_idx = np.argsort(importances)[-30:]
        top_features = feature_names[sorted_idx]
        top_importance = importances[sorted_idx]

        # --- Chart PNG ---
        fig, ax = plt.subplots(figsize=(10, 9))
        colors = ['#6366f1' if imp >= np.percentile(top_importance, 75)
                  else '#a5b4fc' for imp in top_importance]
        bars = ax.barh(top_features, top_importance, color=colors, edgecolor='white', height=0.7)
        ax.set_title(
            f"Feature Importance – Fold {fold_idx}  "
            f"(AUC={fold_auc:.4f} | F1={fold_f1:.4f})",
            fontsize=13, fontweight='bold', pad=12
        )
        ax.set_xlabel("Importance Score (gain)", fontsize=11)
        ax.axvline(x=np.mean(top_importance), color='#f59e0b', linestyle='--',
                   linewidth=1.5, label=f'Mean={np.mean(top_importance):.4f}')
        ax.legend(fontsize=10)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.tick_params(axis='y', labelsize=9)
        plt.tight_layout()

        # Save to a fixed name file then log
        png_path = "feature_importance.png"
        fig.savefig(png_path, dpi=150, bbox_inches='tight')
        mlflow.log_artifact(png_path, artifact_path="feature_importance")
        plt.close(fig)
        if os.path.exists(png_path): os.unlink(png_path)

        # --- JSON (all features, sorted descending) ---
        all_sorted_idx = np.argsort(importances)[::-1]
        fi_data = {
            "fold": fold_idx,
            "features": [
                {"feature": feature_names[i], "importance": round(float(importances[i]), 6)}
                for i in all_sorted_idx
            ]
        }
        # mlflow.log_dict logs a dictionary as a JSON file with a specified path
        mlflow.log_dict(fi_data, "feature_importance/feature_importance.json")

        print(f"Top feature: {feature_names[all_sorted_idx[0]]} = {importances[all_sorted_idx[0]]:.6f}")

        # Save model & register
        registered_model_name = "RetainAI_XGBoost_Churn"
        mlflow.xgboost.log_model(
            model,
            artifact_path="model",
            registered_model_name=registered_model_name
        )

        # Set Alias "pending" + tags for the newly created model version
        client = MlflowClient()
        latest_versions = client.get_latest_versions(registered_model_name, stages=["None"])
        if latest_versions:
            latest_version = max([int(v.version) for v in latest_versions])
            client.set_registered_model_alias(registered_model_name, "pending", str(latest_version))
            # Tag model type and fold info for display in Model Registry UI
            client.set_model_version_tag(registered_model_name, str(latest_version), "model_type", "XGBoost")
            client.set_model_version_tag(registered_model_name, str(latest_version), "fold_idx", str(fold_idx))
            print(f"Registered model {registered_model_name} version {latest_version} with alias 'pending'")

        # ── Build & log inference preprocessing bundle ─────────────────────
        # This bundle allows inference to replicate all feature engineering
        # exactly WITHOUT ever loading the training dataset at serving time.
        import pickle
        bundle = build_inference_bundle(
            orig=orig_df,
            sklearn_te=fitted_sklearn_te,
            te_columns=TE_COLUMNS,
            feature_columns=cols_xgb,
        )
        bundle_path = "inference_bundle.pkl"
        with open(bundle_path, "wb") as f:
            pickle.dump(bundle, f)
        mlflow.log_artifact(bundle_path, artifact_path="preprocessing")
        os.unlink(bundle_path)
        print(f"Saved inference_bundle.pkl with {len(bundle['feature_columns'])} features")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="XGBoost Airflow Training Script")
    parser.add_argument("--fold", type=int, required=True, help="Fold index to train (0-19)")
    parser.add_argument("--dataset_path", type=str, required=True, help="Path to uploaded dataset CSV")
    parser.add_argument("--tracking_uri", type=str, default="http://localhost:5000", help="MLflow Tracking URI")
    parser.add_argument("--experiment_name", type=str, default="XGBoost_Churn_Pipeline", help="MLflow Experiment Name")
    args = parser.parse_args()
    
    train_fold_mlflow(args.fold, args.dataset_path, args.tracking_uri, args.experiment_name)
