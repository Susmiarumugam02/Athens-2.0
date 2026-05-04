# Frontend ↔ Backend Integration - Smoke Test Checklist

## Test Environment
- **Backend URL**: http://72.60.218.167:8004
- **Frontend URL**: http://72.60.218.167:5173
- **Login Endpoint**: POST /api/auth/login/

---

## Pre-Test Setup

### 1. Create Test Users (Backend)
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Create superadmin
python manage.py shell
>>> from authentication.models import User, UserType
>>> User.objects.create_user(email='super@test.com', password='Test123!', user_type=UserType.SUPERADMIN)
>>> User.objects.create_user(email='master@test.com', password='Test123!', user_type=UserType.MASTERADMIN, company_id=1)
>>> User.objects.create_user(email='company@test.com', password='Test123!', user_type=UserType.COMPANYUSER, company_id=1)
>>> User.objects.create_user(email='service@test.com', password='Test123!', user_type=UserType.SERVICEUSER, company_id=1)
>>> exit()
```

### 2. Start Services
```bash
# Terminal 1 - Backend
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004

# Terminal 2 - Frontend
cd /var/www/athens-2.0/frontend
npm run dev
```

---

## Test Cases

### ✅ Test 1: Superadmin Login & Redirect
**Steps:**
1. Navigate to http://72.60.218.167:5173/login
2. Enter credentials:
   - Email: `super@test.com`
   - Password: `Test123!`
3. Click "Sign In"

**Expected Result:**
- ✓ Login successful
- ✓ Redirected to `/superadmin/dashboard`
- ✓ Access token stored in sessionStorage
- ✓ User object contains `user_type: "superadmin"`

**Actual Result:** ___________

---

### ✅ Test 2: Master Admin Login & Redirect
**Steps:**
1. Logout (if logged in)
2. Navigate to http://72.60.218.167:5173/login
3. Enter credentials:
   - Email: `master@test.com`
   - Password: `Test123!`
4. Click "Sign In"

**Expected Result:**
- ✓ Login successful
- ✓ Redirected to `/master-admin`
- ✓ User object contains `user_type: "masteradmin"`
- ✓ User object contains `company_id: 1`

**Actual Result:** ___________

---

### ✅ Test 3: Company User Login & Redirect
**Steps:**
1. Logout (if logged in)
2. Navigate to http://72.60.218.167:5173/login
3. Enter credentials:
   - Email: `company@test.com`
   - Password: `Test123!`
4. Click "Sign In"

**Expected Result:**
- ✓ Login successful
- ✓ Redirected to `/app`
- ✓ User object contains `user_type: "companyuser"`
- ✓ User object contains `company_id: 1`

**Actual Result:** ___________

---

### ✅ Test 4: Service User Login & Redirect
**Steps:**
1. Logout (if logged in)
2. Navigate to http://72.60.218.167:5173/login
3. Enter credentials:
   - Email: `service@test.com`
   - Password: `Test123!`
4. Click "Sign In"

**Expected Result:**
- ✓ Login successful
- ✓ Redirected to `/service`
- ✓ User object contains `user_type: "serviceuser"`
- ✓ User object contains `company_id: 1`

**Actual Result:** ___________

---

### ✅ Test 5: Invalid Credentials
**Steps:**
1. Navigate to http://72.60.218.167:5173/login
2. Enter credentials:
   - Email: `wrong@test.com`
   - Password: `WrongPass123!`
3. Click "Sign In"

**Expected Result:**
- ✓ Login fails
- ✓ Error message displayed: "Invalid credentials"
- ✓ No redirect occurs
- ✓ User remains on login page

**Actual Result:** ___________

---

### ✅ Test 6: Account Lockout (5 Failed Attempts)
**Steps:**
1. Navigate to http://72.60.218.167:5173/login
2. Enter credentials 5 times with wrong password:
   - Email: `company@test.com`
   - Password: `WrongPassword`
3. Try 6th attempt with correct password

**Expected Result:**
- ✓ After 5 failed attempts, account is locked
- ✓ Error message: "Account is locked"
- ✓ `locked_until` timestamp shown
- ✓ Cannot login even with correct password

**Actual Result:** ___________

---

### ✅ Test 7: Token Refresh (401 Handling)
**Steps:**
1. Login as any user
2. Open browser DevTools → Application → Session Storage
3. Delete `access_token`
4. Navigate to a protected route (e.g., `/master-admin`)
5. Make an API call that requires authentication

**Expected Result:**
- ✓ Frontend detects 401 error
- ✓ Automatically calls `/api/auth/token/refresh/`
- ✓ New access token received
- ✓ Original request retried with new token
- ✓ No redirect to login page

**Actual Result:** ___________

---

### ✅ Test 8: Permission Denial (Cross-User-Type Access)
**Steps:**
1. Login as company user (`company@test.com`)
2. Try to access `/superadmin/dashboard` directly in URL

**Expected Result:**
- ✓ Access denied
- ✓ Redirected to `/unauthorized` or `/app`
- ✓ Error message shown (optional)

**Actual Result:** ___________

---

### ✅ Test 9: Logout & Session Cleanup
**Steps:**
1. Login as any user
2. Click logout button
3. Check browser storage (DevTools → Application)
4. Try to access protected route

**Expected Result:**
- ✓ Logout successful
- ✓ `access_token` removed from sessionStorage
- ✓ `refresh_token` removed from sessionStorage
- ✓ `auth-storage` removed from localStorage
- ✓ Redirected to `/login`
- ✓ Cannot access protected routes

**Actual Result:** ___________

---

### ✅ Test 10: Direct URL Access (Unauthenticated)
**Steps:**
1. Ensure logged out
2. Navigate directly to http://72.60.218.167:5173/master-admin

**Expected Result:**
- ✓ Redirected to `/login`
- ✓ No access to protected route

**Actual Result:** ___________

---

## API Endpoint Verification

### Check Backend Endpoints
```bash
# Health check
curl http://72.60.218.167:8004/api/system/health/

# Login endpoint
curl -X POST http://72.60.218.167:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "super@test.com", "password": "Test123!"}'

# Token refresh
curl -X POST http://72.60.218.167:8004/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

**Expected Response Format:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "super@test.com",
    "user_type": "superadmin",
    "company_id": null
  },
  "password_expired": false,
  "requires_2fa": false,
  "next_route": "/superadmin/dashboard"
}
```

---

## Browser Console Checks

### Verify Token Storage
```javascript
// Check sessionStorage
console.log('Access Token:', sessionStorage.getItem('access_token'))
console.log('Refresh Token:', sessionStorage.getItem('refresh_token'))
console.log('User:', sessionStorage.getItem('user'))
console.log('Next Route:', sessionStorage.getItem('next_route'))

// Check localStorage
console.log('Auth Storage:', localStorage.getItem('auth-storage'))
```

### Verify API Base URL
```javascript
// Check if API calls use correct base URL
console.log('API Base URL:', import.meta.env.VITE_API_URL)
// Should output: http://72.60.218.167:8004
```

---

## Common Issues & Fixes

### Issue 1: CORS Errors
**Symptom:** Browser console shows CORS policy errors
**Fix:** Ensure backend `settings.py` has:
```python
CORS_ALLOWED_ORIGINS = [
    "http://72.60.218.167:5173",
    "http://localhost:5173",
]
```

### Issue 2: 404 on Login Endpoint
**Symptom:** POST /api/auth/login/ returns 404
**Fix:** Check backend URL routing in `authentication/urls.py`

### Issue 3: Token Not Stored
**Symptom:** Login succeeds but user redirected back to login
**Fix:** Check `tokenManager.ts` and ensure tokens are stored in sessionStorage

### Issue 4: Infinite Redirect Loop
**Symptom:** Page keeps redirecting between login and dashboard
**Fix:** Check router guards and ensure `isAuthenticated` state is properly set

---

## Test Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Superadmin Login | ⬜ Pass / ⬜ Fail | |
| 2. Master Admin Login | ⬜ Pass / ⬜ Fail | |
| 3. Company User Login | ⬜ Pass / ⬜ Fail | |
| 4. Service User Login | ⬜ Pass / ⬜ Fail | |
| 5. Invalid Credentials | ⬜ Pass / ⬜ Fail | |
| 6. Account Lockout | ⬜ Pass / ⬜ Fail | |
| 7. Token Refresh | ⬜ Pass / ⬜ Fail | |
| 8. Permission Denial | ⬜ Pass / ⬜ Fail | |
| 9. Logout & Cleanup | ⬜ Pass / ⬜ Fail | |
| 10. Direct URL Access | ⬜ Pass / ⬜ Fail | |

**Overall Status:** ⬜ All Pass / ⬜ Some Failures

**Tested By:** ___________  
**Date:** ___________  
**Environment:** Production / Staging / Development

---

## Next Steps After Testing

1. ✅ All tests pass → Proceed to business module development
2. ⚠️ Some tests fail → Review error logs and fix issues
3. 📝 Document any deviations from expected behavior
4. 🔄 Re-run failed tests after fixes

---

**Notes:**
- Keep this checklist updated as new features are added
- Run smoke tests after any authentication-related changes
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices if applicable
