"""
AI Context Intelligence Prompts — Phases 1-10
Company, Project, Location, Memory, Smart PTW Context
"""

from .prompts import SYSTEM_CONTEXT


# ─── Phase 1: Company Intelligence ────────────────────────────────────────────

def company_profile_prompt(company_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Generate an AI intelligence profile for this company for use in a Permit to Work (PTW) system.

Company Data:
- Name: "{company_data.get('company_name', '')}"
- Industry: "{company_data.get('industry', '')}"
- Type: "{company_data.get('company_type', '')}"
- Work Categories: {company_data.get('work_categories', [])}
- Safety Standards: {company_data.get('safety_standards', [])}

Based on the industry and company type, generate:
1. Priority hazards this company faces
2. Mandatory safety controls
3. Safety maturity assessment
4. Company-specific PTW intelligence

Return ONLY valid JSON:
{{
  "ai_summary": "2-3 sentence professional summary of company safety profile",
  "industry_classification": "oil_gas|refinery|power|construction|epc|mining|chemical|manufacturing|other",
  "risk_category": "low|medium|high|critical",
  "safety_maturity": "reactive|managed|proactive|resilient",
  "safety_maturity_score": 0-100,
  "priority_hazards": ["top hazards for this industry"],
  "mandatory_ppe": ["mandatory PPE for this company type"],
  "company_rules": ["key safety rules inferred from industry"],
  "permit_intelligence": {{
    "hot_work": {{"extra_controls": [], "gas_testing": true/false}},
    "confined_space": {{"extra_controls": [], "rescue_team": true/false}},
    "electrical": {{"extra_controls": [], "loto_required": true/false}},
    "height": {{"extra_controls": [], "min_height_m": 1.8}}
  }},
  "context_injection": "compact context string for PTW prompt injection"
}}"""


def company_ptw_context_prompt(company_profile: dict, permit_context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Using this company's safety profile, enhance the PTW analysis with company-specific intelligence.

Company Profile:
- Industry: {company_profile.get('industry', '')}
- Risk Category: {company_profile.get('risk_category', '')}
- Priority Hazards: {company_profile.get('priority_hazards', [])}
- Company Rules: {company_profile.get('company_rules', [])}
- Safety Standards: {company_profile.get('safety_standards', [])}

PTW Context:
- Permit Type: {permit_context.get('permit_type', '')}
- Description: {permit_context.get('description', '')}
- Location: {permit_context.get('location', '')}

Add company-specific intelligence to this PTW. Return ONLY valid JSON:
{{
  "company_specific_hazards": ["hazards specific to this company/industry"],
  "company_mandatory_controls": ["controls required by company standards"],
  "company_ppe_additions": ["additional PPE required by company policy"],
  "company_checklist_additions": ["company-specific checklist items"],
  "compliance_standards": ["applicable standards: ISO 45001, OSHA, etc."],
  "company_warnings": ["company-specific warnings for this work type"],
  "approval_requirements": ["company-specific approval requirements"]
}}"""


# ─── Phase 2: Project Intelligence ────────────────────────────────────────────

def project_profile_prompt(project_data: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Generate an AI intelligence profile for this project for use in a PTW system.

Project Data:
- Name: "{project_data.get('project_name', '')}"
- Type: "{project_data.get('project_type', '')}"
- Phase: "{project_data.get('phase', '')}"
- Industry: "{project_data.get('industry', '')}"
- Active Contractors: {project_data.get('active_contractors', [])}
- Description: "{project_data.get('description', '')}"

Return ONLY valid JSON:
{{
  "ai_summary": "2-3 sentence professional project safety summary",
  "risk_score": 0-100,
  "safety_score": 0-100,
  "critical_activities": ["high-risk activities for this project type/phase"],
  "high_risk_zones": ["zones requiring extra attention"],
  "simultaneous_ops_risk": true/false,
  "shutdown_considerations": ["special considerations if shutdown/turnaround"],
  "contractor_risk_factors": ["contractor management risk factors"],
  "permit_dependencies": ["permits that commonly conflict in this project type"],
  "project_specific_controls": ["controls specific to this project phase"],
  "context_injection": "compact context string for PTW prompt injection"
}}"""


def project_ptw_context_prompt(project_profile: dict, permit_context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Using this project's intelligence profile, enhance the PTW analysis.

Project Profile:
- Type: {project_profile.get('project_type', '')}
- Phase: {project_profile.get('phase', '')}
- Risk Score: {project_profile.get('risk_score', 50)}
- Critical Activities: {project_profile.get('critical_activities', [])}
- High Risk Zones: {project_profile.get('high_risk_zones', [])}
- Simultaneous Ops Risk: {project_profile.get('simultaneous_ops_risk', False)}
- Shutdown Active: {project_profile.get('shutdown_active', False)}

PTW Context:
- Permit Type: {permit_context.get('permit_type', '')}
- Description: {permit_context.get('description', '')}
- Location: {permit_context.get('location', '')}
- Planned Start: {permit_context.get('planned_start', '')}

Return ONLY valid JSON:
{{
  "project_specific_hazards": ["hazards specific to this project phase"],
  "simultaneous_work_warnings": ["warnings about concurrent operations"],
  "project_checklist_additions": ["project-specific checklist items"],
  "approval_escalations": ["additional approvals needed for this project phase"],
  "timeline_conflicts": ["potential scheduling conflicts to check"],
  "project_risk_adjustment": "increase|maintain|decrease",
  "project_warnings": ["project-specific safety warnings"]
}}"""


# ─── Phase 3: Location Intelligence ───────────────────────────────────────────

def location_profile_prompt(location: str, context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Analyze this work location and generate an AI intelligence profile for PTW safety.

Location: "{location}"
Industry: "{context.get('industry', 'industrial')}"
Project Type: "{context.get('project_type', '')}"

Based on the location name and keywords, determine:
1. Zone classification and risk level
2. Automatic safety warnings
3. Mandatory controls for this location

Return ONLY valid JSON:
{{
  "zone_classification": "hot_zone|restricted|confined_space|hazardous_atm|electrical_risk|height_risk|flammable|normal",
  "risk_level": "low|medium|high|critical",
  "location_keywords": ["keywords extracted from location name"],
  "auto_warnings": ["automatic safety warnings for this location"],
  "mandatory_controls": ["mandatory controls for this location"],
  "mandatory_ppe": ["mandatory PPE for this location"],
  "gas_testing_required": true/false,
  "hot_work_restricted": true/false,
  "smoking_prohibited": true/false,
  "nearby_hazards": ["potential nearby hazards"],
  "ai_summary": "1-2 sentence location safety summary",
  "permit_type_restrictions": ["permit types with extra requirements here"]
}}"""


def location_ptw_context_prompt(location_profile: dict, permit_context: dict) -> str:
    return f"""{SYSTEM_CONTEXT}

Using this location's intelligence profile, enhance the PTW analysis.

Location Profile:
- Location: {location_profile.get('location_name', '')}
- Zone: {location_profile.get('zone_classification', '')}
- Risk Level: {location_profile.get('risk_level', '')}
- Auto Warnings: {location_profile.get('auto_warnings', [])}
- Gas Testing Required: {location_profile.get('gas_testing_required', False)}
- Hot Work Restricted: {location_profile.get('hot_work_restricted', False)}
- Nearby Hazards: {location_profile.get('nearby_hazards', [])}

PTW Context:
- Permit Type: {permit_context.get('permit_type', '')}
- Description: {permit_context.get('description', '')}

Return ONLY valid JSON:
{{
  "location_hazards": ["location-specific hazards"],
  "location_controls": ["location-specific mandatory controls"],
  "location_ppe": ["location-specific PPE requirements"],
  "location_warnings": ["location-specific warnings"],
  "gas_testing_gases": ["specific gases to test at this location"],
  "nearby_permit_conflicts": ["types of nearby work that would conflict"],
  "location_checklist": ["location-specific checklist items"],
  "evacuation_considerations": ["evacuation/emergency considerations for this location"]
}}"""


# ─── Phase 5: Smart Combined Context Engine ────────────────────────────────────

def smart_context_engine_prompt(combined_context: dict) -> str:
    company = combined_context.get('company', {})
    project = combined_context.get('project', {})
    location = combined_context.get('location', {})
    permit = combined_context.get('permit', {})
    memory = combined_context.get('memory_snippets', [])
    weather = combined_context.get('weather', {})
    nearby_permits = combined_context.get('nearby_permits', [])

    memory_text = '\n'.join(f'- {m}' for m in memory[:5]) if memory else 'None'
    nearby_text = ', '.join(nearby_permits[:5]) if nearby_permits else 'None'

    return f"""{SYSTEM_CONTEXT}

You are the Athens AI Smart Context Engine. Combine ALL available context to generate
the most intelligent, comprehensive PTW safety analysis possible.

=== COMPANY CONTEXT ===
Industry: {company.get('industry', 'Unknown')}
Risk Category: {company.get('risk_category', 'medium')}
Priority Hazards: {company.get('priority_hazards', [])}
Company Rules: {company.get('company_rules', [])}
Safety Standards: {company.get('safety_standards', [])}

=== PROJECT CONTEXT ===
Project Type: {project.get('project_type', 'Unknown')}
Phase: {project.get('phase', 'Unknown')}
Risk Score: {project.get('risk_score', 50)}/100
Shutdown Active: {project.get('shutdown_active', False)}
Simultaneous Ops Risk: {project.get('simultaneous_ops_risk', False)}
Critical Activities: {project.get('critical_activities', [])}

=== LOCATION CONTEXT ===
Location: {location.get('location_name', permit.get('location', 'Unknown'))}
Zone Classification: {location.get('zone_classification', 'normal')}
Risk Level: {location.get('risk_level', 'medium')}
Gas Testing Required: {location.get('gas_testing_required', False)}
Hot Work Restricted: {location.get('hot_work_restricted', False)}
Auto Warnings: {location.get('auto_warnings', [])}

=== PERMIT CONTEXT ===
Permit Type: {permit.get('permit_type', '')}
Description: {permit.get('description', '')}
Location: {permit.get('location', '')}
Work Nature: {permit.get('work_nature', 'day')}

=== WEATHER CONTEXT ===
Temperature: {weather.get('temperature_c', 'N/A')}°C
Wind Speed: {weather.get('wind_speed_kmh', 'N/A')} km/h
Lightning Risk: {weather.get('lightning_risk', False)}
Risk Level: {weather.get('risk_level', 'low')}

=== NEARBY ACTIVE PERMITS ===
{nearby_text}

=== AI MEMORY (learned patterns) ===
{memory_text}

Generate a comprehensive, context-aware PTW safety analysis. Return ONLY valid JSON:
{{
  "hazards": ["comprehensive list of hazards from all contexts"],
  "controls": ["comprehensive control measures"],
  "ppe_requirements": ["complete PPE list"],
  "checklist": ["comprehensive safety checklist"],
  "risk": {{
    "probability": 1-5,
    "severity": 1-5,
    "score": number,
    "level": "Low|Medium|High|Extreme"
  }},
  "context_warnings": ["warnings from company/project/location/weather context"],
  "approval_recommendations": ["recommended approval chain"],
  "simultaneous_work_conflicts": ["conflicts with nearby permits"],
  "weather_precautions": ["weather-specific precautions"],
  "emergency_procedures": ["emergency procedures for this context"],
  "confidence": "high|medium|low",
  "context_sources": ["company", "project", "location", "weather", "memory"],
  "ai_recommendation": "approve|review|escalate",
  "ai_reasoning": "brief explanation of recommendation"
}}"""


# ─── Phase 6: Knowledge Training ──────────────────────────────────────────────

def extract_patterns_prompt(source_type: str, content: str) -> str:
    return f"""{SYSTEM_CONTEXT}

Extract safety intelligence patterns from this {source_type} for AI learning.

Content:
{content[:2000]}

Return ONLY valid JSON:
{{
  "extracted_patterns": ["key safety patterns learned"],
  "hazard_signals": ["hazard indicators found"],
  "control_signals": ["effective controls mentioned"],
  "location_signals": ["location-specific intelligence"],
  "quality_score": 0-100,
  "key_lessons": ["key safety lessons"]
}}"""
