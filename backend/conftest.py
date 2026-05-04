import pytest
from django.conf import settings


@pytest.fixture(scope='session', autouse=True)
def disable_throttling(request):
    """Disable DRF throttling for tests"""
    from rest_framework.test import APIRequestFactory
    from rest_framework import throttling
    
    # Monkey patch throttle to always allow
    original_allow = throttling.SimpleRateThrottle.allow_request
    throttling.SimpleRateThrottle.allow_request = lambda self, request, view: True
    
    def restore():
        throttling.SimpleRateThrottle.allow_request = original_allow
    
    request.addfinalizer(restore)
