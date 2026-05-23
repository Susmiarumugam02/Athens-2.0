from __future__ import annotations

import json
from pathlib import Path

import joblib

from config import settings


def model_path(model_type: str, tenant_id: int) -> Path:
    return settings.model_dir / f"{model_type}_tenant_{tenant_id}.joblib"


def meta_path(model_type: str, tenant_id: int) -> Path:
    return settings.model_dir / f"{model_type}_tenant_{tenant_id}.json"


def save_model(model_type: str, tenant_id: int, model, metadata: dict) -> None:
    joblib.dump(model, model_path(model_type, tenant_id))
    meta_path(model_type, tenant_id).write_text(json.dumps(metadata, indent=2))


def load_model(model_type: str, tenant_id: int):
    path = model_path(model_type, tenant_id)
    if not path.exists():
        return None
    return joblib.load(path)
