from __future__ import annotations

import numpy as np

from services.feature_extraction import features_from_payload
from services.model_registry import load_model
from services.recommendation_service import predicted_incident, recommended_actions, risk_level


def predict_incident(tenant_id: int, features: dict) -> dict:
    model = load_model("incident_predictor", tenant_id)
    vector = np.array([features_from_payload(features)], dtype=np.float32)
    if not model:
        raise FileNotFoundError("incident_predictor model is not trained for this tenant")

    probability = float(model.predict_proba(vector)[0][1])
    score = round(probability * 100, 2)
    level = risk_level(score)
    return {
        "risk_level": level,
        "incident_probability": score,
        "risk_score": score,
        "predicted_incident": predicted_incident(features),
        "recommended_actions": recommended_actions(features, level),
        "model_source": "ml_model",
        "confidence": round(max(probability, 1 - probability), 3),
    }
