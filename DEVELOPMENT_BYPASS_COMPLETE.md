# Development Induction Bypass - Complete Implementation

## Overview
Temporary development-only bypass for induction training requirement to allow testing without manual database edits.

## ⚠️ CRITICAL: Development Only
**This bypass is ONLY for local development and testing. NEVER enable in production.**

## Implementation

### 1. Environment Variable
**File:** `frontend/.env.local`

```env
# Bypass induction training requirement for development/testing
VITE_BYPASS_INDUCTION=true
```

### 2. Guard Logic Updated
**File:** `frontend/src/lib/router.tsx`

```typescript
const bypassInduction = import.meta.env.VITE_BYPASS_INDUCTION === 'true'

// Skip induction redirect if bypass enabled
if (userStatus === 'approved_pending_induction' && !bypassInduction) {
  return <Navigate to="/user/induction-pending" replace />
}
```

### 3. Visual Warning Banner
**File:** `frontend/src/components/DevelopmentBanner.tsx`

Shows prominent warning at top of screen when bypass is enabled:
```
⚠️ DEVELOPMENT MODE: Induction training bypass enabled ⚠️
```

## How It Works

### Without Bypass (Production)
```
User Status: approved_pending_induction
↓
Redirect to: /user/induction-pending
↓
User waits for admin to mark attendance
↓
Status changes to: active
↓
Dashboard accessible
```

### With Bypass (Development)
```
User Status: approved_pending_induction
↓
Bypass flag: VITE_BYPASS_INDUCTION=true
↓
Skip redirect, allow dashboard access
↓
Warning banner shows: "DEVELOPMENT MODE"
↓
Dashboard accessible immediately
```

## Usage

### Enable Bypass (Development)

1. **Create `.env.local` file:**
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. **Set bypass flag:**
   ```env
   VITE_BYPASS_INDUCTION=true
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Verify:**
   - Yellow warning banner appears at top
   - Console shows: `⚠️ DEVELOPMENT MODE: Bypassing induction requirement`
   - Users with `approved_pending_induction` can access dashboard

### Disable Bypass (Production)

1. **Remove or set to false:**
   ```env
   VITE_BYPASS_INDUCTION=false
   ```
   OR delete the line entirely

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Verify:**
   - No warning banner
   - Induction requirement enforced
   - Users redirected to `/user/induction-pending`

## Testing

### Test Case 1: Bypass Enabled
```bash
# Set in .env.local
VITE_BYPASS_INDUCTION=true

# Expected behavior:
✅ Warning banner visible
✅ Console shows bypass message
✅ approved_pending_induction users can access dashboard
✅ No redirect to induction page
```

### Test Case 2: Bypass Disabled
```bash
# Set in .env.local
VITE_BYPASS_INDUCTION=false

# Expected behavior:
✅ No warning banner
✅ approved_pending_induction users redirected to induction page
✅ Dashboard blocked until admin marks attendance
✅ Normal onboarding flow enforced
```

### Test Case 3: Production Build
```bash
# Build without .env.local
npm run build

# Expected behavior:
✅ No bypass flag in build
✅ Induction requirement enforced
✅ No warning banner
✅ Secure onboarding flow
```

## Console Output

### With Bypass Enabled
```
[UserGuard] State: { ..., bypassInduction: true }
[UserGuard] ⚠️ DEVELOPMENT MODE: Bypassing induction requirement
[UserGuard] All checks passed, rendering children
```

### With Bypass Disabled
```
[UserGuard] State: { ..., bypassInduction: false }
[UserGuard] Redirecting to induction pending
```

## Security Considerations

### ✅ Safe Implementation
- Environment variable controlled
- Only affects frontend routing
- Backend still enforces access control
- Visual warning prevents accidental production use
- `.env.local` in `.gitignore`

### ❌ What This Does NOT Bypass
- Backend API authentication
- Backend permission checks
- Database access control
- Admin-only endpoints
- Audit logging

### 🔒 Production Safety
1. **`.env.local` never committed** - In `.gitignore`
2. **`.env.example` has bypass=false** - Safe default
3. **Warning banner** - Visible indicator
4. **Console logs** - Clear bypass messages
5. **Build process** - Excludes `.env.local`

## Files Changed

### New Files
- `frontend/.env.local` - Development environment variables
- `frontend/.env.example` - Template with safe defaults
- `frontend/src/components/DevelopmentBanner.tsx` - Warning banner

### Modified Files
- `frontend/src/lib/router.tsx` - Added bypass logic to UserGuard
- `frontend/src/main.tsx` - Added DevelopmentBanner
- `frontend/.gitignore` - Added `.env.local`

## Quick Commands

### Enable Bypass
```bash
echo "VITE_BYPASS_INDUCTION=true" > frontend/.env.local
cd frontend && npm run dev
```

### Disable Bypass
```bash
echo "VITE_BYPASS_INDUCTION=false" > frontend/.env.local
cd frontend && npm run dev
```

### Check Current Status
```bash
cat frontend/.env.local | grep VITE_BYPASS_INDUCTION
```

### Remove Bypass Completely
```bash
rm frontend/.env.local
cd frontend && npm run dev
```

## Troubleshooting

### Issue: Bypass not working
**Solution:** Restart dev server after changing `.env.local`

### Issue: Warning banner not showing
**Solution:** Check console for `bypassInduction` value, verify `.env.local` exists

### Issue: Still redirected to induction page
**Solution:** 
1. Check `.env.local` has `VITE_BYPASS_INDUCTION=true`
2. Restart dev server
3. Clear browser cache
4. Check console for bypass logs

### Issue: Bypass enabled in production
**Solution:**
1. Delete `.env.local` from production server
2. Rebuild: `npm run build`
3. Verify no warning banner
4. Check environment variables

## Alternative: Manual Database Update

If you prefer to test with real data instead of bypass:

```bash
cd backend
source .venv/bin/activate
python manage.py shell
```

```python
from authentication.models import User

user = User.objects.get(email='testuser@test.com')
user.status = 'active'
user.induction_attended = True
user.induction_attended_at = timezone.now()
user.save()

print(f"✅ User {user.email} marked as active")
```

## Status

✅ **IMPLEMENTATION COMPLETE**

- ✅ Environment variable bypass implemented
- ✅ UserGuard logic updated
- ✅ Warning banner added
- ✅ Console logging added
- ✅ `.gitignore` updated
- ✅ Documentation complete
- ✅ Safe defaults in `.env.example`

## Production Checklist

Before deploying to production:

- [ ] Verify `.env.local` not in repository
- [ ] Check `.env.example` has `VITE_BYPASS_INDUCTION=false`
- [ ] Build and test without bypass
- [ ] Verify warning banner does not appear
- [ ] Test induction flow works normally
- [ ] Confirm backend access control intact

## Next Steps

1. **Start dev server** with bypass enabled
2. **Login** with approved user
3. **Verify** warning banner appears
4. **Access** `/user/dashboard` successfully
5. **Test** all modules work normally
6. **Before production** - disable bypass and test again
