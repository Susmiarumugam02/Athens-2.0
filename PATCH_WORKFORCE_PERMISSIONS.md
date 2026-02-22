# Workforce Permissions Standardization

**Date:** February 20, 2025  
**Module:** workforce  
**Commit:** (pending)

---

## Changes Made

### workforce/permissions.py

**IsWorkforceAdmin (Lines 26-35)**

**BEFORE:**
```python
class IsWorkforceAdmin(permissions.BasePermission):
    """Owner/Admin can manage workforce"""
    
    def has_permission(self, request, view):
        user = request.user
        if user.user_type == 'masteradmin':
            return True
        if user.user_type == 'companyuser' and user.admin_type:
            return True
        return False
```

**AFTER:**
```python
class IsWorkforceAdmin(IsServiceAdmin):
    """Owner/Admin can manage workforce (deprecated: use IsServiceAdmin directly)"""
    pass
```

**Rationale:** IsWorkforceAdmin duplicated exact logic from canonical IsServiceAdmin. Refactored to inherit from canonical class, preserving backward compatibility as alias.

---

## Inventory Summary

**Inline checks found:** 3 (all in workforce/permissions.py IsWorkforceAdmin.has_permission)  
**Permission classes updated:** 1 (IsWorkforceAdmin)  
**ViewSets using permissions:** 15 endpoints in workforce/views.py (no changes needed - already use IsWorkforceAdmin)

**Existing permission_classes patterns:**
- `[IsAuthenticated, WorkforceServiceEnabled, IsWorkforceAdmin]` - Admin-only endpoints (11 endpoints)
- `[IsAuthenticated, WorkforceServiceEnabled]` - Read-only endpoints (4 endpoints)

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
# 30 passed in 0.23s
```

### Manual Verification (Not Run - DB Blocked)

**Test 1: Read endpoint (authenticated user)**
```bash
# GET /api/workforce/employees/ - Should return 200 for authenticated user
curl -X GET http://localhost:8004/api/workforce/employees/ \
  -H "Authorization: Bearer <access_token>"

# Expected: 200 OK (if service enabled)
# Expected: 403 Forbidden (if service disabled or not configured)
```

**Test 2: Admin-only write endpoint (non-admin denied)**
```bash
# POST /api/workforce/employees/ - Should return 403 for non-admin CompanyUser
curl -X POST http://localhost:8004/api/workforce/employees/ \
  -H "Authorization: Bearer <companyuser_token_without_admin_type>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Employee", "employee_code": "EMP001"}'

# Expected: 403 Forbidden (IsWorkforceAdmin denies CompanyUser without admin_type)
```

**Test 3: Admin write endpoint (admin allowed)**
```bash
# POST /api/workforce/employees/ - Should return 201 for MasterAdmin or CompanyUser with admin_type
curl -X POST http://localhost:8004/api/workforce/employees/ \
  -H "Authorization: Bearer <masteradmin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Employee", "employee_code": "EMP001", "athens_tenant_id": 1}'

# Expected: 201 Created (IsWorkforceAdmin allows MasterAdmin)
```

**Test 4: Cross-tenant attempt blocked**
```bash
# GET /api/workforce/employees/?athens_tenant_id=999 - Should return 404/empty for different tenant
curl -X GET "http://localhost:8004/api/workforce/employees/?athens_tenant_id=999" \
  -H "Authorization: Bearer <tenant_1_masteradmin_token>"

# Expected: Empty list [] (tenant scoping filters queryset)
```

---

## Behavior Preservation

**Before migration:**
- IsWorkforceAdmin allowed: MasterAdmin, CompanyUser with admin_type
- IsWorkforceAdmin denied: CompanyUser without admin_type, SuperAdmin

**After migration:**
- IsWorkforceAdmin (now inherits IsServiceAdmin) allows: MasterAdmin, CompanyUser with admin_type
- IsWorkforceAdmin denies: CompanyUser without admin_type, SuperAdmin
- **Zero behavior change** ✅

---

## Files Changed

```
backend/workforce/permissions.py    # 1 class refactored (IsWorkforceAdmin)
```

---

## Notes

- WorkforceServiceEnabled permission preserved (service enablement check)
- All 15 endpoints in workforce/views.py already use permission_classes correctly
- No inline checks found in views.py (all authorization via permission_classes)
- IsWorkforceAdmin kept as backward-compatible alias (can be replaced with IsServiceAdmin in future cleanup)

---

**Status:** ✅ Complete  
**Verification:** Django check passed, unit tests passed, manual verification pending (DB blocked)
