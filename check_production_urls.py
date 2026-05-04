#!/usr/bin/env python3
"""
Check production URL routing
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athens2.settings')
django.setup()

from django.urls import reverse

try:
    url = reverse('authentication:masteradmin:admin-user-delete', kwargs={'user_id': 12})
    print(f'✅ URL resolves to: {url}')
except:
    print('❌ URL pattern not found')
    
    # Check what URLs exist
    from django.conf import settings
    from django.urls import get_resolver
    
    resolver = get_resolver()
    print('\n=== Available authentication URLs ===')
    for pattern in resolver.url_patterns:
        if hasattr(pattern, 'app_name') and pattern.app_name == 'authentication':
            print(f'App: {pattern.app_name}')
            for sub_pattern in pattern.url_patterns:
                print(f'  {sub_pattern.pattern}')