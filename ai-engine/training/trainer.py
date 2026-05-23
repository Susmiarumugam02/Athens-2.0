from __future__ import annotations

from datetime import datetime, timezone

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from config import settings
from services.feature_extraction import INCIDENT_FEATURES, build_incident_dataset
from services.model_registry import save_model


def train_incident_model(tenant_id: int, project_id: int | None = None) -> dict:
    dataset = build_incident_dataset(tenant_id, project_id)
    if len(dataset) < settings.min_training_samples:
        return {
            "status": "insufficient_data",
            "training_samples": len(dataset),
            "required_samples": settings.min_training_samples,
        }

    X = dataset[INCIDENT_FEATURES].to_numpy(dtype=np.float32)
    y = dataset["label"].to_numpy(dtype=np.int32)
    if len(set(y.tolist())) < 2:
        return {"status": "insufficient_class_variance", "training_samples": len(dataset)}

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    model_family = "xgboost"
    try:
        from xgboost import XGBClassifier
        classifier = XGBClassifier(
            n_estimators=180,
            max_depth=5,
            learning_rate=0.06,
            subsample=0.9,
            colsample_bytree=0.9,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        )
    except Exception:
        classifier = RandomForestClassifier(
            n_estimators=160,
            max_depth=8,
            class_weight="balanced",
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        )
        model_family = "random_forest"

    pipeline = Pipeline([("scaler", StandardScaler()), ("clf", classifier)])
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    metrics = {
        "status": "success",
        "model_family": model_family,
        "training_samples": len(dataset),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_prob)) if len(set(y_test.tolist())) > 1 else 0.5,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": INCIDENT_FEATURES,
    }
    save_model("incident_predictor", tenant_id, pipeline, metrics)
    return metrics
