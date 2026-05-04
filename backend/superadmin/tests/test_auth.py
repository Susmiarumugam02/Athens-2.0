import pytest
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    return User.objects.create_user(
        email='superadmin@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN,
        is_active=True
    )


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email='regular@test.com',
        password='testpass123',
        user_type=UserType.COMPANYUSER,
        is_active=True
    )


@pytest.fixture
def authenticated_superadmin(api_client, superadmin_user):
    api_client.force_authenticate(user=superadmin_user)
    return api_client


@pytest.fixture
def authenticated_regular(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    return api_client


@pytest.mark.django_db
class TestAuthenticationRequired:
    """Test that all superadmin endpoints require authentication"""
    
    endpoints = [
        '/api/superadmin/dashboard/stats/',
        '/api/superadmin/users/',
        '/api/superadmin/roles/',
        '/api/superadmin/permissions/',
        '/api/superadmin/security/password-policy/',
        '/api/superadmin/security/2fa-settings/',
        '/api/superadmin/security/session-settings/',
        '/api/superadmin/security/active-sessions/',
        '/api/superadmin/security/ip-restrictions/',
        '/api/superadmin/audit-logs/',
        '/api/superadmin/announcements/',
        '/api/superadmin/settings/system/',
        '/api/superadmin/backups/',
    ]
    
    @pytest.mark.parametrize('endpoint', endpoints)
    def test_requires_authentication(self, api_client, endpoint):
        response = api_client.get(endpoint)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSuperAdminPermissionRequired:
    """Test that all superadmin endpoints require superadmin user type"""
    
    endpoints = [
        '/api/superadmin/dashboard/stats/',
        '/api/superadmin/users/',
        '/api/superadmin/roles/',
        '/api/superadmin/audit-logs/',
    ]
    
    @pytest.mark.parametrize('endpoint', endpoints)
    def test_regular_user_gets_403(self, authenticated_regular, endpoint):
        response = authenticated_regular.get(endpoint)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    @pytest.mark.parametrize('endpoint', endpoints)
    def test_superadmin_user_gets_access(self, authenticated_superadmin, endpoint):
        response = authenticated_superadmin.get(endpoint)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
