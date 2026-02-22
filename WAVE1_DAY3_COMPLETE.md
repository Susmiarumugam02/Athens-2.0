# Wave 1 / Day 3: RBAC Core Import - COMPLETE ✅

**Branch**: `import/rbac-core`  
**Commit**: `1b958ce9`  
**Date**: 2025-02-22

## What Was Imported

### 1. RBAC Permission Classes (`rbac_permissions.py`)

Imported from old Athens with tenant-scoping enhancements:

- **IsSuperAdmin**: Platform-level superadmin check
- **IsMasterAdmin**: Master admin (tenant-scoped) check
- **IsProjectAdmin**: Project admin check
- **IsAdminUser**: Admin user check
- **RequireTenantContext**: Ensures tenant context is attached to request
- **RequireTenantPermission**: Tenant-scoped permission guard with role-based checks
- **require_master_admin**: Decorator for function-based views

### 2. Permissions Endpoint (`GET /api/auth/me/permissions`)

Returns current user's roles and permissions for their tenant:

```json
{
  "tenant_id": "uuid",
  "user_type": "masteradmin",
  "admin_type": "client",
  "roles": ["MASTER_ADMIN"],
  "permissions": ["tenant.read", "tenant.write", "user.read", "user.write", ...]
}
```

### 3. Tests

- **test_rbac_unit.py**: 11 unit tests (no database) - ALL PASSING ✅
- **test_rbac_permissions.py**: 5 integration tests (requires migrations - deferred)

## Usage Examples

### Using Permission Classes in Views

```python
from rest_framework.decorators import api_view, permission_classes
from authentication.rbac_permissions import RequireTenantPermission, IsMasterAdmin

@api_view(['GET'])
@permission_classes([RequireTenantPermission])
def my_view(request):
    # Tenant context is automatically attached to request.tenant
    tenant = request.tenant
    return Response({'tenant_id': str(tenant.id)})

@api_view(['POST'])
@permission_classes([IsMasterAdmin])
def admin_only_view(request):
    # Only master admins can access
    return Response({'message': 'Admin access granted'})
```

### Using Decorator for Function-Based Views

```python
from authentication.rbac_permissions import require_master_admin

@require_master_admin
def my_function_view(request):
    return HttpResponse("Master admin only")
```

### Checking Permissions from Frontend

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8004/api/auth/me/permissions/
```

## Permission Mapping (Simplified)

| User Type | Roles | Permissions |
|-----------|-------|-------------|
| superadmin | SUPERADMIN | * (all) |
| masteradmin | MASTER_ADMIN | tenant.*, user.*, project.*, service.* |
| projectadmin | PROJECT_ADMIN | project.*, user.* |
| adminuser | ADMIN_USER | project.read, user.read |
| companyuser | COMPANY_USER | project.read |
| serviceuser | SERVICE_USER | service.read |

## Test Results

```bash
$ pytest authentication/tests/test_rbac_unit.py -v
============================= 11 passed in 0.09s ==============================

Tests:
✅ test_is_superadmin_allows_superadmin
✅ test_is_superadmin_denies_masteradmin
✅ test_is_superadmin_denies_unauthenticated
✅ test_is_masteradmin_allows_masteradmin
✅ test_is_masteradmin_denies_companyuser
✅ test_is_projectadmin_allows_projectadmin
✅ test_is_adminuser_allows_adminuser
✅ test_require_tenant_context_bypasses_for_superadmin
✅ test_require_tenant_context_denies_unauthenticated
✅ test_require_tenant_permission_allows_superadmin
✅ test_require_tenant_permission_denies_unauthenticated
```

## Baseline Verification

```bash
$ python manage.py check
System check identified no issues (0 silenced). ✅
```

## Architecture Notes

### Simplified RBAC (No Role/Permission Tables)

Old Athens uses **user_type-based permissions** rather than complex Role/Permission database tables. This is simpler and sufficient for most use cases.

**Future expansion**: If granular permissions are needed, can add:
- `Role` model (name, code, tenant_id)
- `Permission` model (code, description)
- `RolePermission` M2M table
- `UserRole` M2M table with tenant scoping

### Tenant Context Attachment

`RequireTenantContext` and `RequireTenantPermission` use `TenantResolver` (from Day 2) to:
1. Extract tenant ID from user or JWT
2. Validate tenant exists and is active
3. Attach tenant to `request.tenant` for downstream use

### SuperAdmin Bypass

SuperAdmin users bypass all tenant checks and have wildcard permissions (`*`).

## Files Changed

```
backend/authentication/rbac_permissions.py          (NEW - 140 lines)
backend/authentication/views.py                     (MODIFIED - added my_permissions endpoint)
backend/authentication/urls.py                      (MODIFIED - added /me/permissions/ route)
backend/authentication/models.py                    (MODIFIED - import rbac_permissions)
backend/authentication/tests/test_rbac_unit.py      (NEW - 11 tests)
backend/authentication/tests/test_rbac_permissions.py (NEW - 5 tests, deferred)
```

## Next Steps: Wave 1 Day 4

**Audit Logging Core** - Because once permissions are in, every privileged action should be auditable.

Import from old Athens:
- Centralized audit logging utilities
- Audit log models (if not already present)
- Audit decorators for automatic logging
- Audit log viewing/filtering endpoints

---

**Status**: ✅ Wave 1 Day 3 COMPLETE | Baseline GREEN | 11 Tests PASSING
