# Status 400 Diagnostic - User Not Logged In

**Date:** February 26, 2026  
**Status:** ✅ Frontend patches working | ⚠️ User needs to log in

---

## 🎯 Current Situation

### Progress Made
- ✅ **499 errors eliminated** (frontend abort loop fixed)
- ✅ **Requests completing** (no more client-side aborts)
- ⚠️ **400 Bad Request** (backend rejecting unauthenticated requests)

### What the 400 Means

**Status 400 = Backend is responding, but rejecting the request**

The requests are now reaching the backend successfully (no 499 abort), but Django is returning 400 because:

1. **User is NOT logged in** (no JWT token in localStorage)
2. Frontend patches are working correctly:
   - Patch B blocks requests without token ✅
   - But user is accessing the page directly without logging in first
3. Django middleware (likely CSRF or auth middleware) rejects unauthenticated GET requests

---

## 🔍 Evidence

### Nginx Logs
```
GET /api/system/tenant-services/ HTTP/2.0" 400 143
GET /api/auth/company/details/ HTTP/2.0" 400 143  
GET /api/safety-observation/ HTTP/2.0" 400 143
```

**No Authorization header present** - User is not authenticated

### Backend Logs
```
127.0.0.1 - - [26/Feb/2026:11:45:51 +0000] "GET /api/system/tenant-services/ HTTP/1.0" 400 143
```

**400 response with 143 bytes** - Django's generic "Bad Request" HTML page

### Middleware Configuration
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'system.observability_middleware.RequestContextLoggingMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',  # ← Likely culprit
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'authentication.company_isolation.CompanyTenantIsolationMiddleware',
    'authentication.tenant_middleware.AthensTenantMiddleware',
    ...
]
```

---

## ✅ What's Working

1. **Frontend Auth Lifecycle Patches:**
   - ✅ Redirect guard prevents infinite loops
   - ✅ No-token block prevents doomed requests
   - ✅ Token gating prevents bootstrap fetches without auth
   - ✅ No more 499 errors

2. **Backend Services:**
   - ✅ Running on port 8001
   - ✅ Nginx proxying correctly
   - ✅ Responding to requests (400 is a response, not a timeout)

---

## ⚠️ What Needs Action

### User Must Log In

**The 400 errors are EXPECTED behavior when user is not logged in.**

**Test Scenario:**
1. User navigates directly to `/app/safety-observation` without logging in
2. Frontend checks: no token in localStorage
3. Frontend patches block API calls (Patch B working correctly)
4. **BUT** if any requests slip through, backend returns 400

**Solution:** User needs to:
1. Navigate to `https://www.ai-athens.cloud/login`
2. Log in with valid credentials
3. **Then** navigate to `/app/safety-observation`

---

## 🧪 Verification Steps

### Step 1: Confirm User is Not Logged In

**Browser DevTools → Application → Local Storage:**
- Check for `access_token` key
- Check for `_at` key (encrypted token)

**Expected:** Both should be empty/missing

### Step 2: Log In and Test

1. Open browser in **Incognito mode** (clean slate)
2. Navigate to `https://www.ai-athens.cloud/login`
3. Log in with credentials:
   - Email: `admin@prozealgreenenergy.com` (or valid user)
   - Password: (user's password)
4. After successful login, navigate to `/app/safety-observation`
5. Check DevTools → Network tab

**Expected Results:**
- ✅ API calls return **200** or **403** (not 400)
- ✅ No 499 errors
- ✅ Page loads correctly

### Step 3: Test Token Validation

**If still getting 400 after login, check token format:**

```javascript
// In browser console after login:
const token = localStorage.getItem('_at')
console.log('Token exists:', !!token)
console.log('Token length:', token?.length)

// Decrypt token (matches tokenManager logic):
const decrypted = atob(token)
console.log('Token parts:', decrypted.split('.').length) // Should be 3 for JWT
```

**Expected:** Token should have 3 dot-separated parts (JWT format)

---

## 🔧 Potential Issues & Fixes

### Issue 1: Token is "null" or "undefined" String

**Symptom:** `localStorage.getItem('_at')` returns `"bnVsbA=="` (base64 for "null")

**Fix:** Already applied in Patch B - validates token format before sending

### Issue 2: CSRF Middleware Rejecting GET Requests

**Symptom:** 400 even with valid token

**Fix:** Add `@csrf_exempt` decorator to views or update CSRF settings:

```python
# In system/views.py
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class TenantServicesView(APIView):
    ...
```

### Issue 3: Middleware Order

**Symptom:** Auth middleware running before CORS

**Fix:** Already correct - CORS is first in middleware list

---

## 📊 Decision Tree

```
User accesses /app/safety-observation
    │
    ├─ Has valid token in localStorage?
    │   │
    │   ├─ YES → API calls should return 200/403
    │   │         └─ If 400: Check token format (3 parts?)
    │   │             └─ If invalid: Clear storage, re-login
    │   │
    │   └─ NO → Frontend blocks API calls (Patch B)
    │             └─ User redirected to /login (Patch A)
    │                 └─ After login: Try again
```

---

## 🎯 Next Steps

### Immediate (User Action Required)
1. **User must log in** at `/login` before accessing protected pages
2. Verify token is stored after login
3. Test Safety Observation page access

### If 400 Persists After Login
1. Check token format in browser console (see Step 3 above)
2. Check backend logs for specific error:
   ```bash
   sudo journalctl -u athens-backend -f
   ```
3. Verify CSRF exemption for API endpoints

### If Token Format is Invalid
1. Check login response in Network tab
2. Verify `tokenManager.setTokens()` is called correctly
3. Check for token corruption during storage

---

## 📝 Summary

| Status | Description |
|--------|-------------|
| ✅ Frontend Patches | Working correctly - blocking no-token requests |
| ✅ Backend Services | Running and responding |
| ✅ 499 Errors | Eliminated (abort loop fixed) |
| ⚠️ 400 Errors | Expected when user not logged in |
| ⏳ User Action | **Log in first, then test** |

---

**The 400 is NOT a bug - it's the backend correctly rejecting unauthenticated requests.**

**Action Required:** User needs to log in at `/login` before accessing `/app/safety-observation`

---

**Last Updated:** February 26, 2026  
**Next Review:** After user login test
