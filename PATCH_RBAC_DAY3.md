# RBAC Permissions Endpoint - Curl Tests

## Endpoint

`GET /api/auth/me/permissions/`

## Test Cases

### 1. ❌ 401 Unauthenticated

```bash
curl -X GET http://localhost:8004/api/auth/me/permissions/ \
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

### 2. ✅ 200 Success - SuperAdmin

```bash
# First login as superadmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

# Then get permissions
curl -X GET http://localhost:8004/api/auth/me/permissions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "tenant_id": null,
  "user_type": "superadmin",
  "admin_type": null,
  "roles": ["SUPERADMIN"],
  "permissions": ["*"]
}
```
**Status**: 200

---

### 3. ✅ 200 Success - MasterAdmin

```bash
# Login as masteradmin
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

# Get permissions
curl -X GET http://localhost:8004/api/auth/me/permissions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_type": "masteradmin",
  "admin_type": "client",
  "roles": ["MASTER_ADMIN"],
  "permissions": [
    "tenant.read",
    "tenant.write",
    "user.read",
    "user.write",
    "project.read",
    "project.write",
    "service.read",
    "service.write"
  ]
}
```
**Status**: 200

---

### 4. ✅ 200 Success - CompanyUser (Limited Permissions)

```bash
# Login as company user
TOKEN=$(curl -X POST http://localhost:8004/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"password123"}' \
  | jq -r '.access')

# Get permissions
curl -X GET http://localhost:8004/api/auth/me/permissions/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response**:
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_type": "companyuser",
  "admin_type": null,
  "roles": ["COMPANY_USER"],
  "permissions": ["project.read"]
}
```
**Status**: 200

---

### 5. ❌ 403 Missing Tenant Context (Edge Case)

This would only happen if:
- User is not SuperAdmin
- User has no tenant assigned
- TenantResolver cannot extract tenant from JWT

```bash
# This is handled gracefully by returning empty tenant_id
# The endpoint uses RequireTenantContext which allows the request
# but may return null tenant_id for users without tenant assignment
```

---

## Quick Test Script

Save as `test_rbac.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8004"

echo "=== Test 1: Unauthenticated (401) ==="
curl -X GET $BASE_URL/api/auth/me/permissions/ \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n\n"

echo "=== Test 2: SuperAdmin (200) ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"super@athens.com","password":"admin123"}' \
  | jq -r '.access')

if [ "$TOKEN" != "null" ]; then
  curl -X GET $BASE_URL/api/auth/me/permissions/ \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n\n"
else
  echo "Login failed - check credentials"
fi

echo "=== Test 3: MasterAdmin (200) ==="
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"master@company.com","password":"password123"}' \
  | jq -r '.access')

if [ "$TOKEN" != "null" ]; then
  curl -X GET $BASE_URL/api/auth/me/permissions/ \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nHTTP Status: %{http_code}\n\n"
else
  echo "Login failed - check credentials"
fi
```

Run with:
```bash
chmod +x test_rbac.sh
./test_rbac.sh
```

---

## Notes

- Endpoint requires authentication (JWT token in Authorization header)
- SuperAdmin bypasses tenant checks and gets wildcard permissions
- All other users get tenant-scoped permissions based on user_type
- Tenant context is automatically attached by RequireTenantContext permission class
- Permission list is simplified (can be expanded with granular Role/Permission tables later)
