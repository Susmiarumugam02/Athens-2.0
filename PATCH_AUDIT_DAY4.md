# Audit Logging Endpoint - Curl Tests

## Endpoint

`GET /api/system/audit-logs/`

## Test Cases

### 1. ❌ 401 Unauthenticated

```bash
curl -X GET http://localhost:8004/api/system/audit-logs/ \
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

### 2. ❌ 403 Missing Permission (CompanyUser without audit.read)

```bash
# Login as company user (no audit.read permission)
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"password123"}' \
  | jq -r '.access')

# Try to access audit logs
curl -X GET http://localhost:8004/api/system/audit-logs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "error": "PERMISSION_DENIED",
  "message": "Tenant context missing"
}
```
**Status**: 403

---

### 3. ✅ 200 Success - MasterAdmin (Tenant-Scoped)

```bash
# Login as masteradmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# Get audit logs (only for their tenant)
curl -X GET "http://localhost:8004/api/system/audit-logs/?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 123,
        "actor_id": 5,
        "action": "tenant.update",
        "entity_type": "Tenant",
        "entity_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "SUCCESS",
        "meta": {
          "status": "SUCCESS",
          "target_type": "Tenant",
          "target_id": "550e8400-e29b-41d4-a716-446655440000",
          "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
        },
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64)...",
        "created_at": "2025-02-22T10:30:00Z"
      }
    ],
    "count": 45,
    "page": 1,
    "page_size": 10,
    "total_pages": 5
  }
}
```
**Status**: 200

---

### 4. ✅ 200 Success - SuperAdmin (All Logs)

```bash
# Login as superadmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

# Get all audit logs (no tenant filter)
curl -X GET "http://localhost:8004/api/system/audit-logs/?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 456,
        "actor_id": 1,
        "action": "tenant.create",
        "entity_type": "Tenant",
        "entity_id": "abc123",
        "status": "SUCCESS",
        "meta": {...},
        "ip_address": "10.0.0.1",
        "user_agent": "curl/7.68.0",
        "created_at": "2025-02-22T11:00:00Z"
      }
    ],
    "count": 250,
    "page": 1,
    "page_size": 20,
    "total_pages": 13
  }
}
```
**Status**: 200

---

### 5. ✅ 200 Success - SuperAdmin (Filter by Tenant)

```bash
# Login as superadmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

# Get audit logs for specific tenant
TENANT_ID="550e8400-e29b-41d4-a716-446655440000"
curl -X GET "http://localhost:8004/api/system/audit-logs/?tenant_id=$TENANT_ID&page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 789,
        "actor_id": 5,
        "action": "project.create",
        "entity_type": "Project",
        "entity_id": "42",
        "status": "SUCCESS",
        "meta": {
          "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
          "project_name": "New Construction Project"
        },
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "created_at": "2025-02-22T09:15:00Z"
      }
    ],
    "count": 45,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```
**Status**: 200

---

## Creating Audit Logs (Demo)

### Manual Audit Log Creation

```bash
# In Django shell or view
from system.audit_utils import audit_log

# Log an action
audit_log(
    request,
    'project.create',
    target_type='Project',
    target_id=42,
    status='SUCCESS',
    meta={'project_name': 'New Project'}
)
```

### Using the Mixin

```python
from rest_framework import viewsets
from system.audit_utils import AuditLogMixin

class ProjectViewSet(AuditLogMixin, viewsets.ModelViewSet):
    audit_action_map = {
        'create': 'project.create',
        'update': 'project.update',
        'destroy': 'project.delete',
    }
    audit_target_type = 'Project'
    # ... rest of viewset
```

---

## Quick Test Script

Save as `test_audit.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8004"

echo "=== Test 1: Unauthenticated (401) ==="
curl -X GET $BASE_URL/api/system/audit-logs/ \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Test 2: MasterAdmin (200 - Tenant Scoped) ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

if [ "$TOKEN" != "null" ]; then
  curl -X GET "$BASE_URL/api/system/audit-logs/?page=1&page_size=5" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n\n"
else
  echo "Login failed - check credentials"
fi

echo "=== Test 3: SuperAdmin (200 - All Logs) ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

if [ "$TOKEN" != "null" ]; then
  curl -X GET "$BASE_URL/api/system/audit-logs/?page=1&page_size=5" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n\n"
else
  echo "Login failed - check credentials"
fi
```

Run with:
```bash
chmod +x test_audit.sh
./test_audit.sh
```

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number |
| page_size | int | 20 | Results per page |
| tenant_id | UUID | - | Filter by tenant (SuperAdmin only) |

---

## Notes

- Endpoint requires authentication (JWT token)
- Tenant-scoped by default (users see only their tenant's logs)
- SuperAdmin can see all logs or filter by tenant_id
- Logs are ordered by created_at (newest first)
- Pagination is automatic (max 100 per page)
- Protected by `RequireTenantPermission` (uses RBAC from Day 3)
- Uses `TenantResolver` from Day 2 for tenant context
