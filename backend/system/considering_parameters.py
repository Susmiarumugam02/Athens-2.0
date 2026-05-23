"""
considering_parameters.py
Backend logic for the Considering Parameters + Auto-Fill system.
Provides parameter options, auto-fill derivation, and smart recommendations.
"""
from __future__ import annotations
from typing import Any

# ─── Static parameter options ─────────────────────────────────────────────────

STATIC_OPTIONS: dict[str, list[str]] = {
    "departments": [
        "Electrical", "Civil", "Mechanical", "Operations", "Quality",
        "HSE", "Stores", "Maintenance", "Construction", "Chemical",
    ],
    "work_areas": [
        "Electrical Room", "Main Walkway", "Stores Area", "Switchyard",
        "Panel Room", "Work at Height Platform", "Material Storage Yard",
        "Workshop", "Pump Room", "Substation Area", "Control Room", "Site Office",
    ],
    "sites": [
        "Chennai Plant", "Mumbai Site", "Delhi Office",
        "Bangalore Facility", "Hyderabad Plant",
    ],
    "zones": ["Zone A", "Zone B", "Zone C", "Zone D", "Restricted Zone", "Safe Zone"],
    "contractors": [
        "Athena Constructions Pvt Ltd", "ABC Engineering Services",
        "Sri Balaji Contractors", "TechBuild Infra Pvt Ltd",
        "Global Industrial Solutions",
    ],
    "process_types": [
        "Maintenance", "Construction", "Inspection", "Testing",
        "Commissioning", "Decommissioning", "Shutdown",
    ],
    "risk_categories": ["Low", "Medium", "High", "Critical"],
    "shifts": ["Day Shift", "Night Shift", "General Shift", "Rotational"],
    "assets": [
        "Transformer", "Generator", "Pump", "Compressor",
        "Crane", "Forklift", "Conveyor", "Boiler", "Reactor", "Tank",
    ],
    "work_types": [
        "Hot Work", "Cold Work", "Confined Space", "Work at Height",
        "Electrical Work", "Excavation", "Chemical Handling", "Crane Lifting",
    ],
    "inspection_types": [
        "Safety Inspection", "Quality Inspection", "Electrical Inspection",
        "Mechanical Inspection", "Fire Safety Inspection", "Environmental Inspection",
    ],
    "incident_types": [
        "Near Miss", "First Aid", "Medical Treatment", "Lost Time Injury",
        "Fire", "Spill", "Equipment Damage",
    ],
    "activity_categories": [
        "Routine Maintenance", "Breakdown Maintenance", "Preventive Maintenance",
        "Project Work", "Commissioning", "Testing",
    ],
    "training_types": [
        "Induction Training", "Safety Training", "PTW Training",
        "Toolbox Talk", "Job Training", "Emergency Response", "First Aid",
    ],
}

# ─── Department → auto-fill rules ────────────────────────────────────────────

DEPT_RULES: dict[str, dict[str, Any]] = {
    "Electrical": {
        "ppe_requirements": ["Insulated gloves", "Arc flash suit", "Safety helmet", "Safety shoes"],
        "safety_rules": ["Apply LOTO before work", "Verify de-energisation", "Use insulated tools"],
        "risk_level": "High",
        "inspection_template": "Electrical Safety Checklist",
        "hazards": ["Electrical shock", "Arc flash", "Live equipment"],
    },
    "Civil": {
        "ppe_requirements": ["Safety helmet", "Safety harness", "Safety shoes", "High-vis vest"],
        "safety_rules": ["Inspect scaffold before use", "Barricade excavation", "Verify fall protection"],
        "risk_level": "High",
        "inspection_template": "Civil Works Checklist",
        "hazards": ["Fall from height", "Falling objects", "Excavation collapse"],
    },
    "Mechanical": {
        "ppe_requirements": ["Safety helmet", "Safety gloves", "Safety shoes", "Goggles"],
        "safety_rules": ["LOTO for rotating equipment", "Verify pressure relief", "Inspect tools"],
        "risk_level": "Medium",
        "inspection_template": "Mechanical Maintenance Checklist",
        "hazards": ["Caught in machinery", "Stored energy", "Pressure hazard"],
    },
    "Chemical": {
        "ppe_requirements": ["Chemical-resistant gloves", "Face shield", "Respirator", "Chemical suit"],
        "safety_rules": ["Review SDS before handling", "Ensure ventilation", "Prepare spill kit"],
        "risk_level": "High",
        "inspection_template": "Chemical Handling Checklist",
        "hazards": ["Chemical exposure", "Toxic fumes", "Spill/leakage"],
    },
    "Operations": {
        "ppe_requirements": ["Safety helmet", "Safety shoes", "High-vis vest"],
        "safety_rules": ["Follow SOP", "Verify process parameters", "Report deviations"],
        "risk_level": "Medium",
        "inspection_template": "Operations Checklist",
        "hazards": ["Process deviation", "Equipment failure"],
    },
}

# ─── Work type → checklist rules ─────────────────────────────────────────────

WORK_TYPE_CHECKLISTS: dict[str, list[str]] = {
    "Hot Work": [
        "Fire watch assigned and trained",
        "Combustible materials removed 35ft radius",
        "Fire extinguisher readily available",
        "Hot work permit displayed at location",
        "Atmospheric testing completed",
        "Ventilation adequate for fume removal",
    ],
    "Confined Space": [
        "Atmospheric testing completed (O2, LEL, H2S, CO)",
        "Continuous gas monitoring in place",
        "Mechanical ventilation operating",
        "Entry supervisor assigned and present",
        "Rescue team on standby",
        "Communication system established",
        "Emergency evacuation plan reviewed",
    ],
    "Work at Height": [
        "Fall protection system in place",
        "Guardrails installed where required",
        "Weather conditions acceptable",
        "Rescue plan established",
        "Exclusion zone established below",
        "Equipment inspected by competent person",
    ],
    "Electrical Work": [
        "Electrical isolation completed and verified",
        "LOTO procedures implemented",
        "Qualified electrician assigned",
        "Arc flash analysis completed",
        "Appropriate PPE worn",
        "Insulated tools used",
    ],
    "Excavation": [
        "Underground utilities located and marked",
        "Soil conditions assessed",
        "Proper sloping or shoring in place",
        "Safe entry/exit provided",
        "Competent person assigned",
    ],
    "Chemical Handling": [
        "SDS reviewed for all chemicals",
        "Chemical compatibility verified",
        "Spill response kit available",
        "Emergency shower/eyewash accessible",
        "Proper ventilation provided",
    ],
    "Crane Lifting": [
        "Crane operator certified and current",
        "Crane inspection completed",
        "Lift plan prepared and reviewed",
        "Load weight verified",
        "Rigging equipment inspected",
        "Exclusion zone established",
    ],
}

# ─── Risk category → severity/score mapping ──────────────────────────────────

RISK_MAPPING: dict[str, dict[str, Any]] = {
    "Critical": {
        "risk_score": 90,
        "severity": "critical",
        "corrective_action": (
            "Stop work immediately, isolate hazard, notify safety officer, "
            "conduct emergency risk assessment before resuming."
        ),
    },
    "High": {
        "risk_score": 70,
        "severity": "high",
        "corrective_action": (
            "Implement additional controls, ensure supervisor is present, "
            "review risk assessment before next shift."
        ),
    },
    "Medium": {
        "risk_score": 45,
        "severity": "medium",
        "corrective_action": "Monitor closely, apply standard controls, review at end of shift.",
    },
    "Low": {
        "risk_score": 15,
        "severity": "low",
        "corrective_action": "Apply routine controls and document observation.",
    },
}


def get_parameter_options(user: Any, module: str) -> dict[str, list[str]]:
    """
    Return parameter options, optionally enriched from the database.
    Falls back to static options if DB queries fail.
    """
    options = dict(STATIC_OPTIONS)

    try:
        # Enrich contractors from workforce models
        from workforce.models import ContractorUser
        company_id = getattr(user, "company_id", None)
        if company_id:
            contractors = (
                ContractorUser.objects
                .filter(company_id=company_id)
                .values_list("company_name", flat=True)
                .distinct()
            )
            db_contractors = [c for c in contractors if c]
            if db_contractors:
                options["contractors"] = db_contractors
    except Exception:
        pass

    try:
        # Enrich departments from authentication models
        from authentication.models import CompanyUser
        company_id = getattr(user, "company_id", None)
        if company_id:
            depts = (
                CompanyUser.objects
                .filter(company_id=company_id)
                .exclude(department__isnull=True)
                .exclude(department="")
                .values_list("department", flat=True)
                .distinct()
            )
            db_depts = list(set(depts))
            if db_depts:
                options["departments"] = db_depts
    except Exception:
        pass

    return options


def derive_autofill(parameters: dict, module: str, user: Any) -> dict[str, Any]:
    """
    Derive auto-fill field values from selected parameters.
    Returns a dict of field_name → value ready to apply to any form.
    """
    result: dict[str, Any] = {}

    dept = parameters.get("department")
    work_type = parameters.get("work_type")
    risk_category = parameters.get("risk_category")
    work_area = parameters.get("work_area")
    contractor = parameters.get("contractor")
    shift = parameters.get("shift")
    site = parameters.get("site")

    # Department-based auto-fill
    if dept and dept in DEPT_RULES:
        result.update(DEPT_RULES[dept])

    # Work type → checklist
    if work_type and work_type in WORK_TYPE_CHECKLISTS:
        result["checklist"] = WORK_TYPE_CHECKLISTS[work_type]
        # Merge PPE for hot work
        if work_type == "Hot Work":
            existing_ppe = result.get("ppe_requirements", [])
            result["ppe_requirements"] = list(set(existing_ppe + ["Fire-resistant coveralls", "Welding shield"]))

    # Risk category → severity/score
    if risk_category and risk_category in RISK_MAPPING:
        result.update(RISK_MAPPING[risk_category])

    # Pass-through parameters as direct field values
    if work_area:
        result["work_area"] = work_area
        result["location"] = work_area
    if contractor:
        result["contractor"] = contractor
    if shift:
        result["shift"] = shift
    if site:
        result["site"] = site
    if dept:
        result["department"] = dept

    return result


def get_smart_recommendations(
    module: str,
    parameters: dict,
    context_text: str,
    user: Any,
) -> dict[str, Any]:
    """
    Return smart recommendations: AI notes, similar records, risk alerts.
    """
    ai_notes = _derive_notes(parameters, module)
    similar_records = _find_similar_records(module, parameters, context_text, user)

    return {
        "ai_notes": ai_notes,
        "similar_records": similar_records,
    }


def _derive_notes(parameters: dict, module: str) -> list[str]:
    notes: list[str] = []
    risk = parameters.get("risk_category")
    work_type = parameters.get("work_type")
    dept = parameters.get("department")

    if risk == "Critical":
        notes.append("CRITICAL RISK: Stop work immediately and notify the safety officer.")
        notes.append("Conduct emergency risk assessment before any work resumes.")
    elif risk == "High":
        notes.append("HIGH RISK: Ensure all controls are in place before starting work.")
        notes.append("Supervisor must be present during the entire operation.")

    if work_type == "Hot Work":
        notes.append("Verify hot work permit is valid and displayed at the work location.")
        notes.append("Assign a dedicated fire watch for the duration of hot work.")
    elif work_type == "Confined Space":
        notes.append("Conduct atmospheric testing before entry. O2: 19.5–23.5%, LEL < 10%.")
        notes.append("Rescue team must be on standby before confined space entry.")
    elif work_type == "Work at Height":
        notes.append("Inspect fall protection equipment before use.")
        notes.append("Establish exclusion zone below the work area.")

    if dept == "Electrical":
        notes.append("Apply LOTO procedure before any electrical work begins.")
        notes.append("Verify de-energisation with an approved voltage tester.")

    if module == "incident" and risk in ("High", "Critical"):
        notes.append("Notify regulatory authority within 24 hours for serious incidents.")
        notes.append("Preserve the incident scene for investigation.")

    if not notes:
        notes.append("Review applicable SOPs and risk assessments before starting work.")
        notes.append("Ensure all personnel are briefed on the hazards and controls.")

    return notes


def _find_similar_records(
    module: str,
    parameters: dict,
    context_text: str,
    user: Any,
) -> list[dict]:
    """
    Query the database for similar records based on department/work_area.
    Returns a lightweight list for the recommendation panel.
    """
    records: list[dict] = []
    company_id = getattr(user, "company_id", None)
    dept = parameters.get("department")
    work_area = parameters.get("work_area")

    try:
        if module == "incident":
            from incidentmanagement.models import Incident
            qs = Incident.objects.filter(company_id=company_id)
            if dept:
                qs = qs.filter(department__icontains=dept)
            for obj in qs.order_by("-created_at")[:5]:
                records.append({
                    "id": obj.id,
                    "title": obj.title or obj.incident_type,
                    "module": "incident",
                    "date": obj.created_at.strftime("%d %b %Y") if obj.created_at else "",
                    "status": obj.status or "open",
                })
        elif module == "safety_observation":
            from safetyobservation.models import SafetyObservation
            qs = SafetyObservation.objects.filter(company_id=company_id)
            if dept:
                qs = qs.filter(department__icontains=dept)
            for obj in qs.order_by("-created_at")[:5]:
                records.append({
                    "id": obj.id,
                    "title": obj.safetyObservationFound[:80] if obj.safetyObservationFound else "Observation",
                    "module": "safety_observation",
                    "date": obj.created_at.strftime("%d %b %Y") if obj.created_at else "",
                    "status": obj.observationStatus or "open",
                })
        elif module == "ptw":
            from ptw.models import PermitToWork
            qs = PermitToWork.objects.filter(company_id=company_id)
            if work_area:
                qs = qs.filter(location__icontains=work_area)
            for obj in qs.order_by("-created_at")[:5]:
                records.append({
                    "id": obj.id,
                    "title": obj.permit_number or obj.description[:60],
                    "module": "ptw",
                    "date": obj.created_at.strftime("%d %b %Y") if obj.created_at else "",
                    "status": obj.status or "draft",
                })
    except Exception:
        pass

    return records
