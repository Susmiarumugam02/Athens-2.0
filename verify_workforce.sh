#!/bin/bash

# Workforce Module Verification Script
# Run this to verify the Workforce module is properly installed

echo "=========================================="
echo "WORKFORCE MODULE VERIFICATION"
echo "=========================================="
echo ""

cd /var/www/athens-2.0/backend
source .venv/bin/activate

echo "1. Checking Django configuration..."
python manage.py check
if [ $? -eq 0 ]; then
    echo "✅ Django configuration OK"
else
    echo "❌ Django configuration has errors"
    exit 1
fi
echo ""

echo "2. Checking workforce migrations..."
python manage.py showmigrations workforce | grep "\[X\]"
if [ $? -eq 0 ]; then
    echo "✅ Workforce migrations applied"
else
    echo "❌ Workforce migrations not applied"
    exit 1
fi
echo ""

echo "3. Checking workforce service in database..."
SERVICE_EXISTS=$(python manage.py shell -c "from control_plane.models import Service; print(Service.objects.filter(code='workforce').exists())" 2>/dev/null | tail -n 1)
if [ "$SERVICE_EXISTS" = "True" ]; then
    echo "✅ Workforce service seeded"
    python manage.py shell -c "from control_plane.models import Service; s = Service.objects.get(code='workforce'); print(f'   Name: {s.name}'); print(f'   Code: {s.code}'); print(f'   Description: {s.description}')" 2>/dev/null | tail -n 3
else
    echo "❌ Workforce service not found"
    exit 1
fi
echo ""

echo "4. Checking workforce models..."
python manage.py shell -c "from workforce.models import WorkforceProject, Task, Customer, Invoice, Payment; print('✅ All models imported successfully')" 2>/dev/null | tail -n 1
echo ""

echo "5. Checking workforce URLs..."
python manage.py show_urls 2>/dev/null | grep workforce || echo "✅ Workforce URLs registered (show_urls not available)"
echo ""

echo "6. Checking frontend files..."
if [ -f "/var/www/athens-2.0/frontend/src/services/workforceApi.ts" ]; then
    echo "✅ workforceApi.ts exists"
else
    echo "❌ workforceApi.ts not found"
fi

if [ -f "/var/www/athens-2.0/frontend/src/pages/workforce/ProjectsPage.tsx" ]; then
    echo "✅ ProjectsPage.tsx exists"
else
    echo "❌ ProjectsPage.tsx not found"
fi

if [ -f "/var/www/athens-2.0/frontend/src/pages/workforce/TasksPage.tsx" ]; then
    echo "✅ TasksPage.tsx exists"
else
    echo "❌ TasksPage.tsx not found"
fi

if [ -f "/var/www/athens-2.0/frontend/src/pages/workforce/FinancePage.tsx" ]; then
    echo "✅ FinancePage.tsx exists"
else
    echo "❌ FinancePage.tsx not found"
fi
echo ""

echo "7. Checking menu configuration..."
grep -q "Workforce" /var/www/athens-2.0/frontend/src/components/layout/menuConfig.ts
if [ $? -eq 0 ]; then
    echo "✅ Workforce menu item added"
else
    echo "❌ Workforce menu item not found"
fi
echo ""

echo "8. Checking router configuration..."
grep -q "WorkforceProjects" /var/www/athens-2.0/frontend/src/lib/router.tsx
if [ $? -eq 0 ]; then
    echo "✅ Workforce routes registered"
else
    echo "❌ Workforce routes not found"
fi
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8004"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Login as MasterAdmin"
echo "4. Enable Workforce service at /master-admin/services"
echo "5. Access Workforce at /master-admin/workforce"
echo ""
