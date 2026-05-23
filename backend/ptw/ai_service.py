"""
PTW AI Assistant Service
Rule-based expert system for hazard analysis, checklist generation,
PPE recommendations, risk scoring, and permit validation.
No external API keys required — runs fully on-premise.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import re

# ─── Knowledge Base ────────────────────────────────────────────────────────────

HAZARD_PATTERNS = [
    {
        'keywords': ['weld', 'welding', 'arc', 'torch', 'cutting', 'grind', 'spark', 'flame', 'burn', 'heat', 'hot work',
                     'வெல்டிங்', 'வெட்டுதல்', 'வெப்பம்', 'वेल्डिंग', 'काटना', 'गर्म काम'],
        'hazards': ['Fire and explosion risk', 'Burns from hot surfaces/sparks', 'UV radiation from arc welding',
                    'Fume inhalation (metal fumes)', 'Ignition of nearby flammable materials'],
        'controls': ['Fire extinguisher (CO2/DCP) within 5m', 'Fire watch for 30 min after work',
                     'Remove/wet down flammable materials within 10m', 'Gas test before and during work',
                     'Welding screens/spark shields installed', 'Hot work permit displayed at work site'],
        'ppe': ['welding_shield', 'leather_gloves', 'fire_resistant_coveralls', 'safety_boots', 'respirator'],
        'checklist': ['Fire extinguisher checked and accessible', 'Gas test completed (O2: 19.5-23.5%, LEL <10%)',
                      'Flammable materials removed or shielded', 'Fire watch assigned and briefed',
                      'Welding screens installed', 'Hot work permit displayed'],
        'permits_needed': ['Hot Work Permit', 'Gas Testing Certificate'],
        'risk_boost': 2,
        'category': 'hot_work',
    },
    {
        'keywords': ['height', 'scaffold', 'ladder', 'roof', 'elevated', 'aerial', 'fall', 'harness', 'boom lift',
                     'உயரம்', 'ஏணி', 'கூரை', 'ऊंचाई', 'सीढ़ी', 'छत'],
        'hazards': ['Fall from height', 'Falling objects striking workers below', 'Scaffold collapse',
                    'Ladder slip or overreach', 'Unstable working platform'],
        'controls': ['Full body harness with double lanyard', 'Anchor point load-rated ≥15kN verified',
                     'Exclusion zone below work area with barriers', 'Scaffold inspected and tagged',
                     'Rescue plan prepared and communicated', 'Tool tethering to prevent dropped objects'],
        'ppe': ['full_body_harness', 'helmet', 'safety_boots', 'hi_vis_vest', 'gloves'],
        'checklist': ['Harness inspected and within service date', 'Anchor point verified (≥15kN)',
                      'Exclusion zone barricaded below', 'Scaffold inspection tag current',
                      'Rescue plan available and communicated', 'Weather conditions acceptable (wind <45km/h)'],
        'permits_needed': ['Work at Height Permit'],
        'risk_boost': 2,
        'category': 'height_work',
    },
    {
        'keywords': ['confined space', 'tank', 'vessel', 'pit', 'manhole', 'sewer', 'duct', 'tunnel', 'silo',
                     'மூடிய இடம்', 'தொட்டி', 'बंद स्थान', 'टैंक'],
        'hazards': ['Oxygen deficiency or enrichment', 'Toxic gas accumulation (H2S, CO, CH4)',
                    'Engulfment by stored materials', 'Entrapment', 'Explosion from flammable atmosphere'],
        'controls': ['Continuous gas monitoring (O2, LEL, H2S, CO)', 'Forced ventilation before and during entry',
                     'Standby person at entry point at all times', 'Rescue equipment (tripod, lifeline) ready',
                     'Entry permit signed by authorized person', 'Communication system established'],
        'ppe': ['scba_or_supplied_air', 'full_body_harness', 'helmet', 'safety_boots', 'chemical_resistant_gloves'],
        'checklist': ['Gas test completed and within limits', 'Ventilation running and effective',
                      'Standby person assigned and trained', 'Rescue equipment at entry point',
                      'Entry permit signed', 'Communication check done'],
        'permits_needed': ['Confined Space Entry Permit', 'Gas Testing Certificate'],
        'risk_boost': 3,
        'category': 'confined_space',
    },
    {
        'keywords': ['electrical', 'electric', 'power', 'voltage', 'cable', 'panel', 'switchgear', 'live', 'energized',
                     'மின்சாரம்', 'மின்', 'बिजली', 'विद्युत', 'केबल'],
        'hazards': ['Electric shock / electrocution', 'Arc flash and arc blast', 'Burns from electrical energy',
                    'Fire from electrical fault', 'Stored energy release'],
        'controls': ['Lockout/Tagout (LOTO) applied and verified', 'Voltage tested with calibrated meter',
                     'Arc flash boundary established', 'Insulated tools only', 'Rubber insulating matting at work area',
                     'Authorized electrical person only'],
        'ppe': ['arc_flash_suit', 'insulated_gloves', 'face_shield', 'safety_boots', 'helmet'],
        'checklist': ['LOTO applied and verified by authorized person', 'Voltage tested — confirmed de-energized',
                      'Arc flash boundary marked', 'Insulated tools inspected', 'Rubber matting in place',
                      'Electrical permit signed'],
        'permits_needed': ['Electrical Work Permit', 'LOTO Certificate'],
        'risk_boost': 3,
        'category': 'electrical',
    },
    {
        'keywords': ['excavat', 'dig', 'trench', 'underground', 'soil', 'earth', 'borehole', 'foundation',
                     'தோண்டுதல்', 'அகழ்வு', 'खुदाई', 'खनन'],
        'hazards': ['Trench collapse / cave-in', 'Underground utility strike (gas, electric, water)',
                    'Flooding of excavation', 'Falling into excavation', 'Unstable ground conditions'],
        'controls': ['Underground utility survey completed', 'Shoring or benching installed for depth >1.2m',
                     'Barriers and warning signs around excavation', 'Dewatering pump available',
                     'Competent person inspection before each shift', 'Ladder access provided'],
        'ppe': ['helmet', 'safety_boots', 'hi_vis_vest', 'gloves'],
        'checklist': ['Underground utility survey completed', 'Shoring installed (if depth >1.2m)',
                      'Barriers and signs in place', 'Competent person inspection done',
                      'Dewatering equipment available', 'Ladder access provided'],
        'permits_needed': ['Excavation Permit', 'Underground Services Clearance'],
        'risk_boost': 2,
        'category': 'excavation',
    },
    {
        'keywords': ['chemical', 'acid', 'solvent', 'toxic', 'hazardous', 'corrosive', 'flammable liquid', 'paint',
                     'ரசாயனம்', 'அமிலம்', 'रसायन', 'एसिड', 'विषाक्त'],
        'hazards': ['Chemical inhalation / poisoning', 'Skin and eye contact burns', 'Fire/explosion from flammable chemicals',
                    'Environmental contamination', 'Spill and slip hazard'],
        'controls': ['SDS (Safety Data Sheet) reviewed and available', 'Chemical storage in approved containers',
                     'Spill kit available at work area', 'Adequate ventilation or LEV system',
                     'Emergency eyewash/shower within 10 seconds travel', 'Chemical waste disposal plan'],
        'ppe': ['chemical_resistant_gloves', 'chemical_goggles', 'face_shield', 'chemical_resistant_coveralls', 'respirator'],
        'checklist': ['SDS reviewed and available at work site', 'Spill kit available and accessible',
                      'Ventilation adequate or LEV running', 'Emergency eyewash/shower accessible',
                      'Chemical waste disposal arranged', 'Personnel trained on chemical handling'],
        'permits_needed': ['Chemical Handling Permit'],
        'risk_boost': 2,
        'category': 'chemical',
    },
    {
        'keywords': ['pipe', 'piping', 'pressure', 'steam', 'hydraulic', 'pneumatic', 'valve', 'flange',
                     'குழாய்', 'அழுத்தம்', 'पाइप', 'दबाव', 'भाप'],
        'hazards': ['Pressurized fluid release', 'Burns from steam/hot fluids', 'Struck by ejected components',
                    'Asphyxiation from gas release'],
        'controls': ['System depressurized and vented before work', 'Pressure gauge reads zero',
                     'Isolation valves locked and tagged', 'Bleed valve opened to confirm zero pressure',
                     'Pressure test after reassembly'],
        'ppe': ['face_shield', 'gloves', 'safety_boots', 'helmet'],
        'checklist': ['System depressurized and vented', 'Pressure gauge reads zero',
                      'Isolation valves LOTO applied', 'Bleed valve confirmed zero pressure',
                      'Work area clear of non-essential personnel'],
        'permits_needed': ['Pressure System Work Permit'],
        'risk_boost': 1,
        'category': 'pressure_work',
    },
]

PPE_LABELS = {
    'helmet': 'Safety Helmet',
    'gloves': 'Safety Gloves',
    'safety_boots': 'Safety Boots',
    'goggles': 'Safety Goggles',
    'face_shield': 'Face Shield',
    'respirator': 'Respirator / Dust Mask',
    'hi_vis_vest': 'Hi-Vis Vest',
    'full_body_harness': 'Full Body Harness',
    'welding_shield': 'Welding Face Shield',
    'leather_gloves': 'Leather Welding Gloves',
    'fire_resistant_coveralls': 'Fire Resistant Coveralls',
    'arc_flash_suit': 'Arc Flash Suit (cal/cm²)',
    'insulated_gloves': 'Insulated Electrical Gloves',
    'scba_or_supplied_air': 'SCBA / Supplied Air Respirator',
    'chemical_resistant_gloves': 'Chemical Resistant Gloves',
    'chemical_goggles': 'Chemical Splash Goggles',
    'chemical_resistant_coveralls': 'Chemical Resistant Coveralls',
}

BASE_PPE = ['helmet', 'safety_boots', 'hi_vis_vest', 'gloves']

PERMIT_TYPE_DEFAULTS = {
    'hot_work': {
        'checklist': ['Fire extinguisher checked', 'Gas test completed', 'Fire watch assigned',
                      'Flammable materials cleared', 'Hot work permit displayed'],
        'ppe': ['helmet', 'welding_shield', 'leather_gloves', 'fire_resistant_coveralls', 'safety_boots'],
    },
    'height_work': {
        'checklist': ['Harness inspected', 'Anchor point verified', 'Exclusion zone barricaded',
                      'Scaffold tag current', 'Rescue plan ready'],
        'ppe': ['helmet', 'full_body_harness', 'safety_boots', 'hi_vis_vest', 'gloves'],
    },
    'confined_space': {
        'checklist': ['Gas test done', 'Ventilation running', 'Standby person assigned',
                      'Rescue equipment ready', 'Entry permit signed'],
        'ppe': ['scba_or_supplied_air', 'full_body_harness', 'helmet', 'safety_boots'],
    },
    'electrical': {
        'checklist': ['LOTO applied', 'Voltage tested zero', 'Arc flash boundary marked',
                      'Insulated tools checked', 'Electrical permit signed'],
        'ppe': ['arc_flash_suit', 'insulated_gloves', 'face_shield', 'safety_boots', 'helmet'],
    },
    'excavation': {
        'checklist': ['Underground survey done', 'Shoring installed', 'Barriers in place',
                      'Competent person inspection done'],
        'ppe': ['helmet', 'safety_boots', 'hi_vis_vest', 'gloves'],
    },
    'general': {
        'checklist': ['PPE inspected', 'Tools checked', 'Work area inspected',
                      'Emergency contacts confirmed', 'Supervisor briefed'],
        'ppe': BASE_PPE,
    },
}


def _normalize(text: str) -> str:
    return text.lower().strip()


def analyze_work_description(description: str, permit_type_category: str = '') -> dict:
    """
    Analyze work description and return AI-generated safety data.
    Matches keywords in English, Tamil, and Hindi.
    """
    text = _normalize(description)
    matched = []

    for pattern in HAZARD_PATTERNS:
        if any(kw.lower() in text for kw in pattern['keywords']):
            matched.append(pattern)

    # Deduplicate
    all_hazards = list(dict.fromkeys(h for p in matched for h in p['hazards']))
    all_controls = list(dict.fromkeys(c for p in matched for c in p['controls']))
    all_ppe = list(dict.fromkeys(p for pat in matched for p in pat['ppe']))
    all_checklist = list(dict.fromkeys(c for p in matched for c in p['checklist']))
    all_permits = list(dict.fromkeys(p for pat in matched for p in pat['permits_needed']))
    risk_boost = sum(p['risk_boost'] for p in matched)
    categories = list(dict.fromkeys(p['category'] for p in matched))

    # Merge with permit type defaults
    pt_defaults = PERMIT_TYPE_DEFAULTS.get(permit_type_category, PERMIT_TYPE_DEFAULTS['general'])
    for item in pt_defaults['checklist']:
        if item not in all_checklist:
            all_checklist.append(item)
    for ppe in pt_defaults['ppe']:
        if ppe not in all_ppe:
            all_ppe.append(ppe)

    # Always include base PPE
    for ppe in BASE_PPE:
        if ppe not in all_ppe:
            all_ppe.append(ppe)

    # Risk score calculation
    base_probability = min(3 + len(matched), 5)
    base_severity = min(2 + len(matched), 5)
    risk_score = base_probability * base_severity
    if risk_score <= 4:
        risk_level = 'Low'
    elif risk_score <= 9:
        risk_level = 'Medium'
    elif risk_score <= 16:
        risk_level = 'High'
    else:
        risk_level = 'Extreme'

    return {
        'detected_categories': categories,
        'hazards': all_hazards,
        'controls': all_controls,
        'ppe_requirements': [PPE_LABELS.get(p, p) for p in all_ppe],
        'ppe_codes': all_ppe,
        'checklist': all_checklist,
        'permits_needed': all_permits,
        'risk': {
            'probability': base_probability,
            'severity': base_severity,
            'score': risk_score,
            'level': risk_level,
        },
        'confidence': 'high' if matched else 'low',
        'matched_patterns': len(matched),
    }


def validate_permit(data: dict) -> dict:
    """
    AI validation before permit submission.
    Returns warnings, errors, and recommendations.
    """
    errors = []
    warnings = []
    recommendations = []

    description = data.get('description', '')
    ppe = data.get('ppe_requirements', [])
    checklist = data.get('safety_checklist', {})
    probability = data.get('probability', 1)
    severity = data.get('severity', 1)
    hazards = data.get('hazards', '')
    controls = data.get('control_measures', '')
    start = data.get('planned_start_time', '')
    end = data.get('planned_end_time', '')

    # Description checks
    if len(description) < 20:
        errors.append('Work description is too brief. Provide at least 20 characters describing the work activity.')
    if not any(c.isalpha() for c in description):
        errors.append('Work description must contain meaningful text.')

    # PPE checks
    if not ppe:
        errors.append('PPE requirements must be specified.')
    if len(ppe) < 2:
        warnings.append('Only minimal PPE specified. Review if additional PPE is required for this work.')

    # Checklist checks
    checked_items = [k for k, v in checklist.items() if v] if isinstance(checklist, dict) else []
    if len(checked_items) < 3:
        warnings.append('Less than 3 safety checklist items checked. Ensure all applicable items are verified.')

    # Risk checks
    risk_score = int(probability) * int(severity)
    if risk_score >= 15:
        warnings.append(f'High risk score ({risk_score}). Ensure additional controls and senior approval.')
        recommendations.append('Consider a formal Job Safety Analysis (JSA) for this high-risk activity.')

    # Hazard/control balance
    if description and not hazards and not controls:
        recommendations.append('Add identified hazards and control measures for a complete risk assessment.')

    # Time checks
    if start and end and start >= end:
        errors.append('Planned end time must be after start time.')

    # Keyword-based warnings
    text = _normalize(description)
    if any(kw in text for kw in ['weld', 'welding', 'arc', 'torch', 'வெல்டிங்', 'वेल्डिंग']):
        if not any('fire' in str(c).lower() for c in ppe):
            warnings.append('Hot work detected but fire-resistant PPE not listed. Add fire resistant coveralls.')
        if not any('gas test' in str(c).lower() for c in checked_items):
            warnings.append('Hot work detected but gas test not in checklist. Gas testing is mandatory for hot work.')

    if any(kw in text for kw in ['height', 'scaffold', 'ladder', 'உயரம்', 'ऊंचाई']):
        if not any('harness' in str(p).lower() for p in ppe):
            errors.append('Work at height detected but fall protection harness not in PPE list.')

    if any(kw in text for kw in ['confined', 'tank', 'vessel', 'manhole', 'மூடிய', 'बंद']):
        if not any('gas' in str(c).lower() for c in checked_items):
            errors.append('Confined space work detected but gas test not in checklist. This is mandatory.')
        if not any('standby' in str(c).lower() or 'rescue' in str(c).lower() for c in checked_items):
            errors.append('Confined space work requires standby person and rescue equipment in checklist.')

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'recommendations': recommendations,
        'risk_score': risk_score,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_assist(request):
    """
    PTW AI assist — delegates to the centralized AI layer.
    Kept for backward compatibility with existing frontend calls to /api/ptw/ai/assist/
    """
    from ai.views import ptw_assist
    return ptw_assist(request)
