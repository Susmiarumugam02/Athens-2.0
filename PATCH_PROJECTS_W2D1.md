# Projects Core - Curl Tests (Wave 2 Day 1)

## Endpoints

- `GET /api/projects/` - List projects (tenant-scoped)
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/` - Get project details
- `PATCH /api/projects/{id}/` - Update project
- `DELETE /api/projects/{id}/` - Delete project

## Test Cases

### 1. ❌ 401 Unauthenticated

```bash
curl -X GET http://localhost:8004/api/projects/ \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "detail": "Authentication credentials were not provided."
}
```
**Status**: 401

---

### 2. ✅ 200 List Projects - MasterAdmin (Tenant-Scoped)

```bash
# Login as masteradmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# List projects (only their tenant's projects)
curl -X GET http://localhost:8004/api/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Construction Project Alpha",
      "code": "alpha",
      "status": "active",
      "company": 100,
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "created_by": 5,
      "created_at": "2025-02-01T10:00:00Z",
      "updated_at": "2025-02-01T10:00:00Z"
    }
  ]
}
```
**Status**: 200

---

### 3. ✅ 200 List Projects - SuperAdmin (All Tenants)

```bash
# Login as superadmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

# List all projects across all tenants
curl -X GET http://localhost:8004/api/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Project Alpha",
      "code": "alpha",
      "status": "active",
      "company": 100,
      "created_at": "2025-02-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Project Beta",
      "code": "beta",
      "status": "active",
      "company": 200,
      "created_at": "2025-02-02T10:00:00Z"
    }
  ]
}
```
**Status**: 200

---

### 4. ✅ 201 Create Project - MasterAdmin

```bash
# Login as masteradmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# Create new project
curl -X POST http://localhost:8004/api/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Construction Project",
    "code": "ncp-2025",
    "status": "active",
    "start_date": "2025-03-01",
    "end_date": "2025-12-31"
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "New Construction Project",
    "code": "ncp-2025",
    "status": "active",
    "company": 100,
    "start_date": "2025-03-01",
    "end_date": "2025-12-31",
    "created_by": 5,
    "created_at": "2025-02-22T15:30:00Z",
    "updated_at": "2025-02-22T15:30:00Z"
  }
}
```
**Status**: 201

**Audit Log Created**:
- Action: `project.create`
- Entity: `Project:42`
- Actor: User 5
- Viewable at: `/api/system/audit-logs/`

---

### 5. ❌ 403 Create Project - CompanyUser (No Permission)

```bash
# Login as company user
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"password123"}' \
  | jq -r '.access')

# Try to create project (should fail)
curl -X POST http://localhost:8004/api/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Project",
    "code": "unauth"
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "detail": "Only MasterAdmin can create projects"
}
```
**Status**: 403

---

### 6. ✅ 200 Get Project Details

```bash
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

curl -X GET http://localhost:8004/api/projects/1/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Project Alpha",
    "code": "alpha",
    "status": "active",
    "company": 100,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "created_by": 5,
    "created_at": "2025-02-01T10:00:00Z",
    "updated_at": "2025-02-01T10:00:00Z"
  }
}
```
**Status**: 200

---

### 7. ✅ 200 Update Project

```bash
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

curl -X PATCH http://localhost:8004/api/projects/1/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "end_date": "2025-11-30"
  }' \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Project Alpha",
    "code": "alpha",
    "status": "inactive",
    "end_date": "2025-11-30",
    "updated_at": "2025-02-22T15:45:00Z"
  }
}
```
**Status**: 200

**Audit Log Created**:
- Action: `project.update`
- Entity: `Project:1`

---

### 8. ✅ 200 List Projects with Filters

```bash
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# Filter by status
curl -X GET "http://localhost:8004/api/projects/?status=active" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

# Search by name
curl -X GET "http://localhost:8004/api/projects/?search=construction" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

---

### 9. ✅ 200 Activate/Deactivate Project

```bash
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# Activate
curl -X POST http://localhost:8004/api/projects/1/activate/ \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

# Deactivate
curl -X POST http://localhost:8004/api/projects/1/deactivate/ \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"

# Archive
curl -X POST http://localhost:8004/api/projects/1/archive/ \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nHTTP Status: %{http_code}\n"
```

---

### 10. ✅ Verify Audit Logs

```bash
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# View audit logs for project actions
curl -X GET "http://localhost:8004/api/system/audit-logs/?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.results[] | select(.action | startswith("project."))'
```

**Expected Output**:
```json
{
  "id": 456,
  "action": "project.create",
  "entity_type": "Project",
  "entity_id": "42",
  "actor_id": 5,
  "status": "SUCCESS",
  "created_at": "2025-02-22T15:30:00Z"
}
```

---

## Quick Test Script

Save as `test_projects.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8004"

echo "=== Test 1: Unauthenticated (401) ==="
curl -X GET $BASE_URL/api/projects/ \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Test 2: List Projects - MasterAdmin (200) ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

if [ "$TOKEN" != "null" ]; then
  curl -X GET $BASE_URL/api/projects/ \
    -H "Authorization: Bearer $TOKEN" \
    -w "\nHTTP Status: %{http_code}\n\n"
else
  echo "Login failed"
fi

echo "=== Test 3: Create Project (201) ==="
curl -X POST $BASE_URL/api/projects/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","code":"test-proj","status":"active"}' \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Test 4: Verify Audit Log ==="
curl -X GET "$BASE_URL/api/system/audit-logs/?page=1&page_size=5" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data.results[] | select(.action == "project.create")'
```

Run with:
```bash
chmod +x test_projects.sh
./test_projects.sh
```

---

## Notes

- All endpoints are tenant-scoped (users see only their tenant's data)
- SuperAdmin bypasses tenant scoping
- All CUD operations create audit logs
- Audit logs viewable at `/api/system/audit-logs/`
- Uses Wave 1 foundation: TenantResolver + RBAC + Audit
