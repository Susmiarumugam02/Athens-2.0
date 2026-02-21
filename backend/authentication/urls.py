from django.urls import path, include
from .views import (
    unified_login, token_refresh, logout, list_users,
    dashboard_overview, get_projects, get_admin_users,
    reset_user_password, toggle_user_status
)
from .company_settings import (
    company_details, upload_logo, company_documents, delete_document
)

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
    
    # MasterAdmin endpoints
    path("masteradmin/", include('authentication.masteradmin.urls')),
]
