import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserType
from superadmin.models import Role, Permission


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    """Create a superadmin user"""
    user = User.objects.create_user(
        email='superadmin@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN,
        is_active=True
    )
    return user


@pytest.fixture
def authenticated_client(api_client, superadmin_user):
    """Return an authenticated API client"""
    api_client.force_authenticate(user=superadmin_user)
    return api_client


@pytest.mark.django_db
class TestDashboardAPI:
    def test_dashboard_stats_requires_auth(self, api_client):
        """Test that dashboard stats requires authentication"""
        response = api_client.get('/api/superadmin/dashboard/stats/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_dashboard_stats_success(self, authenticated_client):
        """Test dashboard stats returns data"""
        response = authenticated_client.get('/api/superadmin/dashboard/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_users' in response.data


@pytest.mark.django_db
class TestRolesAPI:
    def test_list_roles(self, authenticated_client):
        """Test listing roles"""
        response = authenticated_client.get('/api/superadmin/roles/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_create_role(self, authenticated_client):
        """Test creating a role"""
        data = {'name': 'New Role', 'description': 'Test'}
        response = authenticated_client.post('/api/superadmin/roles/', data)
        assert response.status_code == status.HTTP_201_CREATED
