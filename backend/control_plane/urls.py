from django.urls import path, include

from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, SubscriptionViewSet, AuditLogViewSet, AthensAuditLogViewSet, TenantServiceViewSet, MasterAdminViewSet, subscription_status, update_subscription_dates
from .project_module_views import ProjectModuleViewSet
from .onboarding_views import (
    submit_company_profile, my_company_profile,
    list_pending_profiles, approve_company_profile, reject_company_profile
)


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
    path('subscription-status/', subscription_status, name='subscription-status'),
    path('masters/<int:master_id>/subscription/', update_subscription_dates, name='update-subscription-dates'),
    path('company-profile/submit/', submit_company_profile, name='company-profile-submit'),
    path('company-profile/me/', my_company_profile, name='company-profile-me'),
    path('company-profile/pending/', list_pending_profiles, name='company-profile-pending'),
    path('company-profile/<int:tenant_id>/approve/', approve_company_profile, name='company-profile-approve'),
    path('company-profile/<int:tenant_id>/reject/', reject_company_profile, name='company-profile-reject'),
]
