# ERGON Permissions Standardization

**Date:** February 20, 2025  
**Module:** ergon  
**Commit:** (pending)

---

## Changes Made

### ergon/permissions.py

**IsErgonAdmin (Lines 18-20)**

**BEFORE:**
```python
class IsErgonAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.user_type == 'masteradmin' or request.user.admin_type
```

**AFTER:**
```python
class IsErgonAdmin(IsServiceAdmin):
    """ERGON admin permission (deprecated: use IsServiceAdmin directly)"""
    pass
```

**Rationale:** IsErgonAdmin logic matches canonical IsServiceAdmin (MasterAdmin OR CompanyUser with admin_type). Refactored to inherit from canonical class, preserving backward compatibility as alias.

---

## Inventory Summary

**Inline checks found:** 1 (in ergon/permissions.py IsErgonAdmin.has_permission)  
**Permission classes updated:** 1 (IsErgonAdmin)  
**ViewSets using permissions:** 14 endpoints in ergon/views.py (no changes needed - already use IsErgonAdmin)

**Existing permission_classes patterns:**
- `[IsAuthenticated, ErgonServiceEnabled, IsErgonAdmin]` - Admin-only endpoints (6 endpoints)
- `[IsAuthenticated, ErgonServiceEnabled]` - Read/general endpoints (7 endpoints)
- `[IsAuthenticated]` - Open endpoint (1 endpoint - likely health check)

**No changes needed in views.py** - All endpoints already use permission_classes correctly.

---

## Verification

### Django Check
```bash
python manage.py check
# System check identified no issues (0 silenced).
```

### Unit Tests
```bash
pytest authentication/tests/test_canonical_permissions.py -q
# 30 passed in 0.15s
```

### Manual Verification (Not Run - DB Blocked)

**Test 1: Read endpoint (authenticated user)**
```bash
# GET /api/ergon/tasks/ - Should return 200 for authenticated user with service enabled
curl -X GET http://localhost:8004/api/ergon/tasks/ \
  -H "Authorization: Bearer <access_token>"

# Expected: 200 OK (if ergon service enabled)
# Expected: 403 Forbidden (if service disabled or not configured)
```

**Test 2: Admin-only write endpoint (non-admin denied)**
```bash
# POST /api/ergon/projects/ - Should return 403 for CompanyUser without admin_type
curl -X POST http://localhost:8004/api/ergon/projects/ \
  -H "Authorization: Bearer <companyuser_token_without_admin_type>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "athens_tenant_id": 1}'

# Expected: 403 Forbidden (IsErgonAdmin denies CompanyUser without admin_type)
```

**Test 3: Admin write endpoint (admin allowed)**
```bash
# POST /api/ergon/projects/ - Should return 201 for MasterAdmin
curl -X POST http://localhost:8004/api/ergon/projects/ \
  -H "Authorization: Bearer <masteradmin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "athens_tenant_id": 1}'

# Expected: 201 Created (IsErgonAdmin allows MasterAdmin)
```

**Test 4: Cross-tenant attempt blocked**
```bash
# GET /api/ergon/tasks/?athens_tenant_id=999 - Should return empty for different tenant
curl -X GET "http://localhost:8004/api/ergon/tasks/?athens_tenant_id=999" \
  -H "Authorization: Bearer <tenant_1_masteradmin_token>"

# Expected: Empty list [] (tenant scoping filters queryset via get_current_tenant)
```

---

## Behavior Preservation

**Before migration:**
- IsErgonAdmin allowed: MasterAdmin, CompanyUser with admin_type
- IsErgonAdmin denied: CompanyUser without admin_type, SuperAdmin

**After migration:**
- IsErgonAdmin (now inherits IsServiceAdmin) allows: MasterAdmin, CompanyUser with admin_type
- IsErgonAdmin denies: CompanyUser without admin_type, SuperAdmin
- **Zero behavior change** ✅

---

## Files Changed

```
backend/ergon/permissions.py    # 1 class refactored (IsErgonAdmin)
```

---

## Notes

- ErgonServiceEnabled permission preserved (service enablement check)
- All 14 endpoints in ergon/views.py already use permission_classes correctly
- No inline checks found in views.py (all authorization via permission_classes)
- IsErgonAdmin kept as backward-compatible alias (can be replaced with IsServiceAdmin in future cleanup)
- Pattern identical to workforce module (both use same service admin logic)

---

**Status:** ✅ Complete  
**Verification:** Django check passed, unit tests passed, manual verification pending (DB blocked)
