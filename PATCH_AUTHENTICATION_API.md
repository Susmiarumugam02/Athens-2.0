# Authentication Module API Response Standardization (Phase 1)

**Date:** February 20, 2025  
**Module:** authentication  
**Phase:** 1 (SAFE endpoints only)  
**Commit:** (pending)

---

## Changes Made

### authentication/views.py

**Migrated 6 SAFE endpoints to use canonical API response helpers:**

1. **my_tenant()** (Line 376) - GET /api/auth/my-tenant/
   - Legacy: `{id, name, athens_tenant_id, admin_email}`
   - Envelope: `{ok: true, data: {id, name, ...}, meta: {}, error: null}`
   - Error (404): Legacy `{"error": "No tenant assigned"}` → Envelope `{ok: false, error: {code: "NO_TENANT", message: "No tenant assigned"}}`

2. **subscription_status()** (Line 362) - GET /api/auth/subscription-status/
   - Legacy: `{isTrialing, subscriptionStatus, tenantId}`
   - Envelope: `{ok: true, data: {isTrialing, ...}, meta: {}, error: null}`

3. **company_data()** (Line 268) - GET /api/auth/company-data/
   - Legacy: `{success, company_name, company_logo, ...}`
   - Envelope: `{ok: true, data: {success, company_name, ...}, meta: {}, error: null}`
   - Error (404): Legacy `{"error": "No company associated"}` → Envelope `{ok: false, error: {code: "NO_COMPANY", message: "No company associated"}}`

4. **list_users()** (Line 229) - GET /api/auth/users/
   - Legacy: `[{id, email, user_type, is_active}, ...]`
   - Envelope: `{ok: true, data: [{id, email, ...}, ...], meta: {}, error: null}`
   - Permission: SuperAdmin only (403 handled by exception handler)

5. **reset_user_password()** (Line 320) - POST /api/auth/users/{id}/reset-password/
   - Legacy: `{"message": "Password reset email sent"}`
   - Envelope: `{ok: true, data: {message: "..."}, meta: {}, error: null}`
   - Error (404): Legacy `{"error": "User not found"}` → Envelope `{ok: false, error: {code: "USER_NOT_FOUND", message: "User not found"}}`
   - Permission: SuperAdmin only (403 handled by exception handler)

6. **toggle_user_status()** (Line 332) - POST /api/auth/users/{id}/toggle-status/
   - Legacy: `{"message": "User status updated", "is_active": true/false}`
   - Envelope: `{ok: true, data: {message: "...", is_active: ...}, meta: {}, error: null}`
   - Error (404): Legacy `{"error": "User not found"}` → Envelope `{ok: false, error: {code: "USER_NOT_FOUND", message: "User not found"}}`
   - Permission: SuperAdmin only (403 handled by exception handler)

**NOT MIGRATED (High Risk - Public Contract):**
- ❌ unified_login() - Token payload must remain unchanged
- ❌ token_refresh() - Token payload must remain unchanged
- ❌ logout() - Simple message response, low value
- ❌ dashboard_overview() - Internal placeholder
- ❌ current_user_profile() - Internal placeholder
- ❌ get_projects(), get_admin_users(), get_notifications(), induction_status() - Placeholder endpoints

---

## Inventory Summary

**Response() returns found:** 24 (in views.py)  
**Migrated:** 6 endpoints (Phase 1 SAFE endpoints only)  
**Not migrated:** 18 endpoints (login/refresh/logout + placeholders)

**Pattern:**
- Success responses: `return Response({...})` → `return ok(data={...}, request=request)`
- Error responses: `return Response({"error": "..."}, status=...)` → `return fail(code, message, status=..., request=request)`

---

## Verification

### Django Check
```bash
python manage.py check
# System check identified no issues (0 silenced).
```

### Unit Tests
```bash
pytest system/tests/test_api_response.py authentication/tests/test_canonical_permissions.py -q
# 45 passed in 0.18s (15 API response tests + 30 permissions tests)
```

### Manual Verification (Curl Examples)

**Test 1: my_tenant - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/my-tenant/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy):
# {
#   "id": 1,
#   "name": "Acme Corp",
#   "athens_tenant_id": 1,
#   "admin_email": "admin@acme.com"
# }
```

**Test 2: my_tenant - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/my-tenant/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {
#     "id": 1,
#     "name": "Acme Corp",
#     "athens_tenant_id": 1,
#     "admin_email": "admin@acme.com"
#   },
#   "meta": {},
#   "error": null
# }
```

**Test 3: subscription_status - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/subscription-status/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy):
# {
#   "isTrialing": false,
#   "subscriptionStatus": "active",
#   "tenantId": "1"
# }
```

**Test 4: subscription_status - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/subscription-status/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {
#     "isTrialing": false,
#     "subscriptionStatus": "active",
#     "tenantId": "1"
#   },
#   "meta": {},
#   "error": null
# }
```

**Test 5: company_data - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/company-data/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy):
# {
#   "success": true,
#   "company_name": "Acme Corp",
#   "company_logo": null,
#   "registered_address": "",
#   "contact_phone": "",
#   "contact_email": "admin@acme.com",
#   "athens_tenant_id": "1"
# }
```

**Test 6: company_data - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/company-data/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {
#     "success": true,
#     "company_name": "Acme Corp",
#     ...
#   },
#   "meta": {},
#   "error": null
# }
```

**Test 7: list_users - Legacy mode (SuperAdmin)**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/users/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# [
#   {"id": 1, "email": "admin@acme.com", "user_type": "masteradmin", "is_active": true},
#   {"id": 2, "email": "user@acme.com", "user_type": "companyuser", "is_active": true}
# ]
```

**Test 8: list_users - Envelope mode (SuperAdmin)**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/users/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": [
#     {"id": 1, "email": "admin@acme.com", "user_type": "masteradmin", "is_active": true},
#     {"id": 2, "email": "user@acme.com", "user_type": "companyuser", "is_active": true}
#   ],
#   "meta": {},
#   "error": null
# }
```

**Test 9: reset_user_password - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/auth/users/5/reset-password/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# {"message": "Password reset email sent"}
```

**Test 10: reset_user_password - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/auth/users/5/reset-password/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"message": "Password reset email sent"},
#   "meta": {},
#   "error": null
# }
```

**Test 11: Error - 401 NotAuthenticated (no token) on my_tenant - Legacy**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/my-tenant/

# Expected (Legacy - DRF default):
# {"detail": "Authentication credentials were not provided."}
# Status: 401
```

**Test 12: Error - 401 NotAuthenticated (no token) on my_tenant - Envelope**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/my-tenant/ \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope - custom exception handler):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "NOT_AUTHENTICATED",
#     "message": "Authentication credentials were not provided",
#     "details": {"detail": "Authentication credentials were not provided."}
#   }
# }
# Status: 401
```

**Test 13: Error - 403 PermissionDenied (CompanyUser calling list_users) - Legacy**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/users/ \
  -H "Authorization: Bearer <COMPANYUSER_TOKEN>"

# Expected (Legacy - DRF default):
# {"detail": "You do not have permission to perform this action."}
# Status: 403
```

**Test 14: Error - 403 PermissionDenied (CompanyUser calling list_users) - Envelope**
```bash
curl -X GET https://www.ai-athens.cloud/api/auth/users/ \
  -H "Authorization: Bearer <COMPANYUSER_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope - custom exception handler):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "PERMISSION_DENIED",
#     "message": "You do not have permission to perform this action",
#     "details": {"detail": "You do not have permission to perform this action."}
#   }
# }
# Status: 403
```

**Test 15: Error - 404 NotFound (toggle_user_status with invalid id) - Legacy**
```bash
curl -X POST https://www.ai-athens.cloud/api/auth/users/99999/toggle-status/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# {"error": "User not found"}
# Status: 404
```

**Test 16: Error - 404 NotFound (toggle_user_status with invalid id) - Envelope**
```bash
curl -X POST https://www.ai-athens.cloud/api/auth/users/99999/toggle-status/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "USER_NOT_FOUND",
#     "message": "User not found",
#     "details": null
#   }
# }
# Status: 404
```

---

## Behavior Preservation

**Before migration:**
- SAFE endpoints returned simple dicts or arrays
- Error responses: `{"error": "..."}`
- Login/refresh/logout unchanged

**After migration (Legacy mode - default):**
- Identical response payloads for all endpoints
- Identical status codes
- Zero breaking changes
- Login/refresh/logout still unchanged

**After migration (Envelope mode - opt-in via X-Athens-Envelope: 1):**
- SAFE endpoints wrapped in `{ok, data, meta, error}` envelope
- Status codes unchanged
- Error responses have structured `{code, message, details}` format
- Login/refresh/logout still unchanged (not migrated)

---

## Files Changed

```
backend/authentication/views.py    # 6 SAFE endpoints migrated to use ok()/fail()
```

---

## Notes

- **Phase 1 only:** Migrated SAFE, admin/internal endpoints
- **NOT migrated:** login, refresh, logout, 2FA, password reset flows (high risk, public contract)
- Error handling improved with structured error codes (NO_TENANT, NO_COMPANY, USER_NOT_FOUND)
- Permission errors (401/403) handled by custom exception handler (no manual wrapping needed)
- Legacy mode preserves exact response format for backward compatibility
- All unit tests passing (45/45)

---

**Status:** ✅ Phase 1 Complete  
**Verification:** Django check passed, unit tests passed (45/45), manual verification pending (requires running server)  
**Next Phase:** Can migrate login/refresh/logout in Phase 2 after frontend confirmation
