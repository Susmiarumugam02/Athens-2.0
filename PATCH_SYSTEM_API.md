# System Module API Response Standardization

**Date:** February 20, 2025  
**Module:** system  
**Commit:** (pending)

---

## Changes Made

### system/views.py

**Migrated 8 endpoints to use canonical API response helpers:**

1. **health()** (Line 15) - GET /api/system/health/
   - Legacy: `{"status": "ok"}`
   - Envelope: `{ok: true, data: {status: "ok"}, meta: {}, error: null}`

2. **list_services()** (Line 20) - GET /api/system/services/
   - Legacy: `[{service objects}]`
   - Envelope: `{ok: true, data: [{service objects}], meta: {}, error: null}`

3. **list_tenant_services()** (Line 28) - GET /api/system/tenant-services/
   - Legacy: `[{tenant_service objects}]`
   - Envelope: `{ok: true, data: [{tenant_service objects}], meta: {}, error: null}`
   - Error (404): Legacy `{"error": "Tenant not found"}` → Envelope `{ok: false, error: {code: "NOT_FOUND", message: "Tenant not found"}}`

4. **enable_service()** (Line 58) - POST /api/system/services/{code}/enable/
   - Legacy: `{"message": "...", "data": {...}}`
   - Envelope: `{ok: true, data: {message: "...", service: {...}}, meta: {}, error: null}`
   - Errors: 400/404/500 wrapped in envelope format

5. **disable_service()** (Line 109) - POST /api/system/services/{code}/disable/
   - Legacy: `{"message": "Service disabled"}`
   - Envelope: `{ok: true, data: {message: "..."}, meta: {}, error: null}`
   - Errors: 400/404/500 wrapped in envelope format

6. **service_stats()** (Line 157) - GET /api/system/services/stats/
   - Legacy: `{stats object}`
   - Envelope: `{ok: true, data: {stats object}, meta: {}, error: null}`

7. **update_service_config()** (Line 169) - POST /api/system/services/{code}/config/
   - Legacy: `{"message": "Configuration updated", "data": {...}}`
   - Envelope: `{ok: true, data: {message: "...", service: {...}}, meta: {}, error: null}`
   - Errors: 400/500 wrapped in envelope format

8. **change_service_tier()** (Line 201) - POST /api/system/services/{code}/tier/
   - Legacy: `{"message": "Tier changed to ...", "data": {...}}`
   - Envelope: `{ok: true, data: {message: "...", service: {...}}, meta: {}, error: null}`
   - Errors: 400/500 wrapped in envelope format

---

## Inventory Summary

**Response() returns found:** 24 (in views.py)  
**Migrated:** 8 endpoints (all endpoints in system/views.py)  
**Error responses migrated:** 16 (400/404/500 errors)

**Pattern:**
- Success responses: `return Response({...})` → `return ok(data={...}, request=request)`
- Error responses: `return Response({"error": "..."}, status=...)` → `return fail(code, message, status=..., request=request)`
- List responses: Already return serializer.data, wrapped with `ok()`

---

## Verification

### Django Check
```bash
python manage.py check
# System check identified no issues (0 silenced).
```

### Manual Verification (Curl Examples)

**Test 1: Health endpoint - Legacy mode (no header)**
```bash
curl -X GET https://www.ai-athens.cloud/api/system/health/

# Expected (Legacy):
# {"status": "ok"}
```

**Test 2: Health endpoint - Envelope mode (with header)**
```bash
curl -X GET https://www.ai-athens.cloud/api/system/health/ \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"status": "ok"},
#   "meta": {},
#   "error": null
# }
```

**Test 3: List services - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/system/services/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Expected (Legacy):
# [
#   {"code": "workforce", "name": "Workforce Management", ...},
#   {"code": "ergon", "name": "ERGON Operations", ...}
# ]
```

**Test 4: List services - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/system/services/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": [
#     {"code": "workforce", "name": "Workforce Management", ...},
#     {"code": "ergon", "name": "ERGON Operations", ...}
#   ],
#   "meta": {},
#   "error": null
# }
```

**Test 5: Error case - Tenant not found (Legacy)**
```bash
curl -X GET "https://www.ai-athens.cloud/api/system/tenant-services/?tenant_id=99999" \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>"

# Expected (Legacy):
# {"error": "Tenant not found"}
# Status: 404
```

**Test 6: Error case - Tenant not found (Envelope)**
```bash
curl -X GET "https://www.ai-athens.cloud/api/system/tenant-services/?tenant_id=99999" \
  -H "Authorization: Bearer <SUPERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "NOT_FOUND",
#     "message": "Tenant not found",
#     "details": null
#   }
# }
# Status: 404
```

**Test 7: Enable service - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/system/services/workforce/enable/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tier": "basic"}'

# Expected (Legacy):
# {
#   "message": "Service Workforce Management enabled",
#   "data": {
#     "id": 1,
#     "service": {...},
#     "is_enabled": true,
#     ...
#   }
# }
```

**Test 8: Enable service - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/system/services/workforce/enable/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"tier": "basic"}'

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {
#     "message": "Service Workforce Management enabled",
#     "service": {
#       "id": 1,
#       "service": {...},
#       "is_enabled": true,
#       ...
#     }
#   },
#   "meta": {},
#   "error": null
# }
```

**Test 9: Validation error - Missing tier (Legacy)**
```bash
curl -X POST https://www.ai-athens.cloud/api/system/services/workforce/tier/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected (Legacy):
# {"error": "Tier is required"}
# Status: 400
```

**Test 10: Validation error - Missing tier (Envelope)**
```bash
curl -X POST https://www.ai-athens.cloud/api/system/services/workforce/tier/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{}'

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "INVALID_INPUT",
#     "message": "Tier is required",
#     "details": null
#   }
# }
# Status: 400
```

---

## Behavior Preservation

**Before migration:**
- All endpoints returned raw data or `{"error": "..."}` format
- Status codes: 200 (success), 400 (validation), 403 (permission), 404 (not found), 500 (server error)

**After migration (Legacy mode - default):**
- Identical response payloads (byte-for-byte where possible)
- Identical status codes
- Zero breaking changes

**After migration (Envelope mode - opt-in via X-Athens-Envelope: 1):**
- All responses wrapped in `{ok, data, meta, error}` envelope
- Status codes unchanged
- Error responses have structured `{code, message, details}` format

---

## Files Changed

```
backend/system/views.py    # 8 endpoints migrated to use ok()/fail()
```

---

## Notes

- All 8 endpoints in system/views.py migrated
- No pagination endpoints in system module (all return simple lists)
- Error handling improved with structured error codes (NOT_FOUND, INVALID_INPUT, VALIDATION_ERROR, INTERNAL_ERROR)
- Legacy mode preserves exact response format for backward compatibility
- Envelope mode provides consistent API contract for new clients

---

**Status:** ✅ Complete  
**Verification:** Django check passed, manual verification pending (requires running server)
