# ADR 0001: Tenant Identity Standardization

**Status:** Accepted  
**Date:** 2025-02-20  
**Deciders:** Architecture Team  
**Tags:** multi-tenancy, security, data-integrity

---

## Context

Athens 2.0 inherited multiple tenant identification patterns from legacy code:

### Current State (Before ADR):
- **3 tenant identifiers in User model:**
  - `company_id` (IntegerField) - Legacy field
  - `athens_tenant_id` (UUIDField) - Legacy field, marked DEPRECATED
  - `tenant` (ForeignKey to Tenant) - New field

- **2 tenant identifiers in business models:**
  - `athens_tenant_id` (IntegerField) - Used in ERGON, Workforce
  - `company_id` (IntegerField) - Used in Projects

### Problems:
1. **Data inconsistency:** Which field is source of truth?
2. **Security risks:** Wrong tenant access if filtering by wrong field
3. **Developer confusion:** No clear pattern to follow
4. **Maintenance burden:** Changes require updating multiple fields
5. **Migration incomplete:** Old code uses deprecated fields

### Evidence:
- 17 files analyzed with mixed tenant field usage
- ERGON & Workforce modules already use helper pattern (good)
- Projects module uses direct `user.company_id` access (bad)
- Authentication module has mixed patterns (needs standardization)

---

## Decision

### Canonical Tenant Field: `user.tenant` (FK to control_plane.Tenant)

**Rationale:**
1. **Type safety:** FK provides Django ORM benefits (select_related, prefetch_related)
2. **Prevents invalid IDs:** FK constraint ensures tenant exists
3. **Already in use:** 15+ MasterAdmin views use this pattern
4. **Marked canonical:** Field has help_text "Tenant for MasterAdmin scoping"
5. **Cascade protection:** FK provides delete protection

### Canonical Helper Function: `authentication.tenant_utils.get_tenant_for_user(user)`

**Signature:**
```python
def get_tenant_for_user(user) -> Tuple[Optional[Tenant], Optional[str]]:
    """
    Extract tenant from authenticated user (CANONICAL METHOD).
    
    Returns:
        tuple: (Tenant object or None, error_message or None)
    """
```

**User Type Behavior:**
- **superadmin:** Returns `(None, None)` - global access, no tenant scoping
- **masteradmin:** Returns `(user.tenant, None)` - FK lookup
- **companyuser:** Returns `(Tenant via company_id, None)` - legacy mapping
- **serviceuser:** Returns `(None, "Not supported")` - session-based auth

### Migration Path:

**Phase 1: Implement Helper** (✅ DONE - This ADR)
- Create `authentication/tenant_utils.py`
- Add comprehensive unit tests
- Document decision in ADR
- **No existing code changed** (zero behavior change)

**Phase 2: Migrate Projects Module** (TODO - Next Patch)
- Refactor `projects/views.py` to use helper
- Refactor `projects/permissions.py` to use helper
- Add integration tests for tenant isolation
- **Low risk:** Projects module is isolated

**Phase 3: Migrate Authentication/Control Plane** (TODO - Future)
- Refactor authentication views
- Refactor control plane views
- Update API responses (breaking change)

**Phase 4: Deprecate Legacy Fields** (TODO - Future)
- Add deprecation warnings for `company_id` and `athens_tenant_id`
- Update documentation
- Notify developers

**Phase 5: Remove Legacy Fields** (TODO - v3.0)
- Database migration to remove old fields
- Final cleanup

---

## Consequences

### Positive:
✅ **Single source of truth** - No ambiguity about tenant identification  
✅ **Type-safe** - FK relationship prevents invalid tenant IDs  
✅ **Consistent pattern** - All new code follows same pattern  
✅ **Easier to audit** - Single helper function to review for security  
✅ **Better error messages** - Helper provides clear error messages  
✅ **Testable** - Helper is unit-testable in isolation  

### Negative:
⚠️ **Code changes required** - Existing code must be migrated  
⚠️ **Temporary dual-field support** - During migration, both old and new fields exist  
⚠️ **API response changes** - Future breaking change when removing `athens_tenant_id` from responses  
⚠️ **Learning curve** - Developers must learn new pattern  

### Neutral:
ℹ️ **No performance impact** - Helper adds negligible overhead  
ℹ️ **Backward compatible** - Legacy fields still work during migration  

---

## Compliance

### All New Code MUST Use:

```python
from authentication.tenant_utils import get_tenant_for_user

# In ViewSets:
def get_queryset(self):
    tenant, error = get_tenant_for_user(self.request.user)
    if error:
        return Model.objects.none()
    return Model.objects.filter(athens_tenant_id=tenant.id)

def perform_create(self, serializer):
    tenant, error = get_tenant_for_user(self.request.user)
    if error:
        raise ValidationError({'error': error})
    serializer.save(athens_tenant_id=tenant.id)
```

### DO NOT Use:
❌ `user.company_id` - Legacy field, will be removed  
❌ `user.athens_tenant_id` - Legacy field, will be removed  
❌ Direct Tenant.objects.get(id=user.company_id) - Use helper instead  

### Exceptions:
- **Existing code during migration:** Old patterns allowed until refactored
- **API responses:** May still include `athens_tenant_id` for backward compatibility
- **Database models:** `athens_tenant_id` field remains until Phase 5

---

## Validation

### Tests Added:
- ✅ `authentication/tests/test_tenant_utils.py` - 18 unit tests
- ✅ All user types covered (superadmin, masteradmin, companyuser, serviceuser)
- ✅ Edge cases covered (missing tenant, invalid ID, etc.)

### Test Commands:
```bash
cd backend
source .venv/bin/activate
pytest authentication/tests/test_tenant_utils.py -v
```

### Expected Results:
- All 18 tests pass
- No existing tests broken
- No production code changed (Patch 1)

---

## References

- **Implementation:** `backend/authentication/tenant_utils.py`
- **Tests:** `backend/authentication/tests/test_tenant_utils.py`
- **Patch Plan:** `TENANT_STANDARDIZATION_PLAN.md`
- **Architecture Extraction:** `ARCHITECTURE_EXTRACTION_COMPLETE.md`

---

## Notes

This ADR represents **Patch 1** of the tenant standardization effort. It establishes the canonical pattern without changing any existing behavior. Future patches will migrate existing code to use this pattern.

**Next Steps:**
1. Merge Patch 1 (this ADR + helper + tests)
2. Implement Patch 2 (Projects module refactor)
3. Implement Patch 3 (Add deprecation warnings)
4. Continue migration of remaining modules

---

**Last Updated:** 2025-02-20  
**Status:** ✅ Implemented (Patch 1 Complete)
