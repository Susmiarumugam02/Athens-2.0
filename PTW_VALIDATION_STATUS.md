# PTW Module - Authenticated API Validation Status

## ✅ Completed

### 1. PTW Module Recovery (5 Phases)
- ✅ Feature flag implementation (`FEATURE_PTW_ENABLED = True`)
- ✅ Dependency mapping (13 Athens-specific imports)
- ✅ Startup decoupling (compatibility shims)
- ✅ App imports (worker, permissions, ptw)
- ✅ Database migrations (45+ tables created)
- ✅ Server boots cleanly with PTW enabled

### 2. Database Setup
- ✅ PTW tables created (`ptw_permit`, `ptw_permittype`, `ptw_permitapproval`, etc.)
- ✅ Worker tables created (`worker_worker`, `worker_workerskill`, etc.)
- ✅ Permissions tables created (`permissions_permissionrequest`, `permissions_permissiongrant`)
- ✅ Migrations applied successfully

### 3. Test Data Setup
- ✅ User assigned to project (test_company → TS10, project_id=4)
- ✅ User assigned to tenant (test_company → tenant_id=1)
- ✅ Permit type created (Hot Work, id=1)
- ✅ Authentication working (JWT tokens generated)

## ⚠️ Current Blocker

### Tenant Context Resolution Issue

**Problem**: PTW endpoints return `403 TENANT_CONTEXT_REQUIRED` despite valid authentication.

**Root Cause**: Mismatch between tenant resolution logic:
- JWT payload contains: `company_id=1` (integer)
- `TenantResolver.validate_tenant()` expects UUID format
- `AthensTenant` model vs `Tenant` model confusion

**Evidence**:
```bash
curl -i "http://127.0.0.1:8003/api/ptw/permits/" \
  -H "Authorization: Bearer $TOKEN"
# Returns: HTTP 403 {"error":"TENANT_CONTEXT_REQUIRED","message":"Tenant context missing"}
```

**Files Involved**:
- `/var/www/athens-2.0/backend/authentication/tenant_resolver.py` - Tenant extraction logic
- `/var/www/athens-2.0/backend/authentication/rbac_permissions.py` - `RequireTenantPermission` class
- `/var/www/athens-2.0/backend/ptw/views.py` - `PermitViewSet` uses `RequireTenantPermission`

## 🔧 Required Fixes

### Option A: Fix Tenant Resolver (Recommended)
Update `TenantResolver.validate_tenant()` to handle both UUID and integer tenant IDs:

```python
# authentication/tenant_resolver.py
@staticmethod
def validate_tenant(tenant_id):
    if not tenant_id:
        return None
    
    try:
        # Try control_plane.Tenant first (integer ID)
        from control_plane.models import Tenant
        tenant = Tenant.objects.get(id=tenant_id, is_active=True)
        return tenant
    except (ObjectDoesNotExist, ValueError):
        # Fallback to AthensTenant (UUID)
        try:
            tenant = AthensTenant.objects.get(id=tenant_id, is_active=True)
            return tenant
        except ObjectDoesNotExist:
            return None
```

### Option B: Standardize Tenant Model
- Decide on single tenant model (`control_plane.Tenant` vs `authentication.AthensTenant`)
- Update all references consistently
- Ensure JWT payload matches database schema

## 📋 E2E Test Script Created

**File**: `/var/www/athens-2.0/PTW_E2E_SMOKE_TEST.sh`

**Tests**:
1. ✅ Authentication (JWT token generation)
2. ⚠️  List Permits (blocked by tenant context)
3. ⏳ Fetch Permit Types
4. ⏳ Create Permit
5. ⏳ Retrieve Permit
6. ⏳ Audit Logs
7. ⏳ Workflow (status transitions)
8. ⏳ Tenant Isolation

**Current Status**: 1/8 tests passing

## 🎯 Next Steps (Priority Order)

### Immediate (Unblock E2E)
1. **Fix tenant resolver** to handle integer tenant IDs
2. **Reload gunicorn** after fix
3. **Re-run E2E test** (`./PTW_E2E_SMOKE_TEST.sh`)
4. **Verify all 8 tests pass**

### Short-term (Workflow Validation)
5. **Create second tenant user** for isolation testing
6. **Test verify workflow** (assign verifier, verify permit)
7. **Test approve workflow** (assign approver, approve permit)
8. **Test reject workflow** (reject with comments)
9. **Verify audit logs** contain all actions

### Medium-term (RBAC & Production)
10. **Test RBAC** with different user roles (verifier, approver, requestor)
11. **Add to CI/CD** (convert script to pytest)
12. **Document API contract** (OpenAPI spec)
13. **Performance test** (100+ permits, concurrent requests)

## 📊 API Endpoints Status

| Endpoint | Method | Auth | Tenant | Status |
|----------|--------|------|--------|--------|
| `/api/ptw/permits/` | GET | ✅ | ⚠️ | Blocked |
| `/api/ptw/permits/` | POST | ✅ | ⚠️ | Blocked |
| `/api/ptw/permits/{id}/` | GET | ✅ | ⚠️ | Blocked |
| `/api/ptw/permits/{id}/update_status/` | POST | ✅ | ⚠️ | Blocked |
| `/api/ptw/permits/{id}/verify/` | POST | ✅ | ⚠️ | Blocked |
| `/api/ptw/permits/{id}/approve/` | POST | ✅ | ⚠️ | Blocked |
| `/api/ptw/permit-types/` | GET | ✅ | ⚠️ | Blocked |

## 🔐 Security Validation Checklist

- [ ] Tenant isolation (User A cannot see User B's permits)
- [ ] RBAC enforcement (Only verifiers can verify)
- [ ] Audit logging (All actions logged)
- [ ] Rate limiting (Throttling configured)
- [ ] Input validation (Malformed requests rejected)
- [ ] SQL injection prevention (ORM used correctly)
- [ ] XSS prevention (Output sanitized)

## 📝 Test Data Summary

```
Tenant: Prozeal Green Energy Limited (id=1)
User: test_company@example.com (id=22, tenant_id=1, project_id=4)
Project: TS10 (id=4)
Permit Type: Hot Work (id=1, category=hot_work, risk=high)
```

## 🚀 Success Criteria

**PTW Module is production-ready when**:
1. ✅ All E2E tests pass (8/8)
2. ✅ Tenant isolation verified (cross-tenant access blocked)
3. ✅ Workflow transitions work (draft → submitted → verified → approved)
4. ✅ Audit logs capture all actions
5. ✅ RBAC enforced (role-based access control)
6. ✅ Performance acceptable (<200ms for list, <100ms for retrieve)
7. ✅ CI/CD integration complete
8. ✅ API documentation published

**Current Progress**: 12% (1/8 tests passing, tenant resolver fix needed)

---

**Last Updated**: 2025-02-23  
**Status**: 🟡 In Progress - Tenant Context Resolution Blocker  
**Next Action**: Fix `TenantResolver.validate_tenant()` to handle integer IDs
