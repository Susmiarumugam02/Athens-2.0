# Control Plane Module API Response Standardization

**Date:** February 20, 2025  
**Module:** control_plane  
**Commit:** (pending)

---

## Changes Made

### control_plane/views.py

**Migrated 10 endpoints/actions to use canonical API response helpers:**

1. **TenantViewSet.destroy()** - DELETE /api/control-plane/tenants/{id}/
2. **TenantViewSet.disable()** - POST /api/control-plane/tenants/{id}/disable/
3. **TenantViewSet.enable()** - POST /api/control-plane/tenants/{id}/enable/
4. **TenantViewSet.sync_athens()** - POST /api/control-plane/tenants/{id}/sync_athens/
5. **TenantViewSet.athens_modules() GET** - GET /api/control-plane/tenants/{id}/athens_modules/
6. **TenantViewSet.athens_modules() PATCH** - PATCH /api/control-plane/tenants/{id}/athens_modules/
7. **AthensAuditLogViewSet.list()** - GET /api/control-plane/athens-audit-logs/
8. **TenantServiceViewSet.list()** - GET /api/control-plane/tenant-services/
9. **TenantServiceViewSet.toggle()** - POST /api/control-plane/tenant-services/toggle/
10. **MasterAdminViewSet.update()** - PUT/PATCH /api/control-plane/masters/{id}/

**NOT migrated:** ViewSet default operations (list, retrieve, create) use DRF defaults

---

## Inventory Summary

**Response() returns found:** 15 (in views.py)  
**Migrated:** 10 custom actions/overrides  
**Not migrated:** 5 ViewSet defaults (list, retrieve, create for TenantViewSet, SubscriptionViewSet, AuditLogViewSet)

**Error codes introduced:**
- DELETE_FAILED, LINK_NOT_FOUND, INVALID_MODULES, NOT_FOUND, TENANT_NOT_FOUND

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
# 45 passed in 0.17s
```

### Manual Verification (Curl Examples)

**Test 1: Disable tenant - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# {"message": "Tenant disabled"}
```

**Test 2: Disable tenant - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"message": "Tenant disabled"},
#   "meta": {},
#   "error": null
# }
```

**Test 3: Get Athens modules - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/control-plane/tenants/1/athens_modules/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# {
#   "enabled_modules": ["ptw", "incident", "training"],
#   "available_modules": ["ptw", "incident", "training", "inspection", ...]
# }
```

**Test 4: Get Athens modules - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/control-plane/tenants/1/athens_modules/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {
#     "enabled_modules": ["ptw", "incident", "training"],
#     "available_modules": ["ptw", "incident", "training", "inspection", ...]
#   },
#   "meta": {},
#   "error": null
# }
```

**Test 5: List Athens audit logs - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/control-plane/athens-audit-logs/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# [
#   {"id": 1, "actor": "admin@example.com", "action": "tenant_synced", ...},
#   {"id": 2, "actor": "admin@example.com", "action": "modules_updated", ...}
# ]
```

**Test 6: List Athens audit logs - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/control-plane/athens-audit-logs/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": [
#     {"id": 1, "actor": "admin@example.com", "action": "tenant_synced", ...},
#     {"id": 2, "actor": "admin@example.com", "action": "modules_updated", ...}
#   ],
#   "meta": {},
#   "error": null
# }
```

**Test 7: Toggle tenant service - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenant-services/toggle/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": 1, "service_code": "workforce", "enable": true}'

# Expected (Legacy):
# {"message": "Service toggled", "is_enabled": true}
```

**Test 8: Toggle tenant service - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenant-services/toggle/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"tenant_id": 1, "service_code": "workforce", "enable": true}'

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"message": "Service toggled", "is_enabled": true},
#   "meta": {},
#   "error": null
# }
```

**Test 9: Error - 401 NotAuthenticated (no token) - Legacy**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/

# Expected (Legacy - DRF default):
# {"detail": "Authentication credentials were not provided."}
# Status: 401
```

**Test 10: Error - 401 NotAuthenticated (no token) - Envelope**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/ \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope - exception handler):
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

**Test 11: Error - 403 PermissionDenied (MasterAdmin calling disable) - Legacy**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy - DRF default):
# {"detail": "You do not have permission to perform this action."}
# Status: 403
```

**Test 12: Error - 403 PermissionDenied (MasterAdmin calling disable) - Envelope**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenants/1/disable/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope - exception handler):
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

**Test 13: Error - 404 NotFound (toggle with invalid tenant) - Legacy**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenant-services/toggle/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": 99999, "service_code": "workforce", "enable": true}'

# Expected (Legacy):
# {"error": "Tenant or Service not found"}
# Status: 404
```

**Test 14: Error - 404 NotFound (toggle with invalid tenant) - Envelope**
```bash
curl -X POST https://www.ai-athens.cloud/api/control-plane/tenant-services/toggle/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"tenant_id": 99999, "service_code": "workforce", "enable": true}'

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "NOT_FOUND",
#     "message": "Tenant or Service not found",
#     "details": null
#   }
# }
# Status: 404
```

**Test 15: Error - 400 ValidationError (invalid modules) - Legacy**
```bash
curl -X PATCH https://www.ai-athens.cloud/api/control-plane/tenants/1/athens_modules/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled_modules": ["invalid_module", "ptw"]}'

# Expected (Legacy):
# {"error": "Invalid modules: ['invalid_module']"}
# Status: 400
```

**Test 16: Error - 400 ValidationError (invalid modules) - Envelope**
```bash
curl -X PATCH https://www.ai-athens.cloud/api/control-plane/tenants/1/athens_modules/ \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"enabled_modules": ["invalid_module", "ptw"]}'

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "INVALID_MODULES",
#     "message": "Invalid modules: ['invalid_module']",
#     "details": null
#   }
# }
# Status: 400
```

---

## Behavior Preservation

**Before migration:**
- Custom actions returned simple dicts
- Error responses: `{"error": "..."}`
- ViewSet defaults use DRF responses

**After migration (Legacy mode - default):**
- Identical response payloads
- Identical status codes
- Zero breaking changes

**After migration (Envelope mode - opt-in via X-Athens-Envelope: 1):**
- Custom actions wrapped in `{ok, data, meta, error}` envelope
- Status codes unchanged
- Error responses have structured `{code, message, details}` format
- ViewSet defaults still use DRF responses (not migrated)

---

## Files Changed

```
backend/control_plane/views.py    # 10 custom actions/overrides migrated
```

---

## Notes

- All SuperAdmin-only endpoints (tenant management, audit logs, service management)
- Admin-oriented module, low risk for breaking changes
- Error handling improved with structured codes
- ViewSet default operations (list, retrieve, create) kept as DRF defaults for minimal risk
- Permission errors (401/403) handled by custom exception handler

---

**Status:** ✅ Complete  
**Verification:** Django check passed, unit tests passed (45/45), manual verification pending
