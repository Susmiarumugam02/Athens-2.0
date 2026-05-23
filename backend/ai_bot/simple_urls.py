"""
Lightweight AI chat endpoint — no ML/sentence_transformers required.
Uses keyword matching against EHS knowledge base for instant responses.
"""
from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from authentication.tenant_scoped_utils import ensure_tenant_context
import re

# ─── EHS Knowledge Base ───────────────────────────────────────────────────────

EHS_KB = {
    'ptw': (
        "A Permit to Work (PTW) is a formal written system used to control certain types of work "
        "that are potentially hazardous. It ensures that all necessary precautions are taken before "
        "work begins. Key steps: 1) Identify hazards, 2) Assess risks, 3) Implement controls, "
        "4) Get authorization, 5) Monitor work, 6) Close out permit."
    ),
    'hot work': (
        "Hot work includes welding, cutting, grinding, and brazing. Safety requirements: "
        "fire watch for 30 minutes after work, remove combustibles within 35ft, "
        "have fire extinguisher ready, check for flammable vapors, and obtain hot work permit."
    ),
    'confined space': (
        "Confined space entry requires: atmospheric testing (O2, LEL, H2S, CO), "
        "continuous monitoring, mechanical ventilation, entry supervisor, rescue team on standby, "
        "and communication system. Never enter without a valid confined space permit."
    ),
    'electrical': (
        "Electrical safety: always use LOTO (Lockout/Tagout) procedures, verify isolation before work, "
        "use insulated tools, wear appropriate PPE (arc flash suit for HV work), "
        "and ensure only qualified electricians perform electrical work."
    ),
    'height': (
        "Working at height safety: use fall protection harness, install guardrails, "
        "establish exclusion zones below, inspect equipment before use, "
        "check weather conditions, and have a rescue plan in place."
    ),
    'ppe': (
        "Personal Protective Equipment (PPE) selection depends on the hazard. "
        "Common PPE: safety helmet, safety shoes, gloves, goggles, high-vis vest. "
        "For specific hazards: respirator (chemical/dust), harness (height), "
        "arc flash suit (electrical), chemical suit (hazardous substances)."
    ),
    'incident': (
        "Incident reporting: report ALL incidents immediately to supervisor. "
        "Steps: 1) Ensure safety of injured, 2) Notify supervisor, 3) Preserve scene, "
        "4) Complete incident report within 24 hours, 5) Investigate root cause, "
        "6) Implement corrective actions."
    ),
    'risk': (
        "Risk assessment formula: Risk = Probability × Severity. "
        "Levels: Low (1-4), Medium (5-9), High (10-16), Extreme (17-25). "
        "Control hierarchy: Eliminate → Substitute → Engineering controls → "
        "Administrative controls → PPE."
    ),
    'excavation': (
        "Excavation safety: locate underground utilities before digging, "
        "assess soil conditions, install proper shoring or sloping, "
        "provide safe entry/exit, assign a competent person, "
        "and inspect daily and after rain."
    ),
    'chemical': (
        "Chemical handling: always read SDS (Safety Data Sheet) before use, "
        "use appropriate PPE, ensure proper ventilation, "
        "have spill response kit available, store chemicals properly, "
        "and never mix incompatible chemicals."
    ),
    'fire': (
        "Fire safety: know your evacuation route, locate nearest fire extinguisher, "
        "use PASS technique (Pull, Aim, Squeeze, Sweep), "
        "never use elevators during fire, and report all fire hazards immediately."
    ),
    'loto': (
        "Lockout/Tagout (LOTO) procedure: 1) Notify affected employees, "
        "2) Identify all energy sources, 3) Shut down equipment, "
        "4) Isolate energy sources, 5) Apply locks and tags, "
        "6) Release stored energy, 7) Verify isolation before work."
    ),
}

GREETINGS = {'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'}

SUGGESTIONS = [
    "What is a PTW?",
    "Hot work safety requirements",
    "Confined space entry procedure",
    "Electrical LOTO procedure",
    "Working at height safety",
    "PPE selection guide",
    "How to report an incident",
    "Risk assessment levels",
]


def find_answer(question: str) -> str:
    q = question.lower().strip()

    # Greeting
    if any(g in q for g in GREETINGS):
        return (
            "Hello! I'm your EHS AI Assistant. I can help you with:\n\n"
            "• Permit to Work (PTW) procedures\n"
            "• Hot work, confined space, electrical safety\n"
            "• PPE selection and risk assessment\n"
            "• Incident reporting and LOTO procedures\n\n"
            "Ask me anything about workplace safety!"
        )

    # Keyword match
    for keyword, answer in EHS_KB.items():
        if keyword in q:
            return answer

    # Partial word match
    words = re.findall(r'\w+', q)
    for word in words:
        for keyword, answer in EHS_KB.items():
            if word in keyword or keyword in word:
                return answer

    return (
        "I don't have specific information on that topic. "
        "I can help with: PTW, hot work, confined space, electrical safety, "
        "working at height, PPE, incident reporting, risk assessment, "
        "excavation, chemical handling, fire safety, and LOTO procedures. "
        "Please try rephrasing your question."
    )


# ─── Views ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    try:
        ensure_tenant_context(request)
    except Exception:
        pass  # tenant context is optional for AI chat
    message = (request.data.get('message') or request.data.get('question') or '').strip()
    if not message:
        return Response({'error': 'message is required'}, status=400)
    answer = find_answer(message)
    return Response({'reply': answer, 'suggestions': SUGGESTIONS[:4]})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_suggestions(request):
    try:
        ensure_tenant_context(request)
    except Exception:
        pass
    return Response({'suggestions': SUGGESTIONS})


urlpatterns = [
    path('chat/', ai_chat, name='ai_chat'),
    path('suggestions/', ai_suggestions, name='ai_suggestions'),
]
