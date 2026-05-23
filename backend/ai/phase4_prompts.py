"""
Athens 2.0 — Phase 4 Prompts (Steps 36-50)
Industrial AI Operating System prompt templates
"""
from .prompts import SYSTEM_CONTEXT


# ─── Step 24: AI Approval Assistant ──────────────────────────────────────────
def approval_assistant_prompt(permit_context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

You are the Athens AI Approval Assistant. Analyze this permit and provide an approval recommendation.

Permit Details:
- Number: {permit_context.get('permit_number', '')}
- Type: {permit_context.get('permit_type', '')}
- Description: {permit_context.get('description', '')}
- Location: {permit_context.get('location', '')}
- Risk Score: {permit_context.get('risk_score', 0)}
- Risk Level: {permit_context.get('risk_level', '')}
- PPE Requirements: {permit_context.get('ppe_requirements', [])}
- Control Measures: {permit_context.get('control_measures', '')}
- Status: {permit_context.get('status', '')}

Return ONLY valid JSON:
{{
  "recommendation": "approve|reject|modify",
  "confidence_score": 0-100,
  "reasoning": "clear explanation of recommendation",
  "risk_factors": ["identified risk factors"],
  "missing_items": ["missing or incomplete items"],
  "suggestions": ["specific improvement suggestions"],
  "approval_conditions": ["conditions if recommending approve with conditions"]
}}"""


# ─── Step 38: Safety Brain ─────────────────────────────────────────────────────
def safety_brain_prompt(snapshot: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

You are the Athens AI Safety Brain. Analyze cross-module safety data and generate
enterprise-level safety intelligence.

Data Snapshot:
- Active Permits: {snapshot.get('active_permits', 0)}
- Open Incidents: {snapshot.get('open_incidents', 0)}
- Unsafe Acts (30d): {snapshot.get('unsafe_acts', 0)}
- Overdue Actions: {snapshot.get('overdue_actions', 0)}
- Training Compliance: {snapshot.get('training_compliance', 100)}%
- Contractor Violations (30d): {snapshot.get('contractor_violations', 0)}
- High-Risk Permits Active: {snapshot.get('high_risk_permits', 0)}
- Rejected Permits (30d): {snapshot.get('rejected_permits', 0)}
- Audit Findings Open: {snapshot.get('open_audit_findings', 0)}
- Module Scores: {snapshot.get('module_scores', {{}})}

Return ONLY valid JSON:
{{
  "enterprise_score": 0-100,
  "accident_probability": 0-100,
  "unsafe_trends": ["identified unsafe trends"],
  "high_risk_contractors": ["contractor names or patterns"],
  "recurring_failures": ["recurring safety failures"],
  "predictions": ["AI safety predictions for next 30 days"],
  "ai_summary": "2-3 sentence executive safety summary",
  "priority_actions": ["top 5 priority actions"],
  "module_scores": {{"ptw": 0-100, "incident": 0-100, "inspection": 0-100, "training": 0-100}}
}}"""


# ─── Step 39: Knowledge Graph ──────────────────────────────────────────────────
def knowledge_graph_analysis_prompt(entity_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze relationships in this industrial safety knowledge graph and identify risk patterns.

Entity: {entity_data.get('entity_type')} — {entity_data.get('entity_name')}
Connected Data:
- Permits: {entity_data.get('permits', [])}
- Incidents: {entity_data.get('incidents', [])}
- Violations: {entity_data.get('violations', [])}
- Locations: {entity_data.get('locations', [])}
- Hazards: {entity_data.get('hazards', [])}

Return ONLY valid JSON:
{{
  "risk_score": 0-100,
  "risk_category": "low|medium|high|critical",
  "key_patterns": ["identified risk patterns"],
  "relationships": ["significant relationships found"],
  "recommendations": ["AI recommendations"],
  "alert_level": "normal|watch|warning|critical"
}}"""


# ─── Step 40: Multi-Module Assistant ──────────────────────────────────────────
def multi_module_assistant_prompt(message: str, context: dict, history: list) -> str:
    history_text = ''
    if history:
        history_text = '\nConversation:\n' + '\n'.join(
            f"{'User' if h['role']=='user' else 'AI'}: {h['content']}"
            for h in history[-6:]
        )

    return f"""{SYSTEM_CONTEXT}

You are the Athens AI Industrial Assistant — an expert in all modules:
PTW, Incidents, Inspections, Workforce, Training, Audits, Safety Observations, ERGON, TBT.

User Context:
- Role: {context.get('role', 'user')}
- Module: {context.get('module', 'general')}
- Project: {context.get('project', 'Not specified')}
- Tenant Industry: {context.get('industry', 'industrial')}
{history_text}

User Message: "{message}"

Instructions:
- Answer in the user's language (Tamil/Hindi/English auto-detected)
- For data queries, provide structured actionable answers
- For PTW requests, generate structured permit data
- For analytics queries, provide insights with numbers
- Keep responses concise and professional
- If you need data you don't have, say what data is needed

Respond in plain text (not JSON) unless the user asks for structured data."""


# ─── Step 41: Document Intelligence ───────────────────────────────────────────
def document_intelligence_prompt(doc_type: str, title: str) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this {doc_type} document titled "{title}" for industrial safety intelligence.
Extract all safety-relevant information for use in PTW and EHS systems.

Return ONLY valid JSON:
{{
  "ai_summary": "professional 2-3 sentence summary",
  "extracted_hazards": ["hazards mentioned or implied"],
  "extracted_controls": ["control measures mentioned"],
  "extracted_checklist": ["checklist items that can be used in PTW"],
  "compliance_gaps": ["compliance gaps or missing elements"],
  "applicable_permit_types": ["permit types this document applies to"],
  "key_procedures": ["key safety procedures extracted"],
  "tags": ["searchable tags"],
  "quality_score": 0-100
}}"""


# ─── Step 42: Emergency Command ────────────────────────────────────────────────
def emergency_response_prompt(event: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

EMERGENCY RESPONSE REQUIRED. Generate an immediate AI response plan.

Emergency:
- Title: {event.get('title', '')}
- Description: {event.get('description', '')}
- Severity: {event.get('severity', 'moderate')}
- Location: {event.get('location', '')}
- Active Permits Nearby: {event.get('nearby_permits', [])}
- Workers in Area: {event.get('workers_count', 0)}

Return ONLY valid JSON:
{{
  "severity_assessment": "minor|moderate|serious|critical",
  "immediate_actions": ["ordered immediate response actions"],
  "evacuation_plan": {{
    "required": true/false,
    "assembly_points": ["assembly point names"],
    "evacuation_routes": ["route descriptions"]
  }},
  "emergency_contacts": ["roles to notify immediately"],
  "permit_suspensions": ["permit types to suspend immediately"],
  "rescue_procedures": ["rescue procedure steps"],
  "regulatory_notification": true/false,
  "ai_broadcast_message": "short emergency broadcast message for workers"
}}"""


# ─── Step 43: Workforce Intelligence ──────────────────────────────────────────
def worker_risk_prompt(worker_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this worker's safety profile and compute risk scores.

Worker Data:
- Name: {worker_data.get('name', '')}
- Overtime Hours (week): {worker_data.get('overtime_hours', 0)}
- Unsafe Acts (90d): {worker_data.get('unsafe_acts', 0)}
- Incidents Involved (1yr): {worker_data.get('incidents', 0)}
- Training Compliance: {worker_data.get('training_compliance', 100)}%
- Attendance Rate: {worker_data.get('attendance_rate', 100)}%
- Days Since Last Training: {worker_data.get('days_since_training', 0)}
- Consecutive Work Days: {worker_data.get('consecutive_days', 0)}

Return ONLY valid JSON:
{{
  "fatigue_score": 0-100,
  "behavior_score": 0-100,
  "training_gap_score": 0-100,
  "overall_risk": "low|medium|high|critical",
  "ai_flags": ["specific risk flags"],
  "recommendations": ["recommended actions for this worker"]
}}"""


# ─── Step 44: Contractor Intelligence ─────────────────────────────────────────
def contractor_score_prompt(contractor_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Compute an AI safety score for this contractor company.

Contractor: {contractor_data.get('name', '')}
Data (last 90 days):
- Total Permits: {contractor_data.get('total_permits', 0)}
- Violations: {contractor_data.get('violations', 0)}
- Incidents: {contractor_data.get('incidents', 0)}
- Rejected Permits: {contractor_data.get('rejected_permits', 0)}
- Overdue Actions: {contractor_data.get('overdue_actions', 0)}
- Training Compliance: {contractor_data.get('training_compliance', 100)}%
- Audit Score: {contractor_data.get('audit_score', 75)}

Return ONLY valid JSON:
{{
  "risk_score": 0-100,
  "risk_category": "low|medium|high|critical",
  "trend": "improving|stable|declining",
  "ai_recommendations": ["specific recommendations for this contractor"],
  "ban_recommended": true/false,
  "ban_reason": "reason if ban recommended or empty string"
}}"""


# ─── Step 45: AI Inspection ────────────────────────────────────────────────────
def ai_inspection_prompt(area: str, inspection_type: str, history: list) -> str:
    history_text = '\n'.join(f'- {h}' for h in history[:5]) if history else 'None'
    return f"""{SYSTEM_CONTEXT}

Generate a dynamic AI inspection checklist for this area.

Area: "{area}"
Inspection Type: "{inspection_type}"
Recent Findings History:
{history_text}

Return ONLY valid JSON:
{{
  "title": "inspection title",
  "questions": [
    {{"q": "question text", "category": "category", "critical": true/false, "ai_generated": true}}
  ],
  "checklist": ["checklist items"],
  "focus_areas": ["areas to focus based on history"],
  "frequency": "recommended frequency",
  "estimated_duration_mins": number
}}"""


# ─── Step 47: Predictive Maintenance ──────────────────────────────────────────
def equipment_risk_prompt(equipment_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Predict equipment failure risk based on maintenance and inspection history.

Equipment: {equipment_data.get('name', '')}
Last Inspection: {equipment_data.get('last_inspection', 'Unknown')}
Maintenance Overdue: {equipment_data.get('maintenance_overdue', False)}
Defects Found: {equipment_data.get('defects', [])}
Age (years): {equipment_data.get('age_years', 0)}
Usage Hours: {equipment_data.get('usage_hours', 0)}
Failure History: {equipment_data.get('failure_history', [])}

Return ONLY valid JSON:
{{
  "failure_probability": 0-100,
  "risk_level": "low|medium|high|critical",
  "predicted_failure_days": number or null,
  "failure_modes": ["likely failure modes"],
  "maintenance_actions": ["recommended maintenance actions"],
  "safety_impact": "description of safety impact if failure occurs"
}}"""


# ─── Step 49: Executive Analytics ─────────────────────────────────────────────
def executive_summary_prompt(kpi_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Generate an executive AI safety summary for senior management.

KPI Data:
- Enterprise Safety Score: {kpi_data.get('enterprise_score', 75)}/100
- Active Permits: {kpi_data.get('active_permits', 0)}
- Open Incidents: {kpi_data.get('open_incidents', 0)}
- Overdue Actions: {kpi_data.get('overdue_actions', 0)}
- Training Compliance: {kpi_data.get('training_compliance', 100)}%
- High-Risk Contractors: {kpi_data.get('high_risk_contractors', 0)}
- Audit Score: {kpi_data.get('audit_score', 75)}
- Period: {kpi_data.get('period', 'weekly')}

Return ONLY valid JSON:
{{
  "summary_text": "3-4 sentence executive summary",
  "key_insights": ["top 5 safety insights"],
  "risk_predictions": ["predictions for next period"],
  "strategic_recommendations": ["strategic recommendations for leadership"],
  "positive_trends": ["positive safety trends"],
  "concern_areas": ["areas of concern requiring attention"]
}}"""
