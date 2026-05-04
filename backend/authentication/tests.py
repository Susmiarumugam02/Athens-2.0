import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from authentication.models import User, UserType


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def superadmin_user(db):
    return User.objects.create_user(
        email='super@test.com',
        password='testpass123',
        user_type=UserType.SUPERADMIN
    )


@pytest.fixture
def company_user(db):
    return User.objects.create_user(
        email='company@test.com',
        password='testpass123',
        user_type=UserType.COMPANYUSER,
        company_id=1
    )


@pytest.mark.django_db
class TestAuthentication:
    
    def test_unified_login_success(self, api_client, superadmin_user):
        """Test unified login works for superadmin"""
        url = reverse('authentication:login')
        data = {'email': 'super@test.com', 'password': 'testpass123'}
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == 'super@test.com'
        assert response.data['user']['user_type'] == 'superadmin'
    
    def test_unified_login_invalid_credentials(self, api_client, superadmin_user):
        """Test login fails with invalid credentials"""
        url = reverse('authentication:login')
        data = {'email': 'super@test.com', 'password': 'wrongpass'}
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == 401
        assert 'error' in response.data
    
    def test_company_user_login_success(self, api_client, company_user):
        """Test company user can login"""
        url = reverse('authentication:login')
        data = {'email': 'company@test.com', 'password': 'testpass123'}
        
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['company_id'] == 1
    
    def test_token_refresh(self, api_client, superadmin_user):
        """Test token refresh returns new access token"""
        # First login
        login_url = reverse('authentication:login')
        login_data = {'email': 'super@test.com', 'password': 'testpass123'}
        login_response = api_client.post(login_url, login_data, format='json')
        
        refresh_token = login_response.data['refresh']
        
        # Refresh token
        refresh_url = reverse('authentication:token-refresh')
        refresh_data = {'refresh': refresh_token}
        refresh_response = api_client.post(refresh_url, refresh_data, format='json')
        
        assert refresh_response.status_code == 200
        assert 'access' in refresh_response.data
    
    def test_account_lockout_after_failed_attempts(self, api_client, superadmin_user):
        """Test account locks after 5 failed login attempts"""
        url = reverse('authentication:login')
        data = {'email': 'super@test.com', 'password': 'wrongpass'}
        
        # Make 5 failed attempts
        for _ in range(5):
            api_client.post(url, data, format='json')
        
        # 6th attempt should be locked (or rate limited)
        response = api_client.post(url, data, format='json')
        
        # Either 403 (locked) or 429 (rate limited) is acceptable
        assert response.status_code in [403, 429]
