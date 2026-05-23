from django.urls import path
from . import views

app_name = 'masteradmin'

urlpatterns = [
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('my-tenant/', views.my_tenant, name='my-tenant'),
    path('projects/', views.projects_list_create, name='projects-list-create'),
    path('projects/<int:project_id>/', views.project_detail, name='project-detail'),
    path('projects/<int:project_id>/admins/', views.project_admins, name='project-admins'),
    path('projects/<int:project_id>/analytics/', views.projects_with_analytics, name='projects-analytics'),
    path('projects/analytics/', views.projects_with_analytics, name='all-projects-analytics'),
    path('admin-users/<int:admin_id>/users/', views.admin_created_users, name='admin-created-users'),
    path('users/', views.tenant_users, name='tenant-users'),
    path('users/<int:user_id>/approve/', views.approve_user, name='approve-user'),
    path('users/<int:user_id>/reset-password/', views.reset_admin_user_password, name='reset-admin-password'),
    path('users/<int:user_id>/toggle-status/', views.toggle_admin_user_status, name='toggle-admin-status'),
    path('admin-users/', views.admin_users_list_create, name='admin-users-list-create'),
    path('admin-users/create-project-admin/', views.create_project_admin, name='create-project-admin'),
    path('admin-users/<int:user_id>/', views.admin_user_delete, name='admin-user-delete'),
]