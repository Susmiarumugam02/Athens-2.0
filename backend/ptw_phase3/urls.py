from django.urls import path
from .views import (
    site_maps, site_map_detail,
    weather_readings, weather_alerts,
    ai_approval_recommendation,
    iot_devices, iot_reading,
    emergency_plans, emergency_events,
    command_center_snapshot,
    safety_brain,
    dispatch_agent,
    global_search,
    contractor_scores,
    my_notifications, mark_notification_read,
)

app_name = 'ptw_phase3'

urlpatterns = [
    # Site Maps
    path('site-maps/', site_maps, name='phase3-site-maps'),
    path('site-maps/<int:pk>/', site_map_detail, name='phase3-site-map-detail'),

    # Weather
    path('weather/', weather_readings, name='phase3-weather'),
    path('weather/alerts/', weather_alerts, name='phase3-weather-alerts'),

    # AI Approval
    path('ai-approval/', ai_approval_recommendation, name='phase3-ai-approval'),
    path('ai-approval/<int:permit_id>/', ai_approval_recommendation, name='phase3-ai-approval-permit'),

    # IoT
    path('iot/devices/', iot_devices, name='phase3-iot-devices'),
    path('iot/devices/<int:device_id>/reading/', iot_reading, name='phase3-iot-reading'),

    # Emergency
    path('emergency/plans/', emergency_plans, name='phase3-emergency-plans'),
    path('emergency/events/', emergency_events, name='phase3-emergency-events'),

    # Command Center
    path('command-center/', command_center_snapshot, name='phase3-command-center'),

    # Safety Brain
    path('safety-brain/', safety_brain, name='phase3-safety-brain'),

    # Agent Dispatch
    path('agents/dispatch/', dispatch_agent, name='phase3-agent-dispatch'),

    # Search
    path('search/', global_search, name='phase3-search'),

    # Contractor Scores
    path('contractor-scores/', contractor_scores, name='phase3-contractor-scores'),

    # Notifications
    path('notifications/', my_notifications, name='phase3-notifications'),
    path('notifications/<int:pk>/read/', mark_notification_read, name='phase3-notification-read'),
]
