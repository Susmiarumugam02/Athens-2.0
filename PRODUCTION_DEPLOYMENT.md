# Production Deployment Checklist

## Overview

Deploy all recent implementations to production server.

---

## Pre-Deployment Checklist

### 1. Verify Local Changes
```bash
cd /var/www/athens-2.0

# Check git status
git status

# List modified files
git diff --name-only
```

### 2. Test Locally
```bash
# Backend
cd backend
source .venv/bin/activate
python manage.py check
python manage.py migrate --check
pytest

# Frontend
cd ../frontend
npm run build
```

---

## Backend Deployment

### Step 1: Database Migrations

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Check pending migrations
python manage.py showmigrations

# Apply migrations
python manage.py migrate control_plane
python manage.py migrate workforce

# Verify
python manage.py showmigrations | grep "\[ \]"
```

**Expected Migrations**:
- `control_plane.0013_add_contractor_compliance_service`
- `control_plane.0014_seed_sample_subscriptions`

### Step 2: Collect Static Files

```bash
python manage.py collectstatic --noinput
```

### Step 3: Restart Backend

```bash
# If using systemd
sudo systemctl restart athens-backend

# Or if using supervisor
sudo supervisorctl restart athens-backend

# Or if using gunicorn directly
pkill -HUP gunicorn
```

---

## Frontend Deployment

### Step 1: Build Production Bundle

```bash
cd /var/www/athens-2.0/frontend
npm run build
```

### Step 2: Deploy Build

```bash
# If using nginx to serve static files
sudo cp -r dist/* /var/www/athens-frontend/

# Or if build output goes to specific location
# (adjust path as needed)
```

### Step 3: Restart Frontend Service

```bash
# If using nginx
sudo systemctl reload nginx

# Or restart
sudo systemctl restart nginx
```

---

## Post-Deployment Verification

### 1. Check Services

```bash
# Backend
curl https://www.ai-athens.cloud/api/system/health/

# Frontend
curl https://www.ai-athens.cloud/
```

### 2. Verify Database

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Check services
python manage.py shell -c "from control_plane.models import Service; print(f'Services: {Service.objects.count()}')"

# Check subscriptions
python manage.py shell -c "from control_plane.models import Subscription; print(f'Subscriptions: {Subscription.objects.count()}')"
```

### 3. Test UI

**Open browser**:
1. Go to `https://www.ai-athens.cloud/superadmin/subscriptions`
2. Verify subscriptions display
3. Click Edit button - verify modal opens
4. Go to `https://www.ai-athens.cloud/superadmin/services`
5. Verify services show (ERGON, Workforce, Contractor Compliance)
6. Verify tier badges display

---

## Key Files to Deploy

### Backend Files

```
backend/
├── control_plane/
│   ├── models.py (updated)
│   ├── admin.py (updated)
│   ├── migrations/
│   │   ├── 0013_add_contractor_compliance_service.py (new)
│   │   └── 0014_seed_sample_subscriptions.py (new)
│   └── management/
│       └── commands/
│           └── change_service_tier.py (new)
└── system/
    ├── service_manager.py (updated)
    └── views.py (updated)
```

### Frontend Files

```
frontend/
├── src/
│   ├── pages/superadmin/
│   │   ├── Services.tsx (updated)
│   │   └── Subscriptions.tsx (updated)
│   ├── components/modals/
│   │   └── EditSubscriptionModal.tsx (new)
│   └── services/
│       └── controlPlaneService.ts (updated)
└── package.json
```

---

## Deployment Commands (Complete)

### Full Deployment Script

```bash
#!/bin/bash
set -e

echo "=== Athens 2.0 Production Deployment ==="

# Navigate to project
cd /var/www/athens-2.0

# Pull latest code (if using git)
# git pull origin main

# Backend deployment
echo "Deploying backend..."
cd backend
source .venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart athens-backend

# Frontend deployment
echo "Deploying frontend..."
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /var/www/athens-frontend/
sudo systemctl reload nginx

# Verify
echo "Verifying deployment..."
sleep 5
curl -f https://www.ai-athens.cloud/api/system/health/ || echo "Backend health check failed"
curl -f https://www.ai-athens.cloud/ || echo "Frontend check failed"

echo "=== Deployment Complete ==="
```

---

## Manual Deployment Steps

### Backend

```bash
# 1. Navigate
cd /var/www/athens-2.0/backend

# 2. Activate environment
source .venv/bin/activate

# 3. Run migrations
python manage.py migrate

# 4. Collect static
python manage.py collectstatic --noinput

# 5. Restart service
sudo systemctl restart athens-backend
```

### Frontend

```bash
# 1. Navigate
cd /var/www/athens-2.0/frontend

# 2. Install dependencies (if needed)
npm install

# 3. Build
npm run build

# 4. Deploy (adjust path as needed)
sudo cp -r dist/* /var/www/athens-frontend/

# 5. Reload nginx
sudo systemctl reload nginx
```

---

## Rollback Plan

### If Deployment Fails

**Backend Rollback**:
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Rollback migrations
python manage.py migrate control_plane 0012

# Restart
sudo systemctl restart athens-backend
```

**Frontend Rollback**:
```bash
# Restore previous build
sudo cp -r /var/www/athens-frontend-backup/* /var/www/athens-frontend/
sudo systemctl reload nginx
```

---

## Post-Deployment Tasks

### 1. Update Service Tiers

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Set Renew Power to premium
python manage.py change_service_tier "Renew Power" all premium
```

### 2. Verify Features

- [ ] Subscriptions page loads
- [ ] Edit subscription modal works
- [ ] Services page shows 3 services
- [ ] Tier badges display correctly
- [ ] Service toggle works
- [ ] Edit subscription saves correctly

### 3. Monitor Logs

```bash
# Backend logs
sudo journalctl -u athens-backend -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Environment-Specific Notes

### Production Server Details

**Server**: srv1068633
**Domain**: www.ai-athens.cloud
**Backend Port**: 8004 (likely)
**Frontend**: Nginx serving static files

### Paths (Adjust as needed)

```
Project: /var/www/athens-2.0/
Backend: /var/www/athens-2.0/backend/
Frontend: /var/www/athens-2.0/frontend/
Static: /var/www/athens-frontend/ (or similar)
```

---

## Quick Deploy (One Command)

```bash
cd /var/www/athens-2.0 && \
cd backend && source .venv/bin/activate && python manage.py migrate && python manage.py collectstatic --noinput && sudo systemctl restart athens-backend && \
cd ../frontend && npm run build && sudo cp -r dist/* /var/www/athens-frontend/ && sudo systemctl reload nginx && \
echo "Deployment complete!"
```

---

## Verification Checklist

After deployment, verify:

- [ ] Backend health: `curl https://www.ai-athens.cloud/api/system/health/`
- [ ] Frontend loads: `curl https://www.ai-athens.cloud/`
- [ ] Login works
- [ ] Subscriptions page loads
- [ ] Services page loads
- [ ] Edit subscription modal opens
- [ ] Service toggle works
- [ ] Tier badges show correctly
- [ ] No console errors
- [ ] No 500 errors in logs

---

## Support

**If issues occur**:
1. Check logs: `sudo journalctl -u athens-backend -f`
2. Check nginx: `sudo nginx -t`
3. Verify migrations: `python manage.py showmigrations`
4. Test locally first
5. Rollback if needed

---

## Summary

**To deploy everything**:
```bash
# Backend
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py migrate
sudo systemctl restart athens-backend

# Frontend
cd /var/www/athens-2.0/frontend
npm run build
sudo cp -r dist/* /var/www/athens-frontend/
sudo systemctl reload nginx
```

**Then verify**: https://www.ai-athens.cloud/superadmin/subscriptions

**Status**: Ready for production deployment
