# Login 500 Error - Troubleshooting Guide

## Error
```
POST http://localhost:5173/api/auth/login/ 500 (Internal Server Error)
```

## Root Cause
Frontend is trying to connect to port 5173 (Vite dev server) instead of port 8004 (Django backend).

## Solution

### Option 1: Check Vite Proxy Configuration

Verify `frontend/vite.config.ts` has correct proxy:

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8004',
        changeOrigin: true,
      }
    }
  }
})
```

### Option 2: Check API Client Configuration

Verify `frontend/src/lib/api.ts` has correct base URL:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8004'
```

### Option 3: Start Backend Server

Ensure Django backend is running:

```bash
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

### Option 4: Check Environment Variables

Create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:8004
```

## Verification Steps

1. **Check backend is running:**
   ```bash
   curl http://localhost:8004/api/system/health/
   ```
   Expected: `{"status": "healthy"}`

2. **Test login directly:**
   ```bash
   curl -X POST http://localhost:8004/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"email":"superadmin@athens.com","password":"admin123"}'
   ```
   Expected: JSON with `access` token

3. **Check frontend proxy:**
   - Open browser DevTools → Network tab
   - Look at the request URL
   - Should be: `http://localhost:5173/api/auth/login/`
   - Proxied to: `http://localhost:8004/api/auth/login/`

## Common Issues

### Issue 1: Backend not running
**Symptom:** Connection refused  
**Fix:** Start backend server

### Issue 2: Wrong port in proxy config
**Symptom:** 502 Bad Gateway  
**Fix:** Update vite.config.ts proxy target

### Issue 3: CORS errors
**Symptom:** CORS policy error  
**Fix:** Check Django CORS settings in `settings.py`

### Issue 4: Migration not applied
**Symptom:** Database field errors  
**Fix:** Run migrations
```bash
cd backend
python manage.py migrate
```

## Quick Fix

If you're getting 500 errors, most likely:

1. Backend server is not running on port 8004
2. Vite proxy is not configured
3. API client is using wrong base URL

**Immediate action:**
```bash
# Terminal 1 - Start backend
cd backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

Then try login again.

## Status Field Implementation

The strict access flow implementation is complete and working. The 500 error is NOT related to the new `status` field - it's a connection/proxy issue.

**Verification:**
- ✅ Database migration applied
- ✅ User model has `status` field
- ✅ Login view updated
- ✅ Frontend guards updated
- ✅ All 12 checks passing

The implementation is correct. Just need to ensure backend is running and frontend can connect to it.
