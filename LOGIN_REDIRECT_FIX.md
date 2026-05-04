# Login Redirect Loop Fix

## Issue
Company users logging in were being redirected to Athens Sustainability module (`/services/athens_sustainability/dashboard`) instead of the company dashboard (`/app`).

## Root Cause
The `AthensAccessGuard` component was wrapping the `/app` and `/company` routes. This guard checks if Athens Sustainability service is enabled and redirects users through the Athens onboarding flow (password reset → profile completion → approval → induction).

Since the guard was applied to the main dashboard routes, ALL company users were being redirected to Athens Sustainability, even if they just wanted to access the main dashboard.

## Solution

### Router Changes
**File**: `/var/www/athens-2.0/frontend/src/lib/router.tsx`

Removed `AthensAccessGuard` from the main company dashboard routes:

**Before**:
```tsx
<Route
  path="/app"
  element={
    <ProtectedRoute requireCompanyUser requireApproved>
      <AthensAccessGuard>  {/* ❌ This was causing the redirect */}
        <SuspenseWrapper>
          <CompanyDashboard />
        </SuspenseWrapper>
      </AthensAccessGuard>
    </ProtectedRoute>
  }
/>
```

**After**:
```tsx
<Route
  path="/app"
  element={
    <ProtectedRoute requireCompanyUser requireApproved>
      <SuspenseWrapper>
        <CompanyDashboard />
      </SuspenseWrapper>
    </ProtectedRoute>
  }
/>
```

### Guard Purpose
`AthensAccessGuard` should ONLY wrap Athens Sustainability-specific routes:
- `/company/athens/password-reset`
- `/company/athens/profile`
- `/company/athens/pending-approval`
- `/company/athens/induction`

These routes remain protected by the guard (unchanged).

## Testing

### Test Case 1: Company User Login
- **Action**: Login as company user
- **Expected**: Redirect to `/app` (company dashboard)
- **Result**: ✅ Correct redirect

### Test Case 2: Company User with ?redirect=athens
- **Action**: Login with `?redirect=athens` parameter
- **Expected**: Redirect to `/app` (not Athens Sustainability)
- **Result**: ✅ Correct redirect (handled in LoginPage.tsx)

### Test Case 3: Athens Sustainability Access
- **Action**: Navigate to `/company/athens/password-reset`
- **Expected**: Guard checks Athens access state
- **Result**: ✅ Guard still active for Athens routes

## Architecture

### Route Protection Layers

1. **ProtectedRoute**: Checks authentication and user type
   - Applied to: All protected routes
   - Purpose: Ensure user is logged in and has correct role

2. **AthensAccessGuard**: Checks Athens Sustainability onboarding state
   - Applied to: Athens-specific routes only
   - Purpose: Enforce Athens onboarding workflow

3. **Module Guards**: Check if specific modules are enabled
   - Applied to: Module-specific routes (ERGON, Workforce, etc.)
   - Purpose: Ensure user has access to the module

### Correct Guard Usage

```
Main Dashboard (/app)
└── ProtectedRoute (requireCompanyUser, requireApproved)
    └── CompanyDashboard

Athens Routes (/company/athens/*)
└── ProtectedRoute (requireCompanyUser, requireApproved)
    └── AthensAccessGuard
        └── Athens Component

Module Routes (/ergon, /workforce)
└── ProtectedRoute (requireCompanyUser, requireApproved)
    └── ModuleEnabledGuard
        └── Module Component
```

## Related Files
- `/var/www/athens-2.0/frontend/src/lib/router.tsx` - Route definitions
- `/var/www/athens-2.0/frontend/src/components/auth/AthensAccessGuard.tsx` - Guard component
- `/var/www/athens-2.0/frontend/src/pages/auth/LoginPage.tsx` - Login redirect logic

## Status
✅ **FIXED** - Company users now correctly redirect to `/app` dashboard after login
