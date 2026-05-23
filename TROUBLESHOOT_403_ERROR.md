# 403 Forbidden Error - Troubleshooting Guide

## Problem
Frontend shows: `POST http://localhost:5173/api/auth/login/ 403 (Forbidden)`

## Root Cause
The frontend is correctly proxying to the backend, but Django's CSRF protection is blocking the request.

## Solution

### Option 1: Restart Backend Server (Recommended)

The backend needs to be restarted to pick up the new training endpoints and ensure all middleware is properly loaded.

```bash
# Stop backend
pkill -f "python manage.py runserver"

# Start backend
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

### Option 2: Clear Browser Cache

Sometimes the browser caches old CSRF tokens.

1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Refresh page (Ctrl+Shift+R)

### Option 3: Check CSRF Settings

Ensure Django settings allow the frontend origin:

```python
# backend/athens2/settings.py

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Or for development
CORS_ALLOW_ALL_ORIGINS = True
```

### Option 4: Verify Proxy Configuration

Check that Vite proxy is working:

```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8004',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

## Quick Fix Commands

```bash
# 1. Restart everything
./start-servers.sh

# 2. Or manually:
# Terminal 1 - Backend
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Verification

Test the backend directly:

```bash
curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@athens.com","password":"your_password"}'
```

Expected: JSON response (not 403)

## Training Access Control

After fixing the 403 error, the training access control will work as follows:

1. **New users** → Redirected to `/training/induction`
2. **Admin users** → Full access immediately
3. **After training** → All modules unlocked

## Test Accounts

```
Superadmin (No training required):
Email: superadmin@athens.com
Password: [your password]

Regular User (Training required):
Email: [any non-admin user]
Password: [their password]
```

## Still Having Issues?

1. Check backend logs: `tail -f backend.log`
2. Check frontend console for errors
3. Verify both servers are running:
   - Backend: http://localhost:8004/api/system/health/
   - Frontend: http://localhost:5173

## Additional Notes

- The 403 error is NOT related to the training access control feature
- Training access control only affects authenticated users
- The 403 happens during login, before authentication
- This is a Django CSRF/CORS configuration issue

## Contact

If issues persist, check:
- `DEPLOYMENT_READY_TRAINING_ACCESS.md` - Full deployment guide
- `INDUCTION_TRAINING_QUICK_CARD.md` - Quick reference
- `verify_training_implementation.sh` - Run verification script
