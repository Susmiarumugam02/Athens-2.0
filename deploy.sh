#!/bin/bash
set -e

echo "========================================="
echo "Athens 2.0 Production Deployment"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="/var/www/athens-2.0"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run with sudo${NC}"
    exit 1
fi

# Navigate to project
cd $PROJECT_ROOT

echo "Step 1: Backend Deployment"
echo "-------------------------------------------"
cd backend

# Activate virtual environment
source .venv/bin/activate

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Restart backend service
echo "Restarting backend..."
systemctl restart athens-backend || echo "Warning: Could not restart athens-backend service"

echo -e "${GREEN}✓ Backend deployed${NC}"
echo ""

echo "Step 2: Frontend Deployment"
echo "-------------------------------------------"
cd $PROJECT_ROOT/frontend

# Build frontend
echo "Building frontend..."
npm run build

# Deploy to nginx directory (adjust path as needed)
echo "Deploying to web server..."
if [ -d "/var/www/athens-frontend" ]; then
    cp -r dist/* /var/www/athens-frontend/
elif [ -d "/usr/share/nginx/html" ]; then
    cp -r dist/* /usr/share/nginx/html/
else
    echo "Warning: Could not find web server directory"
fi

# Reload nginx
echo "Reloading nginx..."
systemctl reload nginx || systemctl restart nginx

echo -e "${GREEN}✓ Frontend deployed${NC}"
echo ""

echo "Step 3: Verification"
echo "-------------------------------------------"

# Wait for services to start
sleep 3

# Check backend
echo "Checking backend..."
if curl -f -s http://localhost:8004/api/system/health/ > /dev/null; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

# Check frontend
echo "Checking frontend..."
if curl -f -s http://localhost/ > /dev/null; then
    echo -e "${GREEN}✓ Frontend is accessible${NC}"
else
    echo -e "${RED}✗ Frontend check failed${NC}"
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Visit: https://www.ai-athens.cloud/superadmin/subscriptions"
echo "2. Verify subscriptions display"
echo "3. Test edit subscription modal"
echo "4. Check services page"
echo ""
echo "To set service tiers:"
echo "cd $PROJECT_ROOT/backend"
echo "source .venv/bin/activate"
echo "python manage.py change_service_tier \"Renew Power\" all premium"
echo ""
