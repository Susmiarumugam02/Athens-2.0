from django.urls import path
from . import views
from . import workforce_views

urlpatterns = [
    # Admin attendance
    path('dashboard/', views.attendance_dashboard, name='admin-attendance-dashboard'),
    path('', views.attendance_list, name='admin-attendance-list'),
    path('manual/', views.mark_manual_attendance, name='admin-attendance-manual'),
    path('<int:pk>/correct/', views.correct_attendance, name='admin-attendance-correct'),
    path('<int:pk>/force-checkout/', views.force_checkout, name='admin-attendance-force-checkout'),
    path('export/', views.export_attendance, name='admin-attendance-export'),

    # Workforce management
    path('admins/<int:admin_id>/employees/', workforce_views.employees_under_admin, name='admin-employees'),
    path('user-attendance/', workforce_views.user_attendance_dashboard, name='user-attendance-dashboard'),
    path('leave-requests/', workforce_views.leave_requests_list, name='leave-requests-list'),
    path('leave-requests/<int:pk>/approve/', workforce_views.approve_leave_request, name='leave-approve'),
    path('leave-requests/<int:pk>/reject/', workforce_views.reject_leave_request, name='leave-reject'),
    path('payroll-entries/', workforce_views.payroll_entries_list, name='payroll-entries-list'),
    path('payroll-entries/<int:pk>/approve/', workforce_views.approve_payroll_payment, name='payroll-approve'),
    path('pending-approvals/', workforce_views.pending_approvals_summary, name='pending-approvals'),
]
