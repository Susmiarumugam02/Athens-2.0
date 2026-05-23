# White Screen Fix - Quick Card

## Problem
White screen on `/user/dashboard` after induction workflow changes.

## Root Cause
Parent `/user` route had `requireInduction` prop blocking `UserLayout` from rendering.

## Solution
Remove `requireApproved` and `requireInduction` props from parent route. The `UserGuard` automatic state machine handles all redirects.

## Fix Applied
```tsx
// BEFORE ❌
<Route path="/user" element={
  <UserGuard requireApproved requireInduction>
    <UserLayout />
  </UserGuard>
}>

// AFTER ✅
<Route path="/user" element={
  <UserGuard>
    <UserLayout />
  </UserGuard>
}>
```

## How It Works
UserGuard automatic checks (no props needed):
1. First login → `/user/profile-setup`
2. Pending approval → `/user/waiting-approval`
3. Rejected → `/user/rejected`
4. Approved + no induction → `/user/induction-pending`
5. Approved + induction complete → `/user/dashboard`

## Verification
```bash
./scripts/verify-white-screen-fix.sh
```

## Status
✅ **8/8 CHECKS PASSING**

## Files Changed
- `frontend/src/lib/router.tsx` - Removed guard props from `/user` route

## Test Results
✅ User with induction pending → redirects correctly  
✅ User with induction complete → dashboard renders  
✅ No white screen  
✅ UserLayout renders for all pages  

## Key Insight
**Automatic state machine > Manual props**

The UserGuard's built-in path-based checks handle all onboarding states correctly without needing explicit props on parent routes.
