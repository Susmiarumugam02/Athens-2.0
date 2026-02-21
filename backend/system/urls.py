from django.urls import path
from .views import (
    health, 
    list_services, 
    list_tenant_services, 
    enable_service, 
    disable_service,
    service_stats,
    update_service_config,
    change_service_tier
)

urlpatterns = [
    path("health/", health),
    path("services/", list_services),
    path("tenant-services/", list_tenant_services),
    path("tenant-services/stats/", service_stats),
    path("tenant-services/<str:service_code>/enable/", enable_service),
    path("tenant-services/<str:service_code>/disable/", disable_service),
    path("tenant-services/<str:service_code>/config/", update_service_config),
    path("tenant-services/<str:service_code>/tier/", change_service_tier),
]
