#!/usr/bin/env python
"""
Test script for Induction Training Access Control
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from authentication.models import User
from rest_framework.test import APIRequestFactory, force_authenticate
from authentication.training_access import (
    check_training_status,
    mark_training_complete,
    get_accessible_modules
)

def test_training_endpoints():
    print("=" * 60)
    print("INDUCTION TRAINING ACCESS CONTROL - TEST RESULTS")
    print("=" * 60)
    
    factory = APIRequestFactory()
    
    # Test 1: Superadmin bypass
    print("\n[TEST 1] Superadmin Bypass")
    print("-" * 60)
    superadmin = User.objects.filter(user_type='superadmin').first()
    if superadmin:
        request = factory.get('/api/auth/training/status/')
        force_authenticate(request, user=superadmin)
        response = check_training_status(request)
        print(f"User: {superadmin.email}")
        print(f"Status Code: {response.status_code}")
        print(f"Training Required: {response.data.get('training_required')}")
        print(f"Bypass Reason: {response.data.get('bypass_reason')}")
        print("✅ PASS" if not response.data.get('training_required') else "❌ FAIL")
    else:
        print("⚠️  No superadmin found")
    
    # Test 2: Regular user training requirement
    print("\n[TEST 2] Regular User Training Requirement")
    print("-" * 60)
    regular_user = User.objects.filter(user_type='companyuser').first()
    if not regular_user:
        regular_user = User.objects.exclude(user_type__in=['superadmin', 'masteradmin']).first()
    
    if regular_user:
        request = factory.get('/api/auth/training/status/')
        force_authenticate(request, user=regular_user)
        response = check_training_status(request)
        print(f"User: {regular_user.email}")
        print(f"Status Code: {response.status_code}")
        print(f"Training Required: {response.data.get('training_required')}")
        print(f"Induction Completed: {response.data.get('induction_completed')}")
        print(f"Module Access Enabled: {response.data.get('module_access_enabled')}")
        print(f"Onboarding Status: {response.data.get('onboarding_status')}")
        print("✅ PASS" if response.data.get('training_required') else "❌ FAIL")
    else:
        print("⚠️  No regular user found")
    
    # Test 3: Accessible modules (before training)
    print("\n[TEST 3] Accessible Modules (Before Training)")
    print("-" * 60)
    if regular_user:
        request = factory.get('/api/auth/training/accessible-modules/')
        force_authenticate(request, user=regular_user)
        response = get_accessible_modules(request)
        print(f"All Modules Accessible: {response.data.get('all_modules_accessible')}")
        print(f"Accessible Modules: {response.data.get('accessible_modules')}")
        print(f"Restricted Count: {len(response.data.get('restricted_modules', []))}")
        print("✅ PASS" if not response.data.get('all_modules_accessible') else "❌ FAIL")
    
    # Test 4: Mark training complete
    print("\n[TEST 4] Mark Training Complete")
    print("-" * 60)
    if regular_user:
        request = factory.post('/api/auth/training/complete/', {
            'score': 95.5,
            'training_data': {'quiz_passed': True, 'videos_watched': 5}
        }, format='json')
        force_authenticate(request, user=regular_user)
        response = mark_training_complete(request)
        print(f"Status Code: {response.status_code}")
        print(f"Message: {response.data.get('message')}")
        print(f"Induction Completed: {response.data.get('induction_completed')}")
        print(f"Module Access Enabled: {response.data.get('module_access_enabled')}")
        print(f"Score: {response.data.get('score')}")
        
        # Verify in database
        regular_user.refresh_from_db()
        print(f"\nDatabase Verification:")
        print(f"  induction_completed: {regular_user.induction_completed}")
        print(f"  module_access_enabled: {regular_user.module_access_enabled}")
        print(f"  onboarding_status: {regular_user.onboarding_status}")
        print(f"  induction_score: {regular_user.induction_score}")
        print("✅ PASS" if regular_user.induction_completed else "❌ FAIL")
    
    # Test 5: Accessible modules (after training)
    print("\n[TEST 5] Accessible Modules (After Training)")
    print("-" * 60)
    if regular_user:
        request = factory.get('/api/auth/training/accessible-modules/')
        force_authenticate(request, user=regular_user)
        response = get_accessible_modules(request)
        print(f"All Modules Accessible: {response.data.get('all_modules_accessible')}")
        print(f"Accessible Modules: {response.data.get('accessible_modules')}")
        print(f"Training Completed: {response.data.get('training_completed')}")
        print("✅ PASS" if response.data.get('all_modules_accessible') else "❌ FAIL")
    
    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETE")
    print("=" * 60)

if __name__ == '__main__':
    test_training_endpoints()
