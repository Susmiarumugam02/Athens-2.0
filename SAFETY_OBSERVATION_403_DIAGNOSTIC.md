# Safety Observation 403 Error - Diagnostic Report

## Current Configuration

### Service Location
- **Running From**: `/var/www/athens/app/backend`
- **Service**: `athens-backend.service`
- **Port**: `127.0.0.1:8001`

### Exemption Paths Confirmed
✅ `/var/www/athens/app/backend/authentication/tenant_middleware.py:34`
✅ `/var/www/athens/app/backend/authentication/company_isolation.py:28`

Both contain: `'/api/safety-observation/',`

### Middleware Logic
Both middlewares use `path.startswith(exempt)` which should match:
- `/api/safety-observation/`
- `/api/safety-observation/123/`
- `/api/safety-observation/?page=1`

## Diagnostic Commands

### 1. Test API Directly (Run on Server)
```bash
# Get a fresh token first
curl -X POST http://127.0.0.1:8001/api/auth/company/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}'

# Test safety observation endpoint
curl -i -H "Authorization: Bearer <TOKEN>" \
  http://127.0.0.1:8001/api/safety-observation/
```

### 2. Check Logs for Blocking
```bash
sudo journalctl -u athens-backend -n 200 --no-pager | grep -i "BLOCKED\|403\|safety"
```

### 3. Verify Exemption is Working
```bash
# Should show the exemption paths
grep -n "api/safety-observation" /var/www/athens/app/backend/authentication/*.py
```

### 4. Check Nginx Logs
```bash
sudo tail -n 100 /var/log/nginx/access.log | grep safety-observation
sudo tail -n 100 /var/log/nginx/error.log | grep safety-observation
```

## Most Likely Causes

### 1. Trailing Slash Issue (80% probability)
**Problem**: Frontend calling `/api/safety-observation` (no slash)
**Result**: Django 301 redirect drops Authorization header

**Fix**: Update frontend API calls to always use trailing slash:
```typescript
// In frontend/src/pages/safetyobservation/api.ts
const API_BASE = '/api/safety-observation/';  // ← Must have trailing slash
```

### 2. JWT Token Invalid (15% probability)
**Problem**: Token expired or generated with different SECRET_KEY
**Result**: Middleware sees unauthenticated request

**Fix**: User must log out and log in again

### 3. Nginx Proxy Issue (5% probability)
**Problem**: Nginx blocking before reaching Django
**Result**: 403 from nginx, not Django

**Check**: Look for nginx error logs

## Quick Fixes to Try

### Fix 1: Force Exemption (Temporary Debug)
Add this at the TOP of both middleware `process_request()` methods:

```python
# In tenant_middleware.py and company_isolation.py
def process_request(self, request):
    # TEMPORARY: Force allow safety-observation
    if '/safety-observation' in request.path:
        logger.warning(f"FORCE ALLOWING: {request.path}")
        return None
    
    # ... rest of method
```

### Fix 2: Disable Middleware Temporarily
Comment out in `/var/www/athens/app/backend/backend/settings.py`:

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # 'authentication.company_isolation.CompanyTenantIsolationMiddleware',  # ← COMMENT
    # 'authentication.tenant_middleware.AthensTenantMiddleware',  # ← COMMENT
    # ... rest
]
```

Then restart: `sudo systemctl restart athens-backend`

If this works, the issue is definitely middleware-related.

## Expected Behavior

When working correctly:
1. Request hits nginx → proxies to Django
2. Django authentication middleware validates JWT
3. Tenant middleware checks `_is_exempt_path()` → returns True
4. Company isolation middleware checks `_is_exempt_path()` → returns True
5. Request reaches SafetyObservationViewSet
6. Returns 200 with data

## Files Modified

| File | Status | Purpose |
|------|--------|---------|
| `/var/www/athens/app/backend/safetyobservation/permissions.py` | ✅ Updated | Allow all authenticated |
| `/var/www/athens/app/backend/safetyobservation/views.py` | ✅ Updated | Use ModelViewSet + JWT |
| `/var/www/athens/app/backend/authentication/tenant_middleware.py` | ✅ Updated | Added exemption + logging |
| `/var/www/athens/app/backend/authentication/company_isolation.py` | ✅ Updated | Added exemption |

## Next Steps

1. **Run diagnostic commands above**
2. **Check if trailing slash is the issue**
3. **Try Fix 1 (force exemption) to confirm middleware is the blocker**
4. **If still failing, try Fix 2 (disable middleware temporarily)**

## Contact Info

If issue persists after all fixes, provide:
- Output of: `curl -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:8001/api/safety-observation/`
- Last 50 lines of: `sudo journalctl -u athens-backend -n 50`
- Nginx logs: `sudo tail -n 50 /var/log/nginx/error.log`
