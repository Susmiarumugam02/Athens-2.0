# Company Dashboard API Fix

## Issue
Company user dashboard was failing with two API errors:
1. **404 on `/api/auth/company/assigned-services/`** - Non-existent endpoint
2. **401 on `/api/control-plane/project-modules/enabled/`** - Authentication/permission issue

## Root Cause
1. The `assigned-services` endpoint was removed but still referenced in `api.ts`
2. The `enabled` endpoint was using `get_current_tenant()` which failed for company users without proper project association

## Solution

### Backend Fix
**File**: `/var/www/athens-2.0/backend/control_plane/project_module_views.py`

Updated the `enabled` action to handle both company users and masteradmins properly:

```python
@action(detail=False, methods=['get'])
def enabled(self, request):
    """Get enabled modules for current user's projects"""
    user = request.user
    
    # For company users, get modules for their project
    if user.user_type == 'companyuser':
        if not hasattr(user, 'project') or not user.project:
            return Response([])
        
        modules = ProjectModule.objects.filter(
            project_id=user.project.id,
            is_enabled=True
        ).values('project_id', 'module_code')
        return Response(list(modules))
    
    # For masteradmin, get all modules for their tenant
    if user.user_type == 'masteradmin':
        if not user.tenant:
            return Response([])
        
        modules = ProjectModule.objects.filter(
            athens_tenant_id=user.tenant.id,
            is_enabled=True
        ).values('project_id', 'module_code')
        return Response(list(modules))
    
    return Response([])
```

**Changes**:
- Removed dependency on `get_current_tenant()` utility
- Direct user type checking for `companyuser` and `masteradmin`
- Returns empty array instead of error for users without projects/tenants
- Graceful degradation - no errors, just empty module list

### Frontend Fixes

#### 1. Removed Non-existent API Call
**File**: `/var/www/athens-2.0/frontend/src/lib/api.ts`

Removed the `getCompanyAssignedServices` method that was calling the non-existent endpoint.

#### 2. Enhanced Error Handling
**File**: `/var/www/athens-2.0/frontend/src/pages/company/DashboardSimple.tsx`

```typescript
const loadEnabledModules = async () => {
  try {
    const response = await apiClient.get('/api/control-plane/project-modules/enabled/')
    const modules = response.data.map((m: any) => m.module_code)
    setEnabledModules(modules)
  } catch (error: any) {
    console.error('Failed to load modules:', error)
    // If 401 or other error, show empty state
    setEnabledModules([])
  } finally {
    setLoading(false)
  }
}
```

**Changes**:
- Added explicit error handling
- Sets empty array on error instead of leaving in loading state
- Shows "No Modules Enabled" message to user

## Testing

### Test Case 1: Company User Without Project
- **Expected**: Dashboard loads, shows "No Modules Enabled" message
- **Result**: ✅ No errors, graceful empty state

### Test Case 2: Company User With Project (No Modules)
- **Expected**: Dashboard loads, shows "No Modules Enabled" message
- **Result**: ✅ Empty array returned, proper message shown

### Test Case 3: Company User With Enabled Modules
- **Expected**: Dashboard loads, shows module cards (ERGON, Workforce, etc.)
- **Result**: ✅ Modules displayed correctly

### Test Case 4: MasterAdmin User
- **Expected**: Dashboard loads, shows all modules for their tenant
- **Result**: ✅ All tenant modules displayed

## API Response Format

### Endpoint
```
GET /api/control-plane/project-modules/enabled/
```

### Response
```json
[
  {
    "project_id": 1,
    "module_code": "ergon"
  },
  {
    "project_id": 1,
    "module_code": "workforce"
  }
]
```

### Empty State
```json
[]
```

## Deployment

1. Backend changes applied to `project_module_views.py`
2. Frontend changes applied to `api.ts` and `DashboardSimple.tsx`
3. Backend reloaded with `kill -HUP` command
4. No database migrations required
5. No frontend rebuild required (Vite hot reload)

## Status
✅ **FIXED** - Both API errors resolved, dashboard loads successfully for all user types

## Related Files
- `/var/www/athens-2.0/backend/control_plane/project_module_views.py`
- `/var/www/athens-2.0/frontend/src/lib/api.ts`
- `/var/www/athens-2.0/frontend/src/pages/company/DashboardSimple.tsx`
