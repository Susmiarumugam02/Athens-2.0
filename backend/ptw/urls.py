from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .team_members_api import get_users_by_type_and_grade
from .webhook_views import WebhookEndpointViewSet
from .risk_assessment import RiskAssessmentViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'permit-types', views.PermitTypeViewSet)
router.register(r'hazards', views.HazardLibraryViewSet)
router.register(r'workflow-templates', views.WorkflowTemplateViewSet)
router.register(r'permits', views.PermitViewSet)
router.register(r'permit-workers', views.PermitWorkerViewSet)
router.register(r'permit-approvals', views.PermitApprovalViewSet)
router.register(r'permit-extensions', views.PermitExtensionViewSet)
router.register(r'permit-audits', views.PermitAuditViewSet)
router.register(r'gas-readings', views.GasReadingViewSet)
router.register(r'permit-photos', views.PermitPhotoViewSet)
router.register(r'digital-signatures', views.DigitalSignatureViewSet)
router.register(r'workflow-instances', views.WorkflowInstanceViewSet)
router.register(r'system-integrations', views.SystemIntegrationViewSet)
router.register(r'compliance-reports', views.ComplianceReportViewSet)
router.register(r'isolation-points', views.IsolationPointLibraryViewSet)
router.register(r'permit-isolation-points', views.PermitIsolationPointViewSet)
router.register(r'webhooks', WebhookEndpointViewSet, basename='webhook')
router.register(r'risk-assessments', RiskAssessmentViewSet, basename='risk-assessment')

urlpatterns = [
    # Workflow URLs (must come before router to avoid conflicts)
    path('', include('ptw.workflow_urls')),
    
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional API endpoints
    path('sync-offline-data/', views.sync_offline_data, name='sync-offline-data'),
    path('qr-scan/<str:qr_code>/', views.qr_scan_permit, name='qr-scan-permit'),
    path('mobile-permit/<int:permit_id>/', views.mobile_permit_view, name='mobile-permit-view'),
    path('team-members/get_users_by_type_and_grade/', get_users_by_type_and_grade, name='get-users-by-type-and-grade'),
    
    # Online/Offline Status Management
    path('status/update/', views.update_online_status, name='update-online-status'),
    path('status/online-users/', views.get_online_users, name='get-online-users'),
    path('status/system/', views.get_system_status, name='get-system-status'),
    path('work-time-settings/', views.get_work_time_settings, name='get-work-time-settings'),
    
    # Legacy endpoints for backward compatibility
    path('permit-types/', views.PermitTypeViewSet.as_view({'get': 'list', 'post': 'create'}), name='permit-types-list'),
    path('permits/', views.PermitViewSet.as_view({'get': 'list', 'post': 'create'}), name='permits-list'),
    path('permits/<int:pk>/', views.PermitViewSet.as_view({
        'get': 'retrieve', 
        'put': 'update', 
        'patch': 'partial_update', 
        'delete': 'destroy'
    }), name='permit-detail'),
    path('permits/<int:pk>/verify/', views.PermitViewSet.as_view({
        'post': 'verify'
    }), name='permit-verify'),
    path('permits/<int:pk>/approve/', views.PermitViewSet.as_view({
        'post': 'approve'
    }), name='permit-approve'),
    path('permits/<int:pk>/reject/', views.PermitViewSet.as_view({
        'post': 'reject'
    }), name='permit-reject'),
]