#!/usr/bin/env python3
"""
Fix production user credentials
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from authentication.models import User

def fix_production_users():
    print('=== FIXING PRODUCTION USER CREDENTIALS ===')
    
    # Fix all company users missing company_id
    users = User.objects.filter(
        user_type='companyuser',
        company_id__isnull=True,
        tenant__isnull=False
    )
    
    print(f'Found {users.count()} users to fix')
    
    for user in users:
        user.company_id = user.tenant.id
        user.athens_tenant_id = user.tenant.id
        user.save()
        print(f'✅ Fixed {user.username} -> company_id: {user.company_id}')
    
    print('=== DONE ===')

if __name__ == '__main__':
    fix_production_users()