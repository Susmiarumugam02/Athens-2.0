from django.urls import path, include
from rest_framework.routers import DefaultRouter

from superadmin.api.users import SuperAdminUserViewSet
from superadmin.api.roles import RoleViewSet, PermissionViewSet
from superadmin.api.security import (
    PasswordPolicyView, TwoFactorSettingsView, IPRestrictionViewSet,
    SessionSettingsView, ActiveSessionsView, NotificationEmailView
)
from superadmin.api.audit import AuditLogViewSet
from superadmin.api.notifications import AnnouncementViewSet, NotificationDeliveryViewSet
from superadmin.api.settings import (
    SystemSettingsView, DatabaseBackupViewSet, MaintenanceModeView
)
from superadmin.api.dashboard import DashboardStatsView, DashboardActivityView, AnalyticsView
from superadmin.api import ultra_secure

router = DefaultRouter()
router.register(r'users', SuperAdminUserViewSet, basename='superadmin-users')
router.register(r'roles', RoleViewSet, basename='superadmin-roles')
router.register(r'permissions', PermissionViewSet, basename='superadmin-permissions')
router.register(r'audit-logs', AuditLogViewSet, basename='superadmin-audit-logs')
router.register(r'announcements', AnnouncementViewSet, basename='superadmin-announcements')
router.register(r'notification-deliveries', NotificationDeliveryViewSet, basename='superadmin-notification-deliveries')
router.register(r'security/ip-restrictions', IPRestrictionViewSet, basename='superadmin-ip-restrictions')
router.register(r'backups', DatabaseBackupViewSet, basename='superadmin-backups')

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
    
    # Security
    path('security/password-policy/', PasswordPolicyView.as_view(), name='password-policy'),
    path('security/2fa-settings/', TwoFactorSettingsView.as_view(), name='2fa-settings'),
    path('security/session-settings/', SessionSettingsView.as_view(), name='session-settings'),
    path('security/active-sessions/', ActiveSessionsView.as_view(), name='active-sessions'),
    path('security/notification-email/', NotificationEmailView.as_view(), name='notification-email'),
    
    # Settings
    path('settings/system/', SystemSettingsView.as_view(), name='system-settings'),
    path('settings/maintenance/', MaintenanceModeView.as_view(), name='maintenance-mode'),
    
    # Ultra-Secure Settings
    path('settings/ultra-secure/', ultra_secure.ultra_secure_settings, name='ultra-secure-settings'),
    path('settings/password/change/', ultra_secure.change_ultra_password, name='change-ultra-password'),
    path('settings/api-key/regenerate/', ultra_secure.regenerate_api_key, name='regenerate-api-key'),
    path('settings/recovery-codes/regenerate/', ultra_secure.regenerate_recovery_codes, name='regenerate-recovery-codes'),
    path('settings/2fa/status/', ultra_secure.two_factor_status, name='2fa-status'),
    path('settings/2fa/toggle/', ultra_secure.toggle_two_factor, name='toggle-2fa'),
    path('security/status/', ultra_secure.security_status, name='security-status'),
    path('security/log/', ultra_secure.security_log, name='security-log'),
    
    # Router URLs
    path('', include(router.urls)),
]
