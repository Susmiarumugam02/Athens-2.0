# MasterAdmin 400 Error Fix - Complete

## Root Cause Analysis

The production site was experiencing two 400 errors for MasterAdmin users:

1. **`/api/control-plane/tenants/` - 400 Error**
   - **Cause**: MasterAdminLayout was calling a SuperAdmin-only endpoint
   - **Issue**: MasterAdmin users don't have permission to access control-plane endpoints

2. **`/api/auth/masteradmin/dashboard/stats/` - 400 Error**
   - **Cause**: Endpoint returned 400 when user had no `athens_tenant_id` assigned
   - **Issue**: Should return empty stats instead of error for better UX

## Solutions Implemented

### 1. Backend Changes

#### Added New Endpoint for MasterAdmin
**File**: `/var/www/athens-2.0/backend/authentication/masteradmin/views.py`

```python
@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def my_tenant(request):
    """Get current MasterAdmin's tenant information"""
    user = request.user
    tenant_id = user.athens_tenant_id
    
    if not tenant_id:
        return Response(
            {'error': 'User not associated with a tenant'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    from control_plane.models import Tenant
    
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        return Response({
            'id': tenant.id,
            'name': tenant.name,
            'admin_email': tenant.admin_email,
            'is_active': tenant.is_active,
        })
    except Tenant.DoesNotExist:
        return Response(
            {'error': 'Tenant not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
```

#### Updated Dashboard Stats Endpoint
**File**: `/var/www/athens-2.0/backend/authentication/masteradmin/views.py`

Changed from returning 400 error to returning empty stats:

```python
@api_view(['GET'])
@permission_classes([IsMasterAdmin])
def dashboard_stats(request):
    """Get dashboard statistics for MasterAdmin"""
    user = request.user
    tenant_id = user.athens_tenant_id
    
    if not tenant_id:
        # Return empty stats instead of error for better UX
        return Response({
            'total_projects': 0,
            'active_projects': 0,
            'total_users': 0,
            'pending_approvals': 0
        })
    # ... rest of the function
```

#### Added URL Route
**File**: `/var/www/athens-2.0/backend/authentication/masteradmin/urls.py`

```python
urlpatterns = [
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('my-tenant/', views.my_tenant, name='my-tenant'),  # NEW
    # ... other routes
]
```

### 2. Frontend Changes

#### Updated MasterAdminLayout
**File**: `/var/www/athens-2.0/frontend/src/layouts/MasterAdminLayout.tsx`

Changed from calling SuperAdmin endpoint to MasterAdmin-specific endpoint:

```typescript
// BEFORE (calling SuperAdmin endpoint)
const fetchTenantName = async () => {
  try {
    const response = await apiClient.get('/api/control-plane/tenants/')
    const tenants = response.data.results || response.data
    const tenant = tenants.find((t: any) => t.id === user?.athens_tenant_id)
    if (tenant) {
      setTenantName(tenant.name)
    }
  } catch (error) {
    console.error('Failed to fetch tenant name:', error)
  }
}

// AFTER (calling MasterAdmin endpoint)
const fetchTenantName = async () => {
  try {
    const response = await apiClient.get('/api/auth/masteradmin/my-tenant/')
    if (response.data) {
      setTenantName(response.data.name)
    }
  } catch (error) {
    console.error('Failed to fetch tenant name:', error)
  }
}
```

### 3. Deployment

1. **Backend**: Reloaded gunicorn workers with `kill -HUP` signal
2. **Frontend**: Rebuilt with `npm run build`
3. **Nginx**: Reloaded with `systemctl reload nginx`
4. **Cache**: Touched index.html to force browser cache refresh

## API Endpoints

### New Endpoint
- **URL**: `GET /api/auth/masteradmin/my-tenant/`
- **Permission**: MasterAdmin only
- **Response**: 
  ```json
  {
    "id": "uuid",
    "name": "Tenant Name",
    "admin_email": "admin@example.com",
    "is_active": true
  }
  ```

### Updated Endpoint
- **URL**: `GET /api/auth/masteradmin/dashboard/stats/`
- **Permission**: MasterAdmin only
- **Response** (when no tenant assigned):
  ```json
  {
    "total_projects": 0,
    "active_projects": 0,
    "total_users": 0,
    "pending_approvals": 0
  }
  ```

## Testing

1. **Clear browser cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Login as MasterAdmin**: Should see tenant name in header
3. **Check console**: No more 400 errors
4. **Dashboard**: Should load without errors

## Files Modified

### Backend
- `/var/www/athens-2.0/backend/authentication/masteradmin/views.py`
- `/var/www/athens-2.0/backend/authentication/masteradmin/urls.py`

### Frontend
- `/var/www/athens-2.0/frontend/src/layouts/MasterAdminLayout.tsx`
- `/var/www/athens-2.0/frontend/dist/*` (rebuilt)

## Status

✅ **COMPLETE** - All changes deployed to production

**Date**: February 11, 2026  
**Environment**: Production (https://www.ai-athens.cloud)
