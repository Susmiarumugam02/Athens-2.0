from fastapi import APIRouter

from models.schemas import TrainingRequest
from training.trainer import train_incident_model

router = APIRouter()


@router.post("/incident")
def train_incident(payload: TrainingRequest):
    return train_incident_model(payload.tenant_id, payload.project_id)
