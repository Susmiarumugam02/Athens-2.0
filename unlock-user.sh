#!/bin/bash
# Unlock a user account in Athens 2.0

EMAIL="${1:-superadmin@athens.com}"

cd /var/www/athens-2.0/backend
source .venv/bin/activate

python manage.py shell << EOF
from authentication.models import User
try:
    user = User.objects.get(email='$EMAIL')
    user.failed_login_count = 0
    user.locked_until = None
    user.save()
    print(f"✅ Unlocked: {user.email}")
except User.DoesNotExist:
    print(f"❌ User not found: $EMAIL")
EOF
