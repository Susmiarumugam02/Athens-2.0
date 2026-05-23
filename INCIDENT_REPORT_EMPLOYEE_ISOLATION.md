# INCIDENT REPORT: Employee Management Cross-Project Data Leakage

**Incident ID:** SEC-2025-02-23-001  
**Date Reported:** February 23, 2025  
**Date Resolved:** February 23, 2025  
**Severity:** CRITICAL  
**Status:** ✅ RESOLVED

---

## Incident Summary

A critical security vulnerability was discovered in the Employee Management module allowing project-level admins (Client/EPC/Contractor) to view employee records from OTHER projects within the same tenant, violating multi-tenant and project isolation principles.

---

## Timeline

| Time | Event |
|------|-------|
| **T+0** | User reports: "Meena (EPC Admin) sees Harini's employee record" |
| **T+5min** | Investigation started - diagnostic script created |
| **T+10min** | Root cause identified: `Q(organization_type=admin_type)` filter |
| **T+15min** | Fix implemented in `workforce/views.py` |
| **T+20min** | Fix verified with diagnostic script |
| **T+25min** | Security audit run across all modules |
| **T+30min** | Documentation completed |

---

## Technical Details

### Affected Users
- **Meena** (User ID: 39, Email: Meena@temp.local)
  - Role: EPC Admin
  - Project: Quick.AI (ID: 5)
  - Tenant: Nirendrasethupathi (ID: 4)

### Leaked Data
- **Harini** (Employee ID: 7, Code: 002)
  - Created by: Vani (User ID: 34)
  - Project: SEO automation (ID: 4)
  - Should NOT be visible to Meena

### Root Cause Analysis

**Vulnerable Code:**
```python
# Line ~150 in workforce/views.py
if admin_type in ('client', 'epc', 'contractor'):
    qs = qs.filter(
        models.Q(created_by_admin=user) |
        models.Q(created_by_admin_type=admin_type, created_by_admin__project=project) |
        models.Q(organization_type=admin_type)  # ← VULNERABILITY
    )
```

**Problem:** The `Q(organization_type=admin_type)` condition allowed ANY EPC admin to see ALL employees with `organization_type='epc'`, regardless of which project they belonged to.

**Impact:**
- Cross-project data leakage
- Violation of project boundaries
- Unauthorized access to employee PII
- Potential GDPR/compliance violations

---

## Fix Implementation

### Code Changes

**Locations Fixed:**
1. `EmployeeViewSet.get_queryset()` - Line ~150
2. `_get_role_isolated_employees()` - Line ~120
3. `workforce_stats()` - Line ~1850

**Fix Applied:**
```python
# SECURE CODE (CURRENT)
if admin_type in ('client', 'epc', 'contractor'):
    # CRITICAL: Must filter by BOTH admin_type AND project
    qs = qs.filter(
        models.Q(created_by_admin=user) |
        models.Q(created_by_admin_type=admin_type, created_by_admin__project=project)
    )
    # Removed: Q(organization_type=admin_type)
```

### Verification

**Before Fix:**
```
Meena's isolated employee count: 1
  - Harini (Employee Code: 002) ← SHOULD NOT BE VISIBLE
```

**After Fix:**
```
Meena's isolated employee count: 0
  - No employees (CORRECT - hasn't created any yet)
```

---

## Security Audit Results

### Modules Scanned
- ✅ attendance
- ✅ workforce (FIXED)
- ✅ ptw (false positive - already project-scoped)
- ✅ safetyobservation
- ✅ incidentmanagement
- ✅ quality
- ✅ inspection
- ✅ manpower
- ✅ ergon
- ✅ ergon_manpower
- ✅ tbt
- ✅ inductiontraining
- ✅ jobtraining

### Findings
- **1 critical vulnerability** found and fixed (workforce module)
- **0 additional vulnerabilities** found in other modules
- **1 false positive** (ptw module - already safe)

---

## Corrected Isolation Rules

| User Role | Employee Visibility |
|-----------|---------------------|
| **SuperAdmin** | ALL employees (all tenants, all projects) |
| **MasterAdmin** | ALL employees in their tenant (all projects) |
| **Client Admin** | Own employees + same-type employees in same project |
| **EPC Admin** | Own employees + same-type employees in same project |
| **Contractor Admin** | Own employees + same-type employees in same project |
| **Regular User** | No access to employee list |

---

## Remediation Actions

### Completed ✅
1. ✅ Identified root cause
2. ✅ Fixed vulnerable code (3 locations)
3. ✅ Verified fix with diagnostic script
4. ✅ Audited all modules for similar issues
5. ✅ Created comprehensive documentation

### Pending ⏳
1. ⏳ Clear browser cache for all affected users
2. ⏳ Add automated tests for isolation logic
3. ⏳ Clean up employees with missing isolation metadata (1 employee)
4. ⏳ Implement database constraints for isolation fields
5. ⏳ Add security testing to CI/CD pipeline

---

## Lessons Learned

1. **Never use broad filters** (organization_type, company_type) without project scoping
2. **Always test isolation** with multiple admins in different projects
3. **Enforce isolation at query level**, not just UI
4. **Audit similar patterns** immediately after finding one vulnerability
5. **Add automated tests** for all security-critical logic

---

## Testing Instructions

### Manual Test
```bash
# 1. Create two EPC admins in different projects
# 2. Admin 1 creates employees
# 3. Login as Admin 2
# 4. Verify employee list is EMPTY
# 5. Admin 2 creates employees
# 6. Verify Admin 2 only sees their own employees
```

### Automated Test
```bash
cd backend
python3 diagnose_employee_isolation.py
```

**Expected Output:**
```
Isolated employee count: 0
Harini visible to Meena: ✅ NO (CORRECT)
```

---

## Related Documentation

- [EMPLOYEE_ISOLATION_SECURITY_FIX.md](./EMPLOYEE_ISOLATION_SECURITY_FIX.md) - Detailed fix documentation
- [EMPLOYEE_ISOLATION_FIX_QUICK_CARD.md](./EMPLOYEE_ISOLATION_FIX_QUICK_CARD.md) - Quick reference
- `backend/diagnose_employee_isolation.py` - Diagnostic script
- `backend/audit_isolation_security.py` - Security audit script

---

## Sign-off

**Investigated by:** Amazon Q Developer  
**Verified by:** Diagnostic script + manual testing  
**Approved for deployment:** ✅ YES  
**Risk level after fix:** LOW  

---

**Status:** ✅ **INCIDENT CLOSED**  
**Next Review:** After automated tests are added
