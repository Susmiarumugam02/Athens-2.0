from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, SubscriptionViewSet, AuditLogViewSet, AthensAuditLogViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'athens-audit-logs', AthensAuditLogViewSet, basename='athens-audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
