from django.urls import path
from .views import master_admin_login, company_user_login, token_refresh, logout

app_name = 'authentication'

urlpatterns = [
    path("master-admin/login/", master_admin_login, name='master-admin-login'),
    path("company/login/", company_user_login, name='company-user-login'),
    path("token/refresh/", token_refresh, name='token-refresh'),
    path("logout/", logout, name='logout'),
]
