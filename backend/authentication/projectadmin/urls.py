from django.urls import path
from . import views

app_name = 'projectadmin'

urlpatterns = [
    path('users/',                          views.users_list_create,  name='users-list-create'),
    path('users/<int:user_id>/delete/',     views.user_delete,        name='user-delete'),
    path('users/<int:user_id>/reset-password/', views.user_reset_password, name='user-reset-password'),
    path('approvals/',                      views.pending_approvals,  name='pending-approvals'),
    path('approvals/<int:user_id>/approve/', views.approve_user,      name='approve-user'),
    path('approvals/<int:user_id>/reject/',  views.reject_user,       name='reject-user'),
    path('profile/complete/',               views.complete_profile,   name='complete-profile'),
    path('status/',                         views.my_status,          name='my-status'),
]
