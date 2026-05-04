#!/usr/bin/env python3
"""
Production server fix script
Run this on the production server to fix tenant assignments
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from authentication.models import User
from control_plane.models import Tenant

def fix_tenant_assignments():
    print('=== FIXING PRODUCTION TENANT ASSIGNMENTS ===')
    
    # Get tenant 1
    tenant = Tenant.objects.get(id=1)
    print(f'Using tenant: {tenant.name}')
    
    # Fix admin@pgel.com
    admin = User.objects.get(email='admin@pgel.com')
    admin.tenant = tenant
    admin.save()
    print(f'✅ Fixed admin@pgel.com -> Tenant {tenant.id}')
    
    # Fix user ID 12
    user12 = User.objects.get(id=12)
    user12.tenant = tenant
    user12.save()
    print(f'✅ Fixed {user12.email} -> Tenant {tenant.id}')
    
    # Test DELETE query
    try:
        test_user = User.objects.get(
            id=12,
            tenant=admin.tenant,
            user_type='companyuser'
        )
        print(f'✅ DELETE query now works - Found: {test_user.email}')
    except User.DoesNotExist:
        print('❌ DELETE query still fails')

if __name__ == '__main__':
    fix_tenant_assignments()