# TENANT STANDARDIZATION PLAN
**Date:** February 20, 2025  
**Status:** PATCH PLAN - NOT YET IMPLEMENTED  
**Goal:** Standardize tenant identification to single source of truth

---

## TASK 1: TENANT USAGE INVENTORY

### Summary of Findings:
- **3 tenant identifiers** in User model (company_id, athens_tenant_id, tenant FK)
- **2 tenant identifiers** in business models (athens_tenant_id integer, company_id integer)
- **Existing helper:** `system/utils.py::get_current_tenant()` (partial implementation)
- **Consistent pattern:** ERGON and Workforce modules use `get_current_tenant()` helper
- **Inconsistent pattern:** Projects, authentication, control_plane use direct field access

### Tenant Usage Table:

| File | Lines | Field Used | What It Scopes | Risk Level |
|------|-------|------------|----------------|------------|
| **authentication/models.py** | 109 | `athens_tenant_id` (UUID, DEPRECATED) | User tenant link | 🔴 HIGH - Marked deprecated but still in schema |
| **authentication/models.py** | 110-117 | `tenant` (FK to Tenant) | MasterAdmin scoping | 🟢 LOW - New canonical field |
| **authentication/models.py** | 108 | `company_id` (int) | Legacy tenant ID | 🟡 MEDIUM - Used in many places |
| **authentication/views.py** | 117, 164 | `user.athens_tenant_id` | Login response | 🟡 MEDIUM - API contract |
| **authentication/views.py** | 145-146 | `user.tenant` | MasterAdmin tenant name | 🟢 LOW - Correct usage |
| **authentication/views.py** | 271, 277 | `user.company_id` → Tenant.get(id=...) | Dashboard tenant lookup | 🔴 HIGH - Assumes company_id = tenant.id |
| **authentication/masteradmin/views.py** | 20, 65, 97, etc. | `user.tenant` | All MasterAdmin endpoints | 🟢 LOW - Correct pattern |
| **control_plane/views.py** | 209-211 | `company_id` query param | Audit log filtering | 🟡 MEDIUM - External API contract |
| **control_plane/views.py** | 359-362 | `athens_tenant_id` in data | SecurityLog creation | 🟡 MEDIUM - Legacy field |
| **projects/views.py** | 24, 28, 56-67 | `user.company_id` | Project filtering/creation | 🔴 HIGH - Assumes company_id = tenant.id |
| **projects/permissions.py** | 39 | `obj.company_id == user.company_id` | Permission check | 🔴 HIGH - Security critical |
| **system/utils.py** | 15 | `user.tenant` | MasterAdmin tenant extraction | 🟢 LOW - Correct |
| **system/utils.py** | 30 | `user.project.athens_tenant_id` | CompanyUser tenant extraction | 🟡 MEDIUM - Uses deprecated field |
| **ergon/models.py** | 6, 27, 37, etc. | `athens_tenant_id` (int) | All ERGON models | 🟢 LOW - Consistent pattern |
| **ergon/views.py** | ALL | `get_current_tenant()` helper | All ERGON endpoints | 🟢 LOW - Best practice |
| **workforce/models.py** | 9, 17, 30, etc. | `athens_tenant_id` (int) | All Workforce models | 🟢 LOW - Consistent pattern |
| **workforce/views.py** | ALL | `get_current_tenant()` helper | All Workforce endpoints | 🟢 LOW - Best practice |
| **control_plane/project_modules.py** | 28 | `athens_tenant_id` (int) | ProjectModule scoping | 🟢 LOW - Consistent |

### Key Observations:

1. **ERGON & Workforce modules** (✅ GOOD):
   - Use `get_current_tenant()` helper consistently
   - Store tenant as `athens_tenant_id` (integer) in models
   - Clean separation of concerns

2. **Projects module** (❌ BAD):
   - Uses `user.company_id` directly
   - Assumes `company_id` == `tenant.id` (dangerous assumption)
   - No helper usage

3. **Authentication module** (⚠️ MIXED):
   - MasterAdmin views use `user.tenant` (correct)
   - Login/dashboard use `user.company_id` and `user.athens_tenant_id`
   - Inconsistent patterns

4. **Control Plane** (⚠️ MIXED):
   - Uses `company_id` in query params (external API)
   - Creates SecurityLog with `athens_tenant_id`
   - Mixed field usage

---

## TASK 2: CANONICAL TENANT FIELD DECISION

### Recommendation: **user.tenant (FK to control_plane.Tenant)**

### Evidence-Based Rationale:

1. **MasterAdmin consistency** (15+ usages):
   - All MasterAdmin views use `user.tenant` FK
   - Clean FK relationship with Tenant model
   - No integer ID assumptions

2. **Type safety**:
   - FK provides Django ORM benefits (select_related, prefetch_related)
   - Prevents invalid tenant IDs
   - Cascade delete protection

3. **Already marked canonical**:
   - `athens_tenant_id` marked "DEPRECATED" in User model (line 109)
   - `tenant` FK has help_text "Tenant for MasterAdmin scoping"

4. **Existing helper pattern**:
   - `system/utils.py::get_current_tenant()` returns Tenant object
   - ERGON/Workforce already use this pattern

### Migration Path:

**Phase 1:** Standardize helper (this patch)
**Phase 2:** Migrate Projects module (next patch)
**Phase 3:** Migrate authentication/control_plane (next patch)
**Phase 4:** Deprecate old fields (future)

---

## TASK 3: IMPLEMENT SINGLE HELPER

### File: `backend/authentication/tenant_utils.py` (NEW)

**Why new file?**
- `system/utils.py` already exists but incomplete
- `authentication` app is more appropriate (tenant is auth concern)
- Avoids circular imports (system → authentication)

### Helper Signature:

```python
def get_tenant_for_user(user) -> Tuple[Optional[Tenant], Optional[str]]:
    """
    Extract tenant from authenticated user (CANONICAL METHOD).
    
    Args:
        user: Authenticated User object
    
    Returns:
        tuple: (Tenant object or None, error_message or None)
        
    Examples:
        tenant, error = get_tenant_for_user(request.user)
        if error:
            return Response({'error': error}, status=400)
        # Use tenant.id for filtering
    
    User Type Behavior:
        - superadmin: Returns (None, None) - global access
        - masteradmin: Returns (user.tenant, None) - FK lookup
        - companyuser: Returns (Tenant via company_id, None) - legacy mapping
        - serviceuser: Returns (None, "Not supported") - session-based
    """
```

### Implementation:

```python
# backend/authentication/tenant_utils.py
from typing import Optional, Tuple
from django.contrib.auth import get_user_model

User = get_user_model()

def get_tenant_for_user(user) -> Tuple[Optional['Tenant'], Optional[str]]:
    """
    Extract tenant from authenticated user (CANONICAL METHOD).
    
    Returns:
        tuple: (Tenant object or None, error_message or None)
    """
    from control_plane.models import Tenant
    
    # SuperAdmin: Global access (no tenant scoping)
    if user.user_type == 'superadmin':
        return None, None
    
    # MasterAdmin: Use tenant FK (canonical)
    if user.user_type == 'masteradmin':
        if not user.tenant:
            return None, "MasterAdmin not associated with tenant"
        return user.tenant, None
    
    # CompanyUser: Map company_id to Tenant (legacy support)
    if user.user_type == 'companyuser':
        if not user.company_id:
            return None, "CompanyUser not associated with company"
        
        try:
            tenant = Tenant.objects.get(id=user.company_id)
            return tenant, None
        except Tenant.DoesNotExist:
            return None, f"Tenant not found for company_id={user.company_id}"
    
    # ServiceUser: Not supported (session-based auth)
    if user.user_type == 'serviceuser':
        return None, "ServiceUser does not have tenant scoping"
    
    return None, f"Unknown user_type: {user.user_type}"


def get_tenant_id_for_filtering(user) -> Optional[int]:
    """
    Get tenant ID for database filtering (convenience method).
    
    Returns:
        int: Tenant ID for filtering, or None for global access
    
    Usage:
        tenant_id = get_tenant_id_for_filtering(request.user)
        if tenant_id:
            queryset = queryset.filter(athens_tenant_id=tenant_id)
    """
    tenant, error = get_tenant_for_user(user)
    if error or not tenant:
        return None
    return tenant.id


def require_tenant(user) -> Tuple['Tenant', Optional[dict]]:
    """
    Require tenant for user (raises error if not found).
    
    Returns:
        tuple: (Tenant object, error_response_dict or None)
    
    Usage:
        tenant, error_response = require_tenant(request.user)
        if error_response:
            return Response(error_response, status=400)
    """
    tenant, error = get_tenant_for_user(user)
    if error:
        return None, {'error': error}
    if not tenant:
        return None, {'error': 'Tenant required for this operation'}
    return tenant, None
```

---

## TASK 4: REFACTOR TENANT FILTERING (PHASE 1 - LOW RISK)

### Target: **Projects Module** (Lowest Risk, Clear Boundaries)

**Why Projects first?**
- Self-contained module (no dependencies on other modules)
- Clear tenant scoping (all projects belong to tenant)
- Only 1 file to change (projects/views.py)
- Easy to test (create/list/filter projects)

### Files to Change:

#### 1. `backend/projects/views.py` (REFACTOR)

**Current pattern:**
```python
# Line 24
queryset = queryset.filter(company_id=user.company_id)

# Line 28
company_id=user.company_id,

# Line 56-58
company_id=user.company_id,
```

**New pattern:**
```python
from authentication.tenant_utils import get_tenant_id_for_filtering, require_tenant

# In get_queryset():
tenant_id = get_tenant_id_for_filtering(self.request.user)
if tenant_id:
    queryset = queryset.filter(company_id=tenant_id)

# In perform_create():
tenant, error_response = require_tenant(self.request.user)
if error_response:
    raise ValidationError(error_response)
serializer.save(company_id=tenant.id, ...)
```

#### 2. `backend/projects/permissions.py` (REFACTOR)

**Current pattern:**
```python
# Line 39
return obj.company_id == user.company_id
```

**New pattern:**
```python
from authentication.tenant_utils import get_tenant_id_for_filtering

tenant_id = get_tenant_id_for_filtering(user)
if not tenant_id:
    return False  # No tenant = no access
return obj.company_id == tenant_id
```

---

## TASK 5: ADD TESTS

### File: `backend/authentication/tests/test_tenant_utils.py` (NEW)

```python
import pytest
from django.contrib.auth import get_user_model
from control_plane.models import Tenant
from authentication.tenant_utils import get_tenant_for_user, get_tenant_id_for_filtering

User = get_user_model()

@pytest.mark.django_db
class TestTenantUtils:
    
    def test_superadmin_no_tenant(self):
        """SuperAdmin should return None tenant (global access)"""
        user = User.objects.create(email='super@test.com', user_type='superadmin')
        tenant, error = get_tenant_for_user(user)
        assert tenant is None
        assert error is None
    
    def test_masteradmin_with_tenant(self):
        """MasterAdmin with tenant FK should return tenant"""
        tenant = Tenant.objects.create(name='Test Tenant', code='test')
        user = User.objects.create(
            email='master@test.com',
            user_type='masteradmin',
            tenant=tenant
        )
        result_tenant, error = get_tenant_for_user(user)
        assert result_tenant == tenant
        assert error is None
    
    def test_masteradmin_without_tenant(self):
        """MasterAdmin without tenant should return error"""
        user = User.objects.create(email='master@test.com', user_type='masteradmin')
        tenant, error = get_tenant_for_user(user)
        assert tenant is None
        assert error == "MasterAdmin not associated with tenant"
    
    def test_companyuser_with_valid_company_id(self):
        """CompanyUser with valid company_id should return tenant"""
        tenant = Tenant.objects.create(name='Company Tenant', code='company')
        user = User.objects.create(
            email='company@test.com',
            user_type='companyuser',
            company_id=tenant.id
        )
        result_tenant, error = get_tenant_for_user(user)
        assert result_tenant == tenant
        assert error is None
    
    def test_companyuser_with_invalid_company_id(self):
        """CompanyUser with invalid company_id should return error"""
        user = User.objects.create(
            email='company@test.com',
            user_type='companyuser',
            company_id=99999
        )
        tenant, error = get_tenant_for_user(user)
        assert tenant is None
        assert "Tenant not found" in error
    
    def test_companyuser_without_company_id(self):
        """CompanyUser without company_id should return error"""
        user = User.objects.create(email='company@test.com', user_type='companyuser')
        tenant, error = get_tenant_for_user(user)
        assert tenant is None
        assert error == "CompanyUser not associated with company"
    
    def test_get_tenant_id_for_filtering(self):
        """get_tenant_id_for_filtering should return tenant ID"""
        tenant = Tenant.objects.create(name='Filter Tenant', code='filter')
        user = User.objects.create(
            email='master@test.com',
            user_type='masteradmin',
            tenant=tenant
        )
        tenant_id = get_tenant_id_for_filtering(user)
        assert tenant_id == tenant.id
    
    def test_get_tenant_id_for_filtering_superadmin(self):
        """SuperAdmin should return None for filtering (no scoping)"""
        user = User.objects.create(email='super@test.com', user_type='superadmin')
        tenant_id = get_tenant_id_for_filtering(user)
        assert tenant_id is None
```

### File: `backend/projects/tests/test_tenant_scoping.py` (NEW)

```python
import pytest
from django.contrib.auth import get_user_model
from control_plane.models import Tenant
from projects.models import Project
from rest_framework.test import APIClient

User = get_user_model()

@pytest.mark.django_db
class TestProjectTenantScoping:
    
    def setup_method(self):
        self.client = APIClient()
        self.tenant1 = Tenant.objects.create(name='Tenant 1', code='tenant1')
        self.tenant2 = Tenant.objects.create(name='Tenant 2', code='tenant2')
    
    def test_masteradmin_sees_only_own_tenant_projects(self):
        """MasterAdmin should only see projects from their tenant"""
        user = User.objects.create(
            email='master1@test.com',
            user_type='masteradmin',
            tenant=self.tenant1
        )
        self.client.force_authenticate(user=user)
        
        # Create projects for both tenants
        Project.objects.create(
            projectName='Project 1',
            projectCategory='construction',
            location='Location 1',
            company_id=self.tenant1.id
        )
        Project.objects.create(
            projectName='Project 2',
            projectCategory='construction',
            location='Location 2',
            company_id=self.tenant2.id
        )
        
        response = self.client.get('/api/projects/')
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['projectName'] == 'Project 1'
    
    def test_masteradmin_cannot_create_project_for_other_tenant(self):
        """MasterAdmin should only create projects for their tenant"""
        user = User.objects.create(
            email='master1@test.com',
            user_type='masteradmin',
            tenant=self.tenant1
        )
        self.client.force_authenticate(user=user)
        
        response = self.client.post('/api/projects/', {
            'projectName': 'New Project',
            'projectCategory': 'construction',
            'location': 'Location',
            'company_id': self.tenant2.id  # Try to create for other tenant
        })
        
        # Should create for user's tenant, not requested tenant
        assert response.status_code == 201
        project = Project.objects.get(id=response.data['id'])
        assert project.company_id == self.tenant1.id  # Forced to user's tenant
    
    def test_superadmin_sees_all_projects(self):
        """SuperAdmin should see projects from all tenants"""
        user = User.objects.create(email='super@test.com', user_type='superadmin')
        self.client.force_authenticate(user=user)
        
        Project.objects.create(
            projectName='Project 1',
            projectCategory='construction',
            location='Location 1',
            company_id=self.tenant1.id
        )
        Project.objects.create(
            projectName='Project 2',
            projectCategory='construction',
            location='Location 2',
            company_id=self.tenant2.id
        )
        
        response = self.client.get('/api/projects/')
        assert response.status_code == 200
        assert len(response.data) == 2
```

### Test Commands:

```bash
# Run tenant utils tests
cd backend
source .venv/bin/activate
pytest authentication/tests/test_tenant_utils.py -v

# Run projects tenant scoping tests
pytest projects/tests/test_tenant_scoping.py -v

# Run all tests
pytest -v
```

---

## TASK 6: DEPRECATION PLAN (NO REMOVALS YET)

### 1. Mark `athens_tenant_id` as deprecated in User model

**File:** `backend/authentication/models.py` (line 109)

**Current:**
```python
athens_tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="DEPRECATED: Legacy tenant ID. Use tenant FK.")
```

**Add logging warning:**
```python
# In User model, add method:
def save(self, *args, **kwargs):
    if self.athens_tenant_id and not self._state.adding:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(
            f"DEPRECATED: User {self.email} still using athens_tenant_id field. "
            f"Migrate to tenant FK. athens_tenant_id={self.athens_tenant_id}"
        )
    super().save(*args, **kwargs)
```

### 2. Add migration guide comment

**File:** `backend/authentication/models.py` (line 108-120)

```python
# TENANT IDENTIFICATION MIGRATION GUIDE:
# 
# DEPRECATED FIELDS (DO NOT USE):
#   - company_id (int) - Legacy field, will be removed in v3.0
#   - athens_tenant_id (UUID) - Legacy field, will be removed in v3.0
#
# CANONICAL FIELD (USE THIS):
#   - tenant (FK to control_plane.Tenant) - Use for all new code
#
# HELPER FUNCTION:
#   from authentication.tenant_utils import get_tenant_for_user
#   tenant, error = get_tenant_for_user(request.user)
#
# See: docs/adr/0001-tenant-identity.md
```

### 3. Create ADR document

**File:** `backend/docs/adr/0001-tenant-identity.md` (NEW)

```markdown
# ADR 0001: Tenant Identity Standardization

**Status:** Accepted  
**Date:** 2025-02-20  
**Deciders:** Architecture Team

## Context

Athens 2.0 has 3 different tenant identifiers in the User model:
- `company_id` (integer) - Legacy field
- `athens_tenant_id` (UUID) - Legacy field
- `tenant` (FK to Tenant) - New field

This causes:
- Data inconsistency
- Security risks (wrong tenant access)
- Developer confusion
- Difficult maintenance

## Decision

**Canonical tenant field:** `user.tenant` (FK to control_plane.Tenant)

**Helper function:** `authentication.tenant_utils.get_tenant_for_user(user)`

**Migration path:**
1. Phase 1: Implement helper (DONE)
2. Phase 2: Migrate Projects module (DONE)
3. Phase 3: Migrate authentication/control_plane (TODO)
4. Phase 4: Deprecate old fields (TODO)
5. Phase 5: Remove old fields (v3.0)

## Consequences

**Positive:**
- Single source of truth
- Type-safe FK relationship
- Consistent pattern across codebase
- Easier to audit tenant access

**Negative:**
- Requires code changes across modules
- Temporary dual-field support during migration
- API response changes (athens_tenant_id → tenant_id)

## Compliance

All new code MUST use:
```python
from authentication.tenant_utils import get_tenant_for_user
tenant, error = get_tenant_for_user(request.user)
```

DO NOT use:
- `user.company_id`
- `user.athens_tenant_id`
```

---

## DELIVERABLE: STEP-BY-STEP PATCH PLAN

### Patch 1: Implement Helper (SAFE - NO BEHAVIOR CHANGE)

**Files to create:**
1. `backend/authentication/tenant_utils.py` - Helper functions
2. `backend/authentication/tests/test_tenant_utils.py` - Unit tests
3. `backend/docs/adr/0001-tenant-identity.md` - Architecture decision

**Commands:**
```bash
cd backend
# Create files (see implementations above)
# Run tests
pytest authentication/tests/test_tenant_utils.py -v
# Expected: 8 tests pass
```

**Risk:** 🟢 ZERO - No existing code changed

---

### Patch 2: Refactor Projects Module (LOW RISK)

**Files to change:**
1. `backend/projects/views.py` - Use helper in all views
2. `backend/projects/permissions.py` - Use helper in permission check
3. `backend/projects/tests/test_tenant_scoping.py` - Add tenant scoping tests

**Changes:**
```python
# projects/views.py - Line 24
# OLD:
queryset = queryset.filter(company_id=user.company_id)

# NEW:
from authentication.tenant_utils import get_tenant_id_for_filtering
tenant_id = get_tenant_id_for_filtering(user)
if tenant_id:
    queryset = queryset.filter(company_id=tenant_id)
```

**Commands:**
```bash
cd backend
# Apply changes
# Run tests
pytest projects/tests/test_tenant_scoping.py -v
pytest projects/tests/ -v
# Expected: All tests pass
```

**Risk:** 🟡 LOW - Projects module isolated, easy to rollback

---

### Patch 3: Add Deprecation Warnings (SAFE - LOGGING ONLY)

**Files to change:**
1. `backend/authentication/models.py` - Add save() method with warning
2. `backend/authentication/models.py` - Add migration guide comment

**Commands:**
```bash
cd backend
# Apply changes
# Run server and check logs
python manage.py runserver
# Watch for deprecation warnings in logs
```

**Risk:** 🟢 ZERO - Only adds logging

---

## STOP HERE

**Next steps (NOT in this patch):**
- Patch 4: Migrate authentication module
- Patch 5: Migrate control_plane module
- Patch 6: Update API responses (breaking change)
- Patch 7: Database migration (remove old fields)

**Estimated timeline:**
- Patch 1: 1 hour (helper + tests)
- Patch 2: 2 hours (projects refactor + tests)
- Patch 3: 30 minutes (deprecation warnings)
- **Total: 3.5 hours for Phase 1**

---

## VALIDATION CHECKLIST

Before deploying to production:

- [ ] All tests pass (pytest -v)
- [ ] No new deprecation warnings in logs
- [ ] MasterAdmin can create/list projects
- [ ] CompanyUser can create/list projects
- [ ] SuperAdmin can see all projects
- [ ] Tenant isolation verified (user A cannot see user B's projects)
- [ ] API responses unchanged (backward compatible)
- [ ] No performance regression (query count same)

---

**END OF PATCH PLAN**
