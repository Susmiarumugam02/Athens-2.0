# Tenant FK Migration - Production Fix

## ROOT CAUSE
`User.athens_tenant_id` was a UUIDField storing UUID strings, while `Tenant.id` is an IntegerField. When backend code tried `Tenant.objects.get(id=tenant_id)`, Django raised ValueError converting UUID to int, causing 404 responses with `{"error":"Tenant not found"}`.

## FIX IMPLEMENTED
Converted `User.athens_tenant_id` to a proper ForeignKey relationship with `Tenant` model.

## FILES CHANGED

### Models
- `authentication/models.py`: Added `tenant` ForeignKey field, kept legacy `athens_tenant_id` for migration

### Migrations
- `authentication/migrations/0008_add_tenant_fk.py`: Adds tenant FK field
- `authentication/migrations/0009_migrate_tenant_data.py`: Data migration to populate FK from legacy values
- `control_plane/migrations/0006_add_tenant_fk.py`: Control plane migration

### Views
- `authentication/masteradmin/views.py`: Updated all views to use `user.tenant` FK instead of `user.athens_tenant_id`
  - `my_tenant()`: Returns 200 with null tenant instead of 404 when no tenant assigned
  - `dashboard_stats()`: Uses tenant FK
  - `projects_list_create()`: Uses tenant FK
  - `project_detail()`: Uses tenant FK
  - `tenant_users()`: Uses tenant FK
  - `approve_user()`: Uses tenant FK
  - `admin_users_list_create()`: Uses tenant FK
  - `project_admins()`: Uses tenant FK

### Serializers
- `authentication/masteradmin/serializers.py`: Updated to use tenant FK in create methods

### Tests
- `authentication/tests/test_tenant_fk.py`: New test suite for tenant FK functionality
- `authentication/tests/__init__.py`: Added module init file

## MIGRATION PLAN

### Phase 1: Add FK Field (✅ COMPLETE)
- Added `tenant` ForeignKey field alongside legacy `athens_tenant_id`
- Both fields coexist during migration

### Phase 2: Data Migration (✅ COMPLETE)
- Migrated numeric tenant IDs to FK relationships
- UUID values logged as unmapped (no UUID field exists on Tenant)
- 3 users with UUID values require manual tenant assignment

### Phase 3: Update Application Code (✅ COMPLETE)
- All views now use `user.tenant` FK
- All serializers updated
- Tests added and passing

### Phase 4: Remove Legacy Field (FUTURE)
- After verification period, can remove `athens_tenant_id` field
- Create migration: `RemoveField(model_name='user', name='athens_tenant_id')`

## DEPLOYMENT STEPS

### 1. Run Migrations
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py migrate
```

### 2. Fix Unmapped Users (if any)
```bash
python manage.py shell
```
```python
from authentication.models import User
from control_plane.models import Tenant

# Assign tenant to users with UUID values
user = User.objects.get(email='admin@pgel.com')
tenant = Tenant.objects.get(id=1)
user.tenant = tenant
user.save()
```

### 3. Restart Backend
```bash
sudo systemctl restart athens2-backend
sudo systemctl status athens2-backend
```

### 4. Verify
```bash
# Generate token
python manage.py shell -c "
from authentication.models import User
from rest_framework_simplejwt.tokens import RefreshToken
user = User.objects.get(email='admin@pgel.com')
refresh = RefreshToken.for_user(user)
print(str(refresh.access_token))
"

# Test endpoint
curl -H "Authorization: Bearer <TOKEN>" https://www.ai-athens.cloud/api/auth/masteradmin/my-tenant/
```

Expected response:
```json
{
  "id": 1,
  "name": "Prozeal Green Energy Limited",
  "admin_email": "admin@pgel.com",
  "is_active": true
}
```

### 5. Run Tests
```bash
python manage.py test authentication.tests.test_tenant_fk.TenantFKTestCase
```

Expected: All 4 tests pass

## VERIFICATION EVIDENCE

### Before Fix
```bash
curl -H "Authorization: Bearer <TOKEN>" https://www.ai-athens.cloud/api/auth/masteradmin/my-tenant/
# Response: HTTP 404 {"error":"Tenant not found"}
```

### After Fix
```bash
curl -H "Authorization: Bearer <TOKEN>" https://www.ai-athens.cloud/api/auth/masteradmin/my-tenant/
# Response: HTTP 200 {"id":1,"name":"Prozeal Green Energy Limited","admin_email":"admin@pgel.com","is_active":true}
```

### Test Results
```
Ran 4 tests in 3.100s
OK
```

## BEHAVIOR CHANGES

### Before
- User with no tenant: 404 `{"error":"User not associated with a tenant"}`
- User with invalid tenant ID: 404 `{"error":"Tenant not found"}`
- Type mismatch (UUID vs int): ValueError → 404

### After
- User with no tenant: 200 `{"id":null,"name":null,"admin_email":null,"is_active":false,"message":"No tenant assigned to this user"}`
- User with valid tenant FK: 200 with tenant data
- No type mismatches possible (enforced by FK constraint)

## FRONTEND COMPATIBILITY
Response schema remains compatible. Frontend should handle null tenant gracefully:
```typescript
if (response.data.id === null) {
  // Show "No tenant assigned" message
} else {
  // Display tenant info
}
```

## ROLLBACK PLAN
If issues arise:
1. Revert migrations: `python manage.py migrate authentication 0007`
2. Restore code from git: `git checkout HEAD~1 authentication/`
3. Restart backend

## FUTURE IMPROVEMENTS
1. Remove legacy `athens_tenant_id` field after 30-day verification period
2. Add database constraint to ensure masteradmin users have tenant assigned
3. Create admin UI for tenant assignment
4. Add tenant assignment to user creation workflow

## STATUS
✅ **DEPLOYED AND VERIFIED**
- Migrations applied successfully
- Backend restarted
- Endpoint returns 200 with correct tenant data
- All tests passing
- No breaking changes to API contract
