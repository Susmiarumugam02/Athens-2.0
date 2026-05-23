from django.urls import path
from . import ai_views

urlpatterns = [
    path('predict-incident', ai_views.predict_incident, name='ai-platform-predict-incident'),
    path('analyze-ptw', ai_views.analyze_ptw, name='ai-platform-analyze-ptw'),
    path('detect-anomaly', ai_views.detect_anomaly, name='ai-platform-detect-anomaly'),
    path('risk-dashboard', ai_views.risk_dashboard, name='ai-platform-risk-dashboard'),
    path('worker-risk/<int:worker_id>', ai_views.worker_risk, name='ai-platform-worker-risk'),
    path('project-risk/<int:project_id>', ai_views.project_risk, name='ai-platform-project-risk'),
]
