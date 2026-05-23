"""
Athens 2.0 — Phase 5 Prompts (Steps 51-65)
Autonomous Industrial AI Platform
"""
from .prompts import SYSTEM_CONTEXT


# ─── Safety Brain (also used by phase3 views) ─────────────────────────────────────────
def safety_brain_prompt(snapshot: dict) -> str:
    from .phase4_prompts import safety_brain_prompt as _p
    return _p(snapshot)


# ─── Step 51: AI Agents ────────────────────────────────────────────────────────
def ptw_agent_prompt(data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

You are the Athens PTW Agent. Autonomously analyze active permits and detect issues.

Active Permits Summary:
- Total Active: {data.get('active_count', 0)}
- High Risk: {data.get('high_risk_count', 0)}
- Expiring in 2h: {data.get('expiring_soon', 0)}
- Overdue Approvals: {data.get('overdue_approvals', 0)}
- Simultaneous Hot Work + Confined Space: {data.get('conflict_count', 0)}
- Permits Without Gas Test (required): {data.get('missing_gas_test', 0)}
- Permits Without Signatures: {data.get('missing_signatures', 0)}

Return ONLY valid JSON:
{{
  "anomalies": [{{"permit_id": id, "issue": "description", "severity": "low|medium|high|critical"}}],
  "conflicts": [{{"permit_ids": [id1, id2], "conflict_type": "type", "recommendation": "action"}}],
  "recommendations": ["agent recommendations"],
  "auto_actions": [{{"action": "suspend|alert|escalate", "permit_id": id, "reason": "reason"}}],
  "agent_summary": "brief agent status summary"
}}"""


def incident_agent_prompt(data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

You are the Athens Incident Agent. Analyze incident patterns and predict risks.

Incident Data (30 days):
- Open Incidents: {data.get('open_count', 0)}
- Overdue Investigations: {data.get('overdue_investigations', 0)}
- Repeat Locations: {data.get('repeat_locations', [])}
- Repeat Contractors: {data.get('repeat_contractors', [])}
- Severity Distribution: {data.get('severity_dist', {})}
- Unassigned Incidents: {data.get('unassigned', 0)}

Return ONLY valid JSON:
{{
  "patterns": ["identified incident patterns"],
  "high_risk_locations": ["locations with recurring incidents"],
  "high_risk_contractors": ["contractors with recurring incidents"],
  "predictions": ["predicted incidents in next 30 days"],
  "recommendations": ["agent recommendations"],
  "escalations": [{{"incident_id": id, "reason": "reason"}}]
}}"""


def workforce_agent_prompt(data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

You are the Athens Workforce Agent. Monitor worker safety and fatigue risks.

Workforce Data:
- Workers on Site: {data.get('workers_on_site', 0)}
- Overtime Workers (>10h today): {data.get('overtime_workers', 0)}
- Workers Without Valid Training: {data.get('training_expired', 0)}
- Workers With Recent Unsafe Acts: {data.get('unsafe_act_workers', 0)}
- Absent Workers (unplanned): {data.get('absent_workers', 0)}
- Workers on Consecutive Day 7+: {data.get('consecutive_days_7plus', 0)}

Return ONLY valid JSON:
{{
  "fatigue_risks": [{{"worker_id": id, "risk_level": "level", "reason": "reason"}}],
  "training_gaps": [{{"worker_id": id, "missing_training": ["list"]}}],
  "behavior_flags": [{{"worker_id": id, "flag": "description"}}],
  "recommendations": ["workforce safety recommendations"],
  "agent_summary": "brief workforce status"
}}"""


def emergency_agent_prompt(event: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

EMERGENCY AGENT ACTIVATED. Generate autonomous emergency response.

Emergency Event:
- Type: {event.get('event_type', '')}
- Location: {event.get('location', '')}
- Severity: {event.get('severity', 'moderate')}
- Workers in Area: {event.get('workers_count', 0)}
- Active Permits in Zone: {event.get('active_permits', [])}
- IoT Alerts: {event.get('iot_alerts', [])}
- Time: {event.get('timestamp', '')}

Return ONLY valid JSON:
{{
  "severity_classification": "minor|moderate|serious|critical",
  "immediate_actions": ["ordered immediate actions — numbered"],
  "permits_to_suspend": ["permit IDs or types to suspend immediately"],
  "evacuation_required": true/false,
  "evacuation_zones": ["zones to evacuate"],
  "assembly_points": ["nearest assembly points"],
  "emergency_contacts": ["roles to notify in order"],
  "rescue_procedures": ["rescue steps if needed"],
  "broadcast_message": "short emergency broadcast for workers (max 50 words)",
  "escalate_to_external": true/false,
  "external_services": ["ambulance|fire brigade|police if needed"]
}}"""


# ─── Step 54: AI Safety Copilot ───────────────────────────────────────────────
def copilot_prompt(message: str, context: dict, history: list, role: str) -> str:
    history_text = ''
    if history:
        history_text = '\nConversation:\n' + '\n'.join(
            f"{'User' if h['role'] == 'user' else 'Copilot'}: {h['content']}"
            for h in history[-8:]
        )

    role_context = {
        'supervisor': 'You assist supervisors with permit approvals, risk assessments, and team safety.',
        'safety_officer': 'You assist safety officers with compliance, audits, and incident investigations.',
        'project_manager': 'You assist project managers with project risk, contractor performance, and safety KPIs.',
        'worker': 'You assist field workers with PTW creation, safety procedures, and hazard identification.',
        'auditor': 'You assist auditors with compliance checks, findings, and corrective actions.',
    }.get(role, 'You assist EHS professionals with all safety management tasks.')

    return f"""{SYSTEM_CONTEXT}

You are the Athens AI Safety Copilot — an intelligent assistant embedded in the Athens 2.0 platform.
{role_context}

User Role: {role}
Module: {context.get('module', 'general')}
Project: {context.get('project_name', 'Not specified')}
Industry: {context.get('industry', 'industrial')}
Active Permits: {context.get('active_permits', 0)}
Open Incidents: {context.get('open_incidents', 0)}
{history_text}

User: "{message}"

Instructions:
- Respond in the user's language (auto-detect Tamil/Hindi/English)
- Be concise, actionable, and safety-focused
- For PTW requests: provide structured permit guidance
- For data queries: give specific numbers and insights
- For risk questions: provide clear risk assessment
- For compliance: cite relevant standards
- Never make up data you don't have — ask for clarification
- Keep responses under 200 words unless detailed explanation needed"""


# ─── Step 55: Self-Learning Risk Engine ───────────────────────────────────────
def risk_learning_prompt(learning_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this safety event to extract learning signals for the risk engine.

Event Type: {learning_data.get('source_type', '')}
Permit Type: {learning_data.get('permit_type', '')}
Location: {learning_data.get('location', '')}
Description: {learning_data.get('description', '')}
Outcome: {learning_data.get('outcome', '')}
Severity: {learning_data.get('severity', '')}
Controls in Place: {learning_data.get('controls', [])}
Controls Missing: {learning_data.get('missing_controls', [])}

Return ONLY valid JSON:
{{
  "hazard_signals": ["hazard patterns to remember"],
  "control_gaps": ["control gaps identified"],
  "risk_weight_adjustment": {{"permit_type": "adjustment_reason"}},
  "location_risk_update": {{"location": "risk_level"}},
  "learning_quality": 0-100,
  "key_lesson": "one-sentence key lesson learned"
}}"""


# ─── Step 57: Computer Vision ─────────────────────────────────────────────────
def vision_analysis_prompt(analysis_type: str, context: dict) -> str:
    type_instructions = {
        'ppe_detection': 'Detect PPE compliance. Check for: hard hat, safety vest, gloves, safety boots, goggles. Flag any missing PPE.',
        'unsafe_act': 'Detect unsafe acts: working without PPE, improper tool use, bypassing safety barriers, unsafe posture.',
        'fire_smoke': 'Detect fire, smoke, sparks, or heat sources. Identify fire risk level and location.',
        'barricade': 'Check if barricades/barriers are properly placed. Detect gaps, missing signs, or unauthorized entry.',
        'crowd': 'Count workers in frame. Detect overcrowding in confined areas or exclusion zones.',
        'hazard': 'Identify all visible hazards: spills, exposed wires, unstable structures, blocked exits.',
        'general': 'Perform comprehensive safety analysis of the worksite image.',
    }.get(analysis_type, 'Perform comprehensive safety analysis.')

    return f"""{SYSTEM_CONTEXT}

Analyze this industrial worksite image for safety compliance.

Analysis Type: {analysis_type}
Instructions: {type_instructions}
Location: {context.get('location', 'Unknown')}
Permit Type: {context.get('permit_type', 'Unknown')}

Return ONLY valid JSON:
{{
  "detections": [
    {{"label": "object/hazard", "confidence": 0-1, "severity": "low|medium|high|critical",
      "bbox": {{"x": 0, "y": 0, "w": 0, "h": 0}}, "description": "what was detected"}}
  ],
  "ppe_violations": ["specific PPE violations"],
  "unsafe_acts": ["unsafe acts detected"],
  "alerts": ["alerts to generate"],
  "overall_severity": "low|medium|high|critical",
  "confidence": 0-1,
  "ai_summary": "1-2 sentence summary of findings",
  "immediate_actions": ["immediate actions required"]
}}"""


# ─── Step 58: Predictive Analytics ────────────────────────────────────────────
def predictive_analytics_prompt(analytics_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Generate predictive safety analytics for enterprise decision-making.

Historical Data (90 days):
- Incident Rate: {analytics_data.get('incident_rate', 0)} per month
- Near Miss Rate: {analytics_data.get('near_miss_rate', 0)} per month
- High-Risk Permits: {analytics_data.get('high_risk_permits_pct', 0)}%
- Training Compliance Trend: {analytics_data.get('training_trend', 'stable')}
- Contractor Violation Trend: {analytics_data.get('contractor_trend', 'stable')}
- Permit Rejection Rate: {analytics_data.get('rejection_rate', 0)}%
- Overdue Actions Trend: {analytics_data.get('overdue_trend', 'stable')}
- Top Hazard Types: {analytics_data.get('top_hazards', [])}
- High-Risk Locations: {analytics_data.get('high_risk_locations', [])}

Return ONLY valid JSON:
{{
  "incident_forecast_30d": {{"count": number, "confidence": 0-100, "trend": "up|stable|down"}},
  "high_risk_projects": [{{"project": "name", "risk_score": 0-100, "reason": "reason"}}],
  "contractor_risks": [{{"contractor": "name", "risk_level": "level", "trend": "trend"}}],
  "fatigue_trend": "increasing|stable|decreasing",
  "training_failure_risk": 0-100,
  "permit_bottleneck_risk": 0-100,
  "top_predictions": ["top 5 predictions for next 30 days"],
  "recommended_interventions": ["strategic interventions"]
}}"""


# ─── Step 59: Compliance Engine ───────────────────────────────────────────────
def compliance_scan_prompt(entity_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Perform automated compliance scan for this entity.

Entity Type: {entity_data.get('entity_type', '')}
Entity Data: {entity_data.get('data', {{}})}
Applicable Standards: {entity_data.get('standards', ['ISO 45001', 'Internal SOP'])}
Industry: {entity_data.get('industry', 'industrial')}

Return ONLY valid JSON:
{{
  "violations": [
    {{
      "code": "VIOLATION_CODE",
      "standard": "applicable standard",
      "description": "violation description",
      "severity": "low|medium|high|critical",
      "corrective_action": "required corrective action",
      "due_days": number
    }}
  ],
  "compliance_score": 0-100,
  "blocking": true/false,
  "auto_actions": ["actions to auto-create"],
  "next_inspection_due": "date or timeframe"
}}"""


# ─── Step 60: Autonomous Emergency Response ───────────────────────────────────
def autonomous_emergency_prompt(emergency_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

AUTONOMOUS EMERGENCY RESPONSE ENGINE ACTIVATED.

Emergency Classification Input:
- Trigger: {emergency_data.get('trigger', '')}
- Location: {emergency_data.get('location', '')}
- Detected Signals: {emergency_data.get('signals', [])}
- IoT Readings: {emergency_data.get('iot_readings', {{}})}
- Workers Affected: {emergency_data.get('workers_affected', 0)}
- Active Permits in Zone: {emergency_data.get('active_permits', [])}
- Time of Day: {emergency_data.get('time_of_day', '')}
- Weather: {emergency_data.get('weather', {{}})}

Generate complete autonomous emergency response. Return ONLY valid JSON:
{{
  "emergency_class": "false_alarm|minor|moderate|major|catastrophic",
  "confidence": 0-100,
  "auto_suspend_permits": true/false,
  "permit_types_to_suspend": ["types"],
  "evacuation_plan": {{
    "required": true/false,
    "priority_zones": ["zones in evacuation order"],
    "assembly_points": ["assembly point names"],
    "estimated_evacuation_time_mins": number
  }},
  "response_team_alerts": [
    {{"role": "role name", "message": "alert message", "priority": 1}}
  ],
  "rescue_equipment_needed": ["equipment list"],
  "external_services": ["ambulance|fire|police|hazmat"],
  "broadcast_message": "emergency broadcast (max 30 words)",
  "post_emergency_actions": ["actions after emergency is contained"]
}}"""


# ─── Step 61: Knowledge OS Search ─────────────────────────────────────────────
def knowledge_search_prompt(query: str, context: dict, chunks: list) -> str:
    chunks_text = '\n\n'.join(
        f"[{c.get('entity_type', '').upper()} — {c.get('title', '')}]\n{c.get('chunk_text', '')[:300]}"
        for c in chunks[:5]
    )
    return f"""{SYSTEM_CONTEXT}

Answer this enterprise safety query using the provided knowledge base context.

Query: "{query}"
User Role: {context.get('role', 'user')}
Module: {context.get('module', 'general')}

Knowledge Base Context:
{chunks_text if chunks_text else 'No relevant knowledge found.'}

Instructions:
- Answer directly from the knowledge base context
- If context is insufficient, say what additional information is needed
- Cite the source document type when relevant
- Keep answer concise and actionable
- Use professional EHS language"""


# ─── Step 65: Plugin AI Integration ───────────────────────────────────────────
def plugin_data_analysis_prompt(plugin_type: str, data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze data from a {plugin_type} plugin/device for safety intelligence.

Device: {data.get('device_name', '')}
Data: {data.get('readings', {{}})}
Location: {data.get('location', '')}
Thresholds: {data.get('thresholds', {{}})}

Return ONLY valid JSON:
{{
  "safety_status": "safe|caution|danger|critical",
  "alerts": [{{"type": "alert type", "value": "reading", "threshold": "limit", "action": "required action"}}],
  "recommendations": ["safety recommendations"],
  "auto_suspend_permit": true/false,
  "suspend_reason": "reason if auto_suspend is true"
}}"""
