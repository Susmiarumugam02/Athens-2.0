from pydantic import BaseModel, Field


class IncidentPredictionRequest(BaseModel):
    tenant_id: int
    project_id: int | None = None
    permit_id: int | None = None
    features: dict[str, float | int | str | None] = Field(default_factory=dict)


class IncidentPredictionResponse(BaseModel):
    risk_level: str
    incident_probability: float
    risk_score: float
    predicted_incident: str
    recommended_actions: list[str]
    model_source: str
    confidence: float


class TrainingRequest(BaseModel):
    tenant_id: int
    model_type: str = "incident_predictor"
    project_id: int | None = None
