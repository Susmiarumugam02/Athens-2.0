from django.urls import path
from .views import (
    ml_status, train_models,
    predict_incident, predict_permits_batch,
    predict_worker, predict_workers_batch,
    predict_contractor,
    detect_anomaly, anomaly_scan, anomaly_records, review_anomaly,
    smart_risk_score,
    ml_dashboard,
    ml_ai_hybrid,
    prediction_history,
)

app_name = 'ml'

urlpatterns = [
    path('status/',                 ml_status,              name='ml-status'),
    path('train/',                  train_models,           name='ml-train'),
    path('predict/incident/',       predict_incident,       name='ml-predict-incident'),
    path('predict/incidents/batch/', predict_permits_batch, name='ml-predict-incidents-batch'),
    path('predict/worker/',         predict_worker,         name='ml-predict-worker'),
    path('predict/workers/batch/',  predict_workers_batch,  name='ml-predict-workers-batch'),
    path('predict/contractor/',     predict_contractor,     name='ml-predict-contractor'),
    path('anomaly/detect/',         detect_anomaly,         name='ml-anomaly-detect'),
    path('anomaly/scan/',           anomaly_scan,           name='ml-anomaly-scan'),
    path('anomaly/records/',        anomaly_records,        name='ml-anomaly-records'),
    path('anomaly/records/<int:pk>/review/', review_anomaly, name='ml-anomaly-review'),
    path('risk/smart/',             smart_risk_score,       name='ml-smart-risk'),
    path('dashboard/',              ml_dashboard,           name='ml-dashboard'),
    path('hybrid/',                 ml_ai_hybrid,           name='ml-hybrid'),
    path('predictions/',            prediction_history,     name='ml-predictions'),
]
