import time
import gc
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import TargetEncoder

def apply_inner_kfold_te_stats(
    X_tr: pd.DataFrame, y_tr: np.ndarray, te_columns: list,
    stats: list, inner_folds: int, random_seed: int, target_col: str
) -> None:
    skf_inner = StratifiedKFold(n_splits=inner_folds, shuffle=True, random_state=random_seed)
    for in_tr, in_va in skf_inner.split(X_tr, y_tr):
        X_tr2 = X_tr.loc[in_tr, te_columns + [target_col]].copy()
        X_va2 = X_tr.loc[in_va, te_columns].copy()
        for col in te_columns:
            tmp = X_tr2.groupby(col, observed=False)[target_col].agg(stats)
            tmp.columns = [f"TE1_{col}_{s}" for s in stats]
            X_va2 = X_va2.merge(tmp, on=col, how="left")
            for c in tmp.columns:
                X_tr.loc[in_va, c] = X_va2[c].values.astype("float32")


def apply_fullset_te_stats(
    X_tr: pd.DataFrame, X_val: pd.DataFrame, X_te: pd.DataFrame,
    te_columns: list, stats: list, target_col: str
) -> None:
    for col in te_columns:
        tmp = X_tr.groupby(col, observed=False)[target_col].agg(stats)
        tmp.columns = [f"TE1_{col}_{s}" for s in stats]
        tmp = tmp.astype("float32")
        for df in [X_val, X_te]:
            merged = df[[col]].merge(tmp, on=col, how="left")
            for c in tmp.columns:
                df[c] = merged[c].fillna(0).values
        for c in tmp.columns:
            X_tr[c] = X_tr[c].fillna(0)


def apply_inner_kfold_ngram_te(
    X_tr: pd.DataFrame, y_tr: np.ndarray, ngram_cols: list,
    inner_folds: int, random_seed: int, target_col: str
) -> None:
    skf_inner = StratifiedKFold(n_splits=inner_folds, shuffle=True, random_state=random_seed)
    for in_tr, in_va in skf_inner.split(X_tr, y_tr):
        X_tr2 = X_tr.loc[in_tr].copy()
        X_va2 = X_tr.loc[in_va].copy()
        for col in ngram_cols:
            ng_te  = X_tr2.groupby(col, observed=False)[target_col].mean()
            ng_name = f"TE_ng_{col}"
            mapped = X_va2[col].astype(str).map(ng_te)
            X_tr.loc[in_va, ng_name] = pd.to_numeric(mapped, errors="coerce").fillna(0.5).astype("float32").values


def apply_fullset_ngram_te(
    X_tr: pd.DataFrame, X_val: pd.DataFrame, X_te: pd.DataFrame,
    ngram_cols: list, target_col: str
) -> None:
    for col in ngram_cols:
        ng_te   = X_tr.groupby(col, observed=False)[target_col].mean()
        ng_name = f"TE_ng_{col}"
        X_val[ng_name] = pd.to_numeric(X_val[col].astype(str).map(ng_te), errors="coerce").fillna(0.5).astype("float32")
        X_te[ng_name]  = pd.to_numeric(X_te[col].astype(str).map(ng_te),  errors="coerce").fillna(0.5).astype("float32")
        if ng_name in X_tr.columns:
            X_tr[ng_name] = pd.to_numeric(X_tr[ng_name], errors="coerce").fillna(0.5).astype("float32")
        else:
            X_tr[ng_name] = 0.5


def apply_sklearn_te(
    X_tr: pd.DataFrame, y_tr: np.ndarray, X_val: pd.DataFrame,
    X_te: pd.DataFrame, te_columns: list, inner_folds: int, random_seed: int
) -> TargetEncoder:
    """Fits a TargetEncoder and transforms train/val/test sets.
    Returns the fitted encoder so it can be saved for inference-time use."""
    te_mean_cols = [f"TE_{col}" for col in te_columns]
    te = TargetEncoder(
        cv=inner_folds, shuffle=True, smooth="auto",
        target_type="binary", random_state=random_seed,
    )
    X_tr[te_mean_cols]  = te.fit_transform(X_tr[te_columns], y_tr)
    X_val[te_mean_cols] = te.transform(X_val[te_columns])
    X_te[te_mean_cols]  = te.transform(X_te[te_columns])
    return te  # Return fitted encoder for inference bundle



def prepare_for_xgboost(
    X_tr: pd.DataFrame, X_val: pd.DataFrame, X_te: pd.DataFrame,
    cats: list, num_as_cat: list, to_remove: list, target: str
) -> tuple:
    for df in [X_tr, X_val, X_te]:
        for c in cats + num_as_cat:
            if c in df.columns:
                df[c] = df[c].astype(str).astype("category")
        df.drop(columns=[c for c in to_remove if c in df.columns], inplace=True, errors="ignore")
    X_tr.drop(columns=[target], inplace=True, errors="ignore")
    return X_tr, X_val, X_te, list(X_tr.columns)


def process_fold(
    fold_idx, train_idx, val_idx, train_df, test_df, 
    cfg_dict, FEATURES, TE_COLUMNS, STATS, TE_NGRAM_COLUMNS, 
    CATS, NUM_AS_CAT, TO_REMOVE, XGB_PARAMS
):
    gpu_id = fold_idx % 2  
    t0_fold = time.time()

    # -- Slice outer fold --
    X_tr  = train_df.loc[train_idx, FEATURES + [cfg_dict['TARGET']]].reset_index(drop=True).copy()
    y_tr  = train_df.loc[train_idx, cfg_dict['TARGET']].values
    X_val = train_df.loc[val_idx, FEATURES].reset_index(drop=True).copy()
    y_val = train_df.loc[val_idx, cfg_dict['TARGET']].values
    X_te  = test_df[FEATURES].reset_index(drop=True).copy()

    # -- Target Encoding --
    apply_inner_kfold_te_stats(X_tr, y_tr, TE_COLUMNS, STATS, cfg_dict['INNER_FOLDS'], cfg_dict['RANDOM_SEED'], cfg_dict['TARGET'])
    apply_fullset_te_stats(X_tr, X_val, X_te, TE_COLUMNS, STATS, cfg_dict['TARGET'])
    
    apply_inner_kfold_ngram_te(X_tr, y_tr, TE_NGRAM_COLUMNS, cfg_dict['INNER_FOLDS'], cfg_dict['RANDOM_SEED'], cfg_dict['TARGET'])
    apply_fullset_ngram_te(X_tr, X_val, X_te, TE_NGRAM_COLUMNS, cfg_dict['TARGET'])
    
    apply_sklearn_te(X_tr, y_tr, X_val, X_te, TE_COLUMNS, cfg_dict['INNER_FOLDS'], cfg_dict['RANDOM_SEED'])

    # -- Prepare DataFrames for XGBoost --
    X_tr, X_val, X_te, cols_xgb = prepare_for_xgboost(
        X_tr, X_val, X_te, CATS, NUM_AS_CAT, TO_REMOVE, cfg_dict['TARGET']
    )

    # -- Train XGBoost --
    fold_params = {**XGB_PARAMS, "device": f"cuda:{gpu_id}"}
    model = xgb.XGBClassifier(**fold_params)
    
    model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)

    # -- Predictions & Importance --
    oof_preds = model.predict_proba(X_val)[:, 1]
    test_preds = model.predict_proba(X_te[cols_xgb])[:, 1]
    fold_auc = roc_auc_score(y_val, oof_preds)
    
    fold_imp = pd.DataFrame({
        "feature": cols_xgb, 
        f"importance_fold_{fold_idx + 1}": model.feature_importances_
    })
    
    model_filename = f"xgboost_fold_{fold_idx}.json"
    model.save_model(model_filename)
    print(f"Đã lưu model fold {fold_idx} vào {model_filename}")

    elapsed = (time.time() - t0_fold) / 60

    del X_tr, X_val, X_te, y_tr, y_val, model
    gc.collect()

    return fold_idx, val_idx, oof_preds, test_preds, fold_auc, fold_imp, elapsed
