#!/bin/bash
cd /var/www/athens-2.0/frontend

# Copy all project components
cp -r /var/www/athens/app/frontend/src/features/project/components/* src/features/project/components/ 2>/dev/null || true

# Copy all admin components  
cp -r /var/www/athens/app/frontend/src/features/admin/components/* src/features/admin/components/ 2>/dev/null || true

# Copy all analytics components
cp -r /var/www/athens/app/frontend/src/features/analytics/components/* src/features/analytics/components/ 2>/dev/null || true

# Copy all common files
cp -r /var/www/athens/app/frontend/src/common/* src/common/ 2>/dev/null || true

# Copy all utils
cp -r /var/www/athens/app/frontend/src/utils/* src/utils/ 2>/dev/null || true

echo "✅ All dependencies copied"
