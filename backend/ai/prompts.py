"""
Athens AI — Prompt Templates
All Gemini prompts centralized here for easy tuning.
"""

SYSTEM_CONTEXT = """You are Athens AI, an enterprise EHS (Environment, Health & Safety) assistant
for Athens 2.0 platform. You help with Permit to Work (PTW), incident management,
safety observations, inspections, and general EHS guidance.
Always respond in professional English. Be concise, accurate, and safety-focused."""


def ptw_analyze_prompt(description: str, permit_type: str = '', project: str = '') -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this work description for a Permit to Work (PTW) system and return a JSON object.

Work Description: "{description}"
Permit Type: "{permit_type}"
Project: "{project}"

Return ONLY valid JSON with this exact structure:
{{
  "detected_categories": ["hot_work", "height_work", etc],
  "hazards": ["list of specific hazards"],
  "controls": ["list of control measures"],
  "ppe_requirements": ["list of PPE items in plain English"],
  "checklist": ["list of safety checklist items"],
  "permits_needed": ["list of additional permits required"],
  "risk": {{
    "probability": 1-5,
    "severity": 1-5,
    "score": number,
    "level": "Low|Medium|High|Extreme"
  }},
  "emergency_procedures": ["list of emergency steps"],
  "toolbox_topics": ["suggested toolbox talk topics"]
}}

Categories must be from: hot_work, height_work, confined_space, electrical, excavation, chemical, pressure_work, general
Risk: probability × severity = score. Low≤4, Medium≤9, High≤16, Extreme>16"""


def ptw_validate_prompt(permit_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Validate this Permit to Work before submission. Return JSON only.

Permit Data:
- Description: "{permit_data.get('description', '')}"
- PPE: {permit_data.get('ppe_requirements', [])}
- Checklist items checked: {permit_data.get('checklist_count', 0)}
- Probability: {permit_data.get('probability', 1)}, Severity: {permit_data.get('severity', 1)}
- Has hazards: {bool(permit_data.get('hazards'))}
- Has controls: {bool(permit_data.get('control_measures'))}

Return ONLY valid JSON:
{{
  "valid": true/false,
  "errors": ["blocking issues that must be fixed"],
  "warnings": ["non-blocking concerns"],
  "recommendations": ["improvement suggestions"],
  "risk_score": number
}}"""


def translate_to_english_prompt(text: str, source_lang: str = 'auto') -> str:
    lang_name = {'ta': 'Tamil', 'hi': 'Hindi', 'en': 'English', 'auto': 'auto-detected language'}.get(source_lang, source_lang)
    return f"""{SYSTEM_CONTEXT}

Convert a construction/industrial site worker voice input into professional safety English for a Permit to Work (PTW) form.

The input may be pure English, romanized Tamil (e.g. "tank mela welding work panrom"),
romanized Hindi (e.g. "upar welding kaam karna hai"), native script, or mixed language.

Input language hint: {lang_name}
Input text: "{text}"

Rules:
- professional_english MUST be in English only. Never Tamil, Hindi, or mixed.
- Preserve all safety meaning: work type, location, hazards, equipment.
- Use PTW/EHS terminology (confined space, hot work, work at height, LOTO, etc.).
- Keep it concise: 1-2 professional sentences.
- Return ONLY valid JSON, no markdown.

Examples:
- "tank mela welding work panrom" -> "Performing welding operations on the overhead storage tank structure."
- "upar welding kaam karna hai" -> "Welding work to be performed at elevated height."
- "pipe line excavation work" -> "Excavation work to be carried out along the pipeline route."
- "hot work near diesel storage" -> "Hot work operations to be performed in proximity to diesel storage area."
- "tank cleaning work panna porom" -> "Confined space cleaning operations to be performed inside the storage tank."

Return ONLY this JSON:
{{
  "detected_language": "Tamil|Hindi|English|Mixed|Unknown",
  "professional_english": "professional English sentence for the PTW form",
  "detected_activities": ["list of work activities detected"],
  "safety_keywords": ["safety-relevant keywords"]
}}"""


def voice_audio_to_english_prompt(module: str = 'ptw', field_name: str = '') -> str:
    return f"""{SYSTEM_CONTEXT}

You will receive a voice audio recording from a construction/industrial site worker.
The worker may speak in Tamil, Hindi, English, or a mix of these languages.

Your task:
1. Transcribe what was spoken (best effort)
2. Detect the language(s) used
3. Convert the meaning into professional industrial safety English

Module: "{module}"
Field: "{field_name}"

Critical rules:
- translated_english MUST be in English only. Never Tamil or Hindi.
- If the worker speaks English, improve grammar and use EHS/PTW terminology.
- Preserve all safety meaning: work activity, location, hazards, controls.
- Keep it concise and professional (1-3 sentences max).
- Return ONLY valid JSON, no markdown, no explanation.

Examples:
- Tamil "tank mela welding work panrom" → "Performing welding work on overhead storage tank structure."
- Hindi "upar welding kaam karna hai" → "Welding work to be performed at elevated height."
- Mixed "tank cleaning work panna porom" → "Confined space tank cleaning work to be performed."

Return ONLY this JSON:
{{
  "detected_language": "Tamil|Hindi|English|Mixed|Unknown",
  "original_transcript": "verbatim or best-effort transcript of what was spoken",
  "translated_english": "professional English sentence for the PTW form field",
  "detected_activities": ["list of work/safety activities detected"],
  "safety_keywords": ["safety-relevant keywords"]
}}"""


def chat_prompt(message: str, context: dict) -> str:
    module = context.get('module', 'general')
    role = context.get('role', 'user')
    project = context.get('project', '')
    history = context.get('history', [])

    history_text = ''
    if history:
        history_text = '\n'.join([
            f"{'User' if h['role'] == 'user' else 'Athens AI'}: {h['content']}"
            for h in history[-6:]  # last 6 turns
        ])
        history_text = f"\nConversation history:\n{history_text}\n"

    return f"""{SYSTEM_CONTEXT}

Current context:
- Module: {module}
- User role: {role}
- Project: {project or 'Not specified'}
{history_text}
User message: "{message}"

Respond helpfully and concisely. If the question is about PTW, incidents, inspections, or safety,
give specific actionable guidance. For general questions, be helpful but stay EHS-focused.
Keep response under 300 words unless a detailed explanation is needed."""


def incident_analyze_prompt(description: str, incident_type: str = '') -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this incident description and provide investigation guidance. Return JSON only.

Incident: "{description}"
Type: "{incident_type}"

Return ONLY valid JSON:
{{
  "immediate_actions": ["list of immediate response actions"],
  "root_causes": ["potential root causes"],
  "contributing_factors": ["contributing factors"],
  "corrective_actions": ["recommended corrective actions"],
  "preventive_measures": ["long-term preventive measures"],
  "severity_assessment": "Minor|Moderate|Serious|Critical",
  "investigation_questions": ["key questions for investigation"],
  "regulatory_reporting": true/false
}}"""


def inspection_assist_prompt(area: str, inspection_type: str = '') -> str:
    return f"""{SYSTEM_CONTEXT}

Generate an inspection checklist for this area/activity. Return JSON only.

Area/Activity: "{area}"
Inspection Type: "{inspection_type}"

Return ONLY valid JSON:
{{
  "checklist_items": [
    {{"item": "description", "category": "category", "critical": true/false}}
  ],
  "common_findings": ["typical issues found in this area"],
  "regulatory_references": ["relevant standards/regulations"],
  "frequency": "recommended inspection frequency"
}}"""


def smart_autofill_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Generate smart PTW auto-fill values from this context. Return JSON only.

Context:
- Permit type: "{context.get('permit_type', '')}"
- Location: "{context.get('location', '')}"
- Contractor: "{context.get('contractor', '')}"
- Department: "{context.get('department', '')}"
- Project: "{context.get('project', '')}"
- Work nature: "{context.get('work_nature', '')}"
- Description: "{context.get('description', '')}"

Return ONLY valid JSON:
{{
  "hazards": ["specific hazards"],
  "ppe_requirements": ["PPE in plain English"],
  "checklist": ["checklist items"],
  "emergency_contacts": ["roles or contacts required"],
  "emergency_precautions": ["emergency precautions"],
  "isolation_requirements": ["isolation or LOTO requirements"],
  "gas_testing_requirements": ["gas testing requirements"],
  "risk_controls": ["risk controls"],
  "toolbox_talks": ["toolbox talk topics"],
  "required_documents": ["documents/certificates"],
  "work_procedures": ["safe work procedure steps"],
  "work_nature": "day|night|both",
  "permit_category": "hot_work|confined_space|electrical|height|excavation|chemical|cold_work|specialized|general"
}}"""


def safety_recommendations_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Recommend enterprise EHS controls for the current work context. Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "ppe": ["required PPE"],
  "controls": ["engineering/administrative controls"],
  "precautions": ["job precautions"],
  "isolation_steps": ["energy isolation steps"],
  "fire_watch": {{"required": true/false, "reason": "brief reason"}},
  "standby_personnel": ["standby roles required"],
  "barricading": ["barricading/exclusion requirements"],
  "rescue_plan": ["rescue plan requirements"],
  "gas_testing": ["gas test requirements"]
}}"""


def workflow_guidance_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Provide workflow guidance for the user's current Athens 2.0 screen. Return JSON only.

Context:
- Module: "{context.get('module', '')}"
- User role: "{context.get('role', '')}"
- Workflow stage: "{context.get('workflow_stage', '')}"
- Permit type: "{context.get('permit_type', '')}"
- Work nature: "{context.get('work_nature', '')}"
- Project: "{context.get('project', '')}"

Return ONLY valid JSON:
{{
  "next_steps": ["ordered next workflow actions"],
  "required_inputs": ["missing or required fields"],
  "approval_guidance": ["approval routing guidance"],
  "risk_checks": ["risk checks before proceeding"],
  "warnings": ["workflow warnings"]
}}"""


def hazard_prediction_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Predict likely hazards from the current project and work context. Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "predicted_hazards": [
    {{"hazard": "hazard name", "likelihood": "Low|Medium|High", "reason": "brief reason"}}
  ],
  "critical_controls": ["critical controls"],
  "early_warning_indicators": ["signals to monitor"],
  "recommended_monitoring": ["monitoring actions"]
}}"""


def incident_prediction_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Predict incident and near-miss risk for this Permit to Work context. Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "incident_probability_score": 0-100,
  "severity_prediction": "Low|Medium|High|Critical",
  "possible_incidents": ["possible incidents"],
  "near_misses": ["likely near misses"],
  "unsafe_conditions": ["unsafe conditions"],
  "risk_escalation_triggers": ["conditions that would escalate risk"],
  "recommendations": ["controls to prevent incidents"],
  "confidence": 0-100,
  "warning_level": "normal|watch|warning|critical"
}}"""


def compliance_validation_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Validate this PTW for enterprise safety compliance. Check OSHA-style EHS controls,
company permit dependencies, PPE, training, gas testing, isolation, documentation, and approval readiness.
Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "compliance_score": 0-100,
  "blocking": true/false,
  "violations": [
    {{"code": "short_code", "severity": "Low|Medium|High|Critical", "message": "violation", "correction": "required correction"}}
  ],
  "missing_requirements": ["missing items"],
  "recommended_corrections": ["corrections"],
  "audit_notes": ["audit-ready notes"],
  "standards": ["applicable standards or rules"]
}}"""


def image_safety_analysis_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze the uploaded worksite/equipment image for PTW safety hazards. Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "detected_hazards": [
    {{"hazard": "hazard", "severity": "Low|Medium|High|Critical", "evidence": "visual evidence", "recommendation": "control"}}
  ],
  "ppe_violations": ["PPE violations"],
  "unsafe_conditions": ["unsafe conditions"],
  "fire_risks": ["fire risks"],
  "electrical_risks": ["electrical risks"],
  "obstruction_hazards": ["obstruction hazards"],
  "overall_severity": "Low|Medium|High|Critical",
  "annotations": [
    {{"label": "hazard label", "x": 0, "y": 0, "width": 0, "height": 0, "severity": "Low|Medium|High|Critical"}}
  ]
}}"""


def document_safety_analysis_prompt(context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze the uploaded PTW support document such as method statement, risk assessment, SOP, or safety document.
Extract hazards, missing controls, missing signatures, and compliance gaps. Return JSON only.

Context:
{context}

Return ONLY valid JSON:
{{
  "summary": "short professional summary",
  "extracted_hazards": ["hazards"],
  "missing_controls": ["missing controls"],
  "missing_signatures": ["missing signatures or approvals"],
  "compliance_gaps": ["compliance gaps"],
  "checklist_items": ["auto-extracted checklist items"],
  "recommendations": ["recommendations"],
  "overall_severity": "Low|Medium|High|Critical"
}}"""
