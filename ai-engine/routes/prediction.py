from fastapi import APIRouter, HTTPException

from models.schemas import IncidentPredictionRequest, IncidentPredictionResponse
from prediction.engine import predict_incident

router = APIRouter()


@router.post("/incident", response_model=IncidentPredictionResponse)
def incident_prediction(payload: IncidentPredictionRequest):
    try:
        return predict_incident(payload.tenant_id, payload.features)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
