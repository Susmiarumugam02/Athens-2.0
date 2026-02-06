from django.urls import path
from .views import unified_login, token_refresh, logout, list_users

app_name = 'authentication'

urlpatterns = [
    path("login/", unified_login, name='login'),
    path("token/refresh/", token_refresh, name='token-refresh'),
    path("logout/", logout, name='logout'),
    path("users/", list_users, name='list-users'),
]
