from django.urls import path
from .views import (
    ptw_assist, ai_chat, incident_assist, inspection_assist,
    translate_assist, smart_autofill, safety_recommendations,
    workflow_guidance, hazard_prediction, incident_prediction,
    live_monitoring, compliance_validation, worker_validation,
    image_analysis, document_analysis, ai_health, conversation_history,
)
from .context_views import (
    company_intelligence, project_intelligence, location_intelligence,
    smart_context_engine, context_memory, vector_search, index_document,
)

app_name = 'ai'

urlpatterns = [
    # Core PTW AI
    path('ptw/',                    ptw_assist,             name='ai-ptw-assist'),
    path('chat/',                   ai_chat,                name='ai-chat'),
    path('incident/',               incident_assist,        name='ai-incident-assist'),
    path('inspection/',             inspection_assist,      name='ai-inspection-assist'),
    path('translate/',              translate_assist,       name='ai-translate'),
    path('autofill/',               smart_autofill,         name='ai-smart-autofill'),
    path('safety/',                 safety_recommendations, name='ai-safety-recommendations'),
    path('workflow/',               workflow_guidance,      name='ai-workflow-guidance'),
    path('hazards/',                hazard_prediction,      name='ai-hazard-prediction'),
    path('incident-prediction/',    incident_prediction,    name='ai-incident-prediction'),
    path('monitoring/',             live_monitoring,        name='ai-live-monitoring'),
    path('compliance/',             compliance_validation,  name='ai-compliance-validation'),
    path('worker-validation/',      worker_validation,      name='ai-worker-validation'),
    path('image-analysis/',         image_analysis,         name='ai-image-analysis'),
    path('document-analysis/',      document_analysis,      name='ai-document-analysis'),
    path('health/',                 ai_health,              name='ai-health'),
    path('conversations/',          conversation_history,   name='ai-conversations'),
    path('conversations/<int:conversation_id>/', conversation_history, name='ai-conversation-detail'),

    # Context Intelligence Engine
    path('context/company/',        company_intelligence,           name='ai-company-intelligence'),
    path('context/project/',        project_intelligence,           name='ai-project-intelligence'),
    path('context/project/<int:project_id>/', project_intelligence, name='ai-project-intelligence-detail'),
    path('context/location/',       location_intelligence,          name='ai-location-intelligence'),
    path('context/engine/',         smart_context_engine,           name='ai-smart-context-engine'),
    path('context/memory/',         context_memory,                 name='ai-context-memory'),

    # Vector Memory
    path('vector/search/',          vector_search,                  name='ai-vector-search'),
    path('vector/index/',           index_document,                 name='ai-vector-index'),
]
