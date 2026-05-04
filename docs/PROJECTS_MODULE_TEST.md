# Projects Module - Smoke Test Checklist

## Test Environment
- Backend: http://localhost:8004
- Frontend: http://localhost:5173
- Test User: master@companya.com / test123

## Backend Tests

### Run Automated Tests
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
pytest projects/tests.py -v
```

**Expected:** 5 tests passing
- ✅ MasterAdmin can create project in own company
- ✅ MasterAdmin cannot create project in other company
- ✅ CompanyUser can only see member projects
- ✅ Superadmin can list all projects
- ✅ Add member creates audit log

## Frontend Manual Tests

### 1. Create Project
1. Login as MasterAdmin (master@companya.com)
2. Navigate to Projects page
3. Click "Create Project"
4. Fill form:
   - Name: "Test Project Alpha"
   - Code: (leave empty for auto-generation)
   - Status: Active
   - Start Date: Today
5. Submit
6. **Expected:** Project appears in list with auto-generated code

### 2. Edit Project
1. Find "Test Project Alpha" in list
2. Click Edit icon
3. Change name to "Test Project Alpha Updated"
4. Change status to "Inactive"
5. Submit
6. **Expected:** Project updated, status badge shows "inactive"

### 3. Add Member
1. Click Users icon on "Test Project Alpha Updated"
2. Click "Add Member"
3. Select a user from dropdown
4. Select role: "Member"
5. Click "Add"
6. **Expected:** User appears in members table

### 4. Remove Member
1. In members modal, find the added user
2. Click "Remove"
3. Confirm
4. **Expected:** Member removed (is_active=false)

### 5. Status Changes
1. Find inactive project
2. Click Power icon to activate
3. **Expected:** Status changes to "active"
4. Click Archive icon
5. **Expected:** Status changes to "archived"

### 6. Search & Filter
1. Type project name in search box
2. **Expected:** List filters in real-time
3. Select "Active" from status dropdown
4. **Expected:** Only active projects shown

### 7. Company User Visibility
1. Logout
2. Login as CompanyUser (user@companya.com)
3. Navigate to Projects (if accessible)
4. **Expected:** Only sees projects where they are a member

### 8. Audit Logs (Superadmin)
1. Login as Superadmin
2. Navigate to Audit Logs
3. Filter by event_type: "project_created"
4. **Expected:** See project creation events with metadata

## API Endpoint Tests

### List Projects
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8004/api/projects/projects/
```

### Create Project
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Project","status":"active"}' \
  http://localhost:8004/api/projects/projects/
```

### Add Member
```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":2,"role":"member"}' \
  http://localhost:8004/api/projects/projects/1/members/
```

### List Users
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8004/api/auth/users/?company=me
```

## Security Tests

### 1. Cross-Tenant Isolation
- MasterAdmin from Company A cannot see Company B projects
- **Test:** Login as different company MasterAdmins, verify project lists are isolated

### 2. Permission Enforcement
- CompanyUser cannot create projects (403)
- ServiceUser cannot access projects (403)
- **Test:** Try creating project as CompanyUser, expect error

### 3. Member-Only Access
- CompanyUser can only see projects they are members of
- **Test:** Create project, don't add CompanyUser, verify they can't see it

## Database Verification

```sql
-- Check projects table
SELECT * FROM projects;

-- Check memberships
SELECT * FROM project_memberships;

-- Check audit logs
SELECT * FROM security_logs WHERE event_type LIKE 'project%';
```

## Success Criteria

- ✅ All 5 backend tests pass
- ✅ Projects CRUD works in UI
- ✅ Member management works
- ✅ Status changes work
- ✅ Search/filter works
- ✅ Company scoping enforced
- ✅ Audit logs created
- ✅ No console errors
- ✅ UI follows SAP-Python design rules

## Known Limitations

- No bulk operations yet
- No project archival date tracking
- No project templates
- No project duplication

## Next Steps

After projects module is verified:
1. Implement PTW (Permit to Work) module
2. Add project-level permissions
3. Add project analytics/reporting
4. Implement project templates

---

**Last Updated:** February 6, 2025  
**Module Version:** projects-v1.0
