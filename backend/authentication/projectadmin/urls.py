from django.urls import path
from . import views

app_name = 'projectadmin'

urlpatterns = [
    # User CRUD
    path('users/',                                  views.users_list_create,        name='users-list-create'),
    path('users/<int:user_id>/delete/',             views.user_delete,              name='user-delete'),
    path('users/<int:user_id>/reset-password/',     views.user_reset_password,      name='user-reset-password'),
    path('users/<int:user_id>/suspend/',            views.suspend_user,             name='user-suspend'),
    path('users/<int:user_id>/activate/',           views.activate_user,            name='user-activate'),

    # Approval workflow
    path('approvals/',                              views.pending_approvals,        name='pending-approvals'),
    path('approvals/<int:user_id>/approve/',        views.approve_user,             name='approve-user'),
    path('approvals/<int:user_id>/reject/',         views.reject_user,              name='reject-user'),
    path('approvals/<int:user_id>/corrections/',    views.request_corrections,      name='request-corrections'),

    # Induction attendance
    path('users/<int:user_id>/mark-induction/',     views.mark_induction_attendance, name='mark-induction'),

    # Dashboard stats
    path('users/stats/',                            views.all_users_status,         name='users-stats'),

    # Profile completion (user side)
    path('profile/complete/',                       views.complete_profile,         name='complete-profile'),
    path('profile/',                                views.get_profile,              name='get-profile'),
    path('status/',                                 views.my_status,                name='my-status'),
]
