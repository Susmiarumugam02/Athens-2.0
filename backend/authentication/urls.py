from django.urls import path, include
from .views import (
    unified_login, token_refresh, logout, list_users,
    dashboard_overview, get_projects, get_admin_users,
    reset_user_password, toggle_user_status, my_permissions,
    list_notifications, create_notification, mark_notifications_read, notification_stats,
    current_user_profile,
)
from .company_settings import (
    company_details, upload_logo, company_documents, delete_document
)
from .profile_management import (
    create_user, list_managed_users, pending_approvals,
    approve_user, reject_user, complete_profile,
)
from .training_access import (
    check_training_status, mark_training_complete,
    update_training_progress, get_accessible_modules,
    get_pending_induction_users, post_induction_change_password
)
from .views import company_user_change_password
from .views import departments_list

app_name = 'authentication'

urlpatterns = [
    path("login/", unified_login, name='login'),
    path("token/refresh/", token_refresh, name='token-refresh'),
    path("logout/", logout, name='logout'),
    path("users/", list_users, name='list-users'),
    path("dashboard-overview/", dashboard_overview, name='dashboard-overview'),
    path("projects/", get_projects, name='projects'),
    path("adminusers/", get_admin_users, name='admin-users'),

    # User Management
    path("users/<int:user_id>/reset-password/", reset_user_password, name='reset-user-password'),
    path("users/<int:user_id>/toggle-status/", toggle_user_status, name='toggle-user-status'),

    # RBAC
    path("me/", current_user_profile, name='current-user-profile'),
    path("me/permissions/", my_permissions, name='my-permissions'),

    # Profile Management (Admin)
    path("profile-mgmt/users/", create_user, name='pm-create-user'),
    path("profile-mgmt/users/list/", list_managed_users, name='pm-list-users'),
    path("profile-mgmt/approvals/", pending_approvals, name='pm-pending-approvals'),
    path("profile-mgmt/approvals/<int:user_id>/approve/", approve_user, name='pm-approve-user'),
    path("profile-mgmt/approvals/<int:user_id>/reject/", reject_user, name='pm-reject-user'),

    # Profile Completion (User first login)
    path("profile-mgmt/complete-profile/", complete_profile, name='pm-complete-profile'),

    # MasterAdmin endpoints
    path("masteradmin/", include('authentication.masteradmin.urls')),

    # ProjectAdmin endpoints
    path("projectadmin/", include('authentication.projectadmin.urls')),

    # Notifications
    path("notifications/", list_notifications, name='notifications-list'),
    path("notifications/create/", create_notification, name='notifications-create'),
    path("notifications/mark-read/", mark_notifications_read, name='notifications-mark-read'),
    path("notifications/stats/", notification_stats, name='notifications-stats'),
    
    # Training Access Control
    path("training/status/", check_training_status, name='training-status'),
    path("training/complete/", mark_training_complete, name='training-complete'),
    path("training/progress/", update_training_progress, name='training-progress'),
    path("training/accessible-modules/", get_accessible_modules, name='accessible-modules'),
    path("training/pending-users/", get_pending_induction_users, name='pending-induction-users'),
    path("training/change-password/", post_induction_change_password, name='post-induction-change-password'),
    path("company-dashboard/security/password-change/", company_user_change_password, name='company-user-password-change'),
    path("departments/", departments_list, name='departments-list'),
]
