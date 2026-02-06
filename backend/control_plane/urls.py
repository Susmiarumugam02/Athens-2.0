from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, SubscriptionViewSet, MasterAdminViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'masters', MasterAdminViewSet, basename='master')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('', include(router.urls)),
]
