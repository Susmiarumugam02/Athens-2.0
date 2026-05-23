from __future__ import annotations

import pandas as pd

from services.database import read_sql

INCIDENT_FEATURES = [
    "probability", "severity", "risk_score", "is_hot_work", "is_confined_space",
    "is_height_work", "is_electrical", "is_excavation", "requires_gas_testing",
    "requires_isolation", "worker_count", "duration_hours", "is_night_work",
    "simultaneous_permits_same_location", "checklist_completion_pct", "ppe_count",
]


def build_incident_dataset(tenant_id: int, project_id: int | None = None) -> pd.DataFrame:
    project_clause = "AND p.project_id = ?" if project_id else ""
    params: tuple = (tenant_id, project_id) if project_id else (tenant_id,)
    permits = read_sql(
        f"""
        SELECT
            p.id AS permit_id,
            p.project_id,
            p.probability,
            p.severity,
            p.risk_score,
            p.requires_isolation,
            p.work_nature,
            p.location,
            p.created_at,
            p.planned_start_time,
            p.planned_end_time,
            pt.category AS permit_category,
            pt.requires_gas_testing,
            p.ppe_requirements,
            p.safety_checklist
        FROM ptw_permit p
        JOIN authentication_project pr ON pr.id = p.project_id
        JOIN ptw_permittype pt ON pt.id = p.permit_type_id
        WHERE pr.athens_tenant_id = ?
        {project_clause}
        """,
        params,
    )
    if permits.empty:
        return pd.DataFrame(columns=INCIDENT_FEATURES + ["label"])

    permits["is_hot_work"] = (permits["permit_category"] == "hot_work").astype(int)
    permits["is_confined_space"] = (permits["permit_category"] == "confined_space").astype(int)
    permits["is_height_work"] = (permits["permit_category"] == "height").astype(int)
    permits["is_electrical"] = (permits["permit_category"] == "electrical").astype(int)
    permits["is_excavation"] = (permits["permit_category"] == "excavation").astype(int)
    permits["is_night_work"] = (permits["work_nature"] == "night").astype(int)
    permits["duration_hours"] = (
        pd.to_datetime(permits["planned_end_time"]) - pd.to_datetime(permits["planned_start_time"])
    ).dt.total_seconds().fillna(0) / 3600
    permits["worker_count"] = 0
    permits["simultaneous_permits_same_location"] = 0
    permits["checklist_completion_pct"] = 0
    permits["ppe_count"] = permits["ppe_requirements"].fillna("[]").astype(str).str.count(",") + 1

    incident_params: tuple = (tenant_id,)
    incidents = read_sql(
        """
        SELECT i.project_id, i.location, i.date_time_incident
        FROM incidentmanagement_incident i
        JOIN authentication_project pr ON pr.id = i.project_id
        WHERE pr.athens_tenant_id = ?
        """,
        incident_params,
    )
    permits["label"] = 0
    if not incidents.empty:
        for idx, permit in permits.iterrows():
            created_at = pd.to_datetime(permit["created_at"])
            window = incidents[
                (incidents["project_id"] == permit["project_id"]) &
                (pd.to_datetime(incidents["date_time_incident"]) >= created_at) &
                (pd.to_datetime(incidents["date_time_incident"]) <= created_at + pd.Timedelta(days=7))
            ]
            permits.at[idx, "label"] = int(not window.empty)
    return permits[INCIDENT_FEATURES + ["label"]].fillna(0)


def features_from_payload(payload: dict) -> list[float]:
    return [float(payload.get(name, 0) or 0) for name in INCIDENT_FEATURES]
