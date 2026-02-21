from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, SubscriptionViewSet, AuditLogViewSet, AthensAuditLogViewSet, TenantServiceViewSet, MasterAdminViewSet
from .project_module_views import ProjectModuleViewSet

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'athens-audit-logs', AthensAuditLogViewSet, basename='athens-audit-log')
router.register(r'tenant-services', TenantServiceViewSet, basename='tenant-service')
router.register(r'project-modules', ProjectModuleViewSet, basename='project-module')
router.register(r'masters', MasterAdminViewSet, basename='master-admin')

urlpatterns = [
    path('', include(router.urls)),
]
