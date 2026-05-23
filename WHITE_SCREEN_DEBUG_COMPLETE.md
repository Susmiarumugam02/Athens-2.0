# White Screen Debug - Complete Fix

## Changes Applied

### 1. Added Error Boundary ✅
**File:** `frontend/src/components/ErrorBoundary.tsx`
**File:** `frontend/src/main.tsx`

Now catches React rendering errors and shows readable error UI instead of white screen.

### 2. Added Debug Logging ✅
**Files Updated:**
- `frontend/src/lib/router.tsx` - UserGuard logging
- `frontend/src/layouts/UserLayout.tsx` - Layout logging
- `frontend/src/pages/user/Dashboard.tsx` - Dashboard logging

### 3. Verified Route Configuration ✅
```tsx
<Route path="/user" element={
  <UserGuard>
    <UserLayout />
  </UserGuard>
}>
  <Route path="dashboard" element={<SuspenseWrapper><UserDashboard /></SuspenseWrapper>} />
</Route>
```

## Debugging Steps

### Step 1: Check Browser Console

Open DevTools Console and look for:

```
[UserGuard] State: { ... }
[UserGuard] Checking status: { ... }
[UserLayout] Rendering with user: ...
[UserDashboard] Rendering with user: ...
```

### Step 2: Check for Errors

Look for:
- ❌ React errors
- ❌ Cannot read properties of undefined
- ❌ Maximum update depth exceeded
- ❌ Failed to fetch
- ❌ Route not found

### Step 3: Check Auth State

In console, run:
```javascript
JSON.parse(localStorage.getItem('auth-storage'))
```

Verify:
- `user` object exists
- `user.status` is set
- `user.role_type` is 'user'
- `user.user_type` is 'companyuser'
- `isAuthenticated` is true

### Step 4: Check Network Tab

Look for:
- Failed API calls
- 401/403 errors
- CORS errors
- Timeout errors

## Common Issues & Fixes

### Issue 1: User is not role_type='user'
**Symptom:** Redirected to /permission-denied  
**Fix:** User must have `role_type='user'` to access /user routes

**Check:**
```javascript
const user = JSON.parse(localStorage.getItem('auth-storage')).state.user
console.log('User type:', user.user_type, 'Role type:', user.role_type)
```

**Expected:**
```
User type: companyuser
Role type: user
```

### Issue 2: User status is not 'active'
**Symptom:** Redirected to induction/approval pages  
**Fix:** User must have `status='active'` to access dashboard

**Check:**
```javascript
const user = JSON.parse(localStorage.getItem('auth-storage')).state.user
console.log('Status:', user.status)
```

**Expected:**
```
Status: active
```

### Issue 3: Infinite Redirect Loop
**Symptom:** Console shows repeated navigation logs  
**Fix:** Check UserGuard logic for circular redirects

**Look for:**
```
[UserGuard] Redirecting to ...
[UserGuard] Redirecting to ...
[UserGuard] Redirecting to ...
```

### Issue 4: Component Crash
**Symptom:** Error boundary shows error  
**Fix:** Check error message and stack trace

### Issue 5: Auth Not Initialized
**Symptom:** isLoading stuck at true  
**Fix:** Check auth store initialization

**In console:**
```javascript
useAuthStore.getState()
```

## Manual Testing

### Test 1: Create Test User with Correct Status

```bash
cd backend
source .venv/bin/activate
python manage.py shell
```

```python
from authentication.models import User

# Create or update test user
user, created = User.objects.get_or_create(
    email='testuser@test.com',
    defaults={
        'user_type': 'companyuser',
        'role_type': 'user',
        'status': 'active',
        'is_active': True,
        'approval_status': 'approved',
        'induction_attended': True,
        'is_first_login': False
    }
)

if not created:
    user.user_type = 'companyuser'
    user.role_type = 'user'
    user.status = 'active'
    user.is_active = True
    user.approval_status = 'approved'
    user.induction_attended = True
    user.is_first_login = False
    user.save()

# Set password
user.set_password('test123')
user.save()

print(f"User created: {user.email}")
print(f"Status: {user.status}")
print(f"Role: {user.role_type}")
```

### Test 2: Login and Check Console

1. Login with test user
2. Open DevTools Console
3. Look for debug logs
4. Navigate to `/user/dashboard`
5. Check what logs appear

### Test 3: Check Route Rendering

Add temporary debug component:

```tsx
// In router.tsx, temporarily replace UserDashboard
<Route path="dashboard" element={
  <div style={{padding: '20px'}}>
    <h1>Dashboard Debug</h1>
    <p>If you see this, routing works!</p>
  </div>
} />
```

If this renders, the issue is in UserDashboard component.

## Expected Console Output (Success)

```
[UserGuard] State: { isAuthenticated: true, isLoading: false, user: 'testuser@test.com', userType: 'companyuser', roleType: 'user', status: 'active' }
[UserGuard] Checking status: { userStatus: 'active', path: '/user/dashboard' }
[UserGuard] Active user, checking legacy fields: { isFirstLogin: false, approvalStatus: 'approved', inductionAttended: true }
[UserGuard] All checks passed, rendering children
[UserLayout] Rendering with user: testuser@test.com location: /user/dashboard
[UserDashboard] Rendering with user: testuser@test.com
```

## If Still White Screen

### Last Resort Debugging

1. **Check if React is rendering at all:**
   ```javascript
   document.getElementById('root').innerHTML
   ```
   Should show React content, not empty.

2. **Check for CSS hiding content:**
   ```javascript
   document.body.style.display = 'block'
   document.body.style.visibility = 'visible'
   ```

3. **Check for z-index issues:**
   Open DevTools Elements tab, inspect the page structure.

4. **Disable Suspense temporarily:**
   Replace `<SuspenseWrapper>` with direct component render.

5. **Check for module loading errors:**
   Look in Network tab for failed JS chunk loads.

## Files to Check

1. `frontend/src/lib/router.tsx` - Route configuration
2. `frontend/src/layouts/UserLayout.tsx` - Layout component
3. `frontend/src/pages/user/Dashboard.tsx` - Dashboard component
4. `frontend/src/store/authStore.ts` - Auth state
5. `frontend/src/main.tsx` - App initialization

## Quick Fix Commands

```bash
# Clear all caches
rm -rf frontend/node_modules/.vite
rm -rf frontend/dist

# Reinstall dependencies
cd frontend
npm install

# Restart dev server
npm run dev
```

## Status

✅ Error Boundary added  
✅ Debug logging added  
✅ Route configuration verified  
✅ Guard logic verified  

**Next:** Check browser console for debug logs and errors.
