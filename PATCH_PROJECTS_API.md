# Projects Module API Response Standardization

**Date:** February 20, 2025  
**Module:** projects  
**Commit:** (pending)

---

## Changes Made

### projects/views.py

**Migrated 5 action endpoints to use canonical API response helpers:**

1. **activate()** (Line 107) - POST /api/projects/{id}/activate/
   - Legacy: `{"status": "activated"}`
   - Envelope: `{ok: true, data: {status: "activated"}, meta: {}, error: null}`

2. **deactivate()** (Line 129) - POST /api/projects/{id}/deactivate/
   - Legacy: `{"status": "deactivated"}`
   - Envelope: `{ok: true, data: {status: "deactivated"}, meta: {}, error: null}`

3. **archive()** (Line 151) - POST /api/projects/{id}/archive/
   - Legacy: `{"status": "archived"}`
   - Envelope: `{ok: true, data: {status: "archived"}, meta: {}, error: null}`

4. **members() GET** (Line 173) - GET /api/projects/{id}/members/
   - Legacy: `[{membership objects}]`
   - Envelope: `{ok: true, data: [{membership objects}], meta: {}, error: null}`

5. **members() POST** (Line 177) - POST /api/projects/{id}/members/
   - Legacy: `{membership object}` (201 Created)
   - Envelope: `{ok: true, data: {membership object}, meta: {}, error: null}` (201 Created)
   - Error (400): Legacy `{"error": "User not found..."}` → Envelope `{ok: false, error: {code: "INVALID_USER", message: "..."}}`

**Note:** List/retrieve/create/update/delete operations use DRF's default ViewSet responses (not migrated - would require pagination class override).

---

## Inventory Summary

**Response() returns found:** 7 (in views.py)  
**Migrated:** 5 action endpoints (activate, deactivate, archive, members GET/POST)  
**Not migrated:** 2 ViewSet default operations (list, retrieve - use DRF defaults)

**Pattern:**
- Action responses: `return Response({...})` → `return ok(data={...}, request=request)`
- Error responses: `return Response({"error": "..."}, status=...)` → `return fail(code, message, status=..., request=request)`
- List responses: Wrapped with `ok(data=serializer.data, request=request)`

---

## Verification

### Django Check
```bash
python manage.py check
# System check identified no issues (0 silenced).
```

### Manual Verification (Curl Examples)

**Test 1: List projects - Legacy mode (DRF default)**
```bash
curl -X GET https://www.ai-athens.cloud/api/projects/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy - DRF default):
# [
#   {"id": 1, "name": "Project Alpha", "code": "PROJ001", ...},
#   {"id": 2, "name": "Project Beta", "code": "PROJ002", ...}
# ]
```

**Test 2: List projects - Envelope mode (DRF default - no change)**
```bash
curl -X GET https://www.ai-athens.cloud/api/projects/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Legacy - DRF default, envelope not applied to ViewSet list):
# [
#   {"id": 1, "name": "Project Alpha", "code": "PROJ001", ...},
#   {"id": 2, "name": "Project Beta", "code": "PROJ002", ...}
# ]
# Note: ViewSet list operations use DRF default pagination, not migrated in this patch
```

**Test 3: Activate project - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/activate/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy):
# {"status": "activated"}
```

**Test 4: Activate project - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/activate/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"status": "activated"},
#   "meta": {},
#   "error": null
# }
```

**Test 5: Get project members - Legacy mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>"

# Expected (Legacy):
# [
#   {"id": 1, "user": {...}, "role": "owner", "is_active": true, ...},
#   {"id": 2, "user": {...}, "role": "member", "is_active": true, ...}
# ]
```

**Test 6: Get project members - Envelope mode**
```bash
curl -X GET https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "X-Athens-Envelope: 1"

# Expected (Envelope):
# {
#   "ok": true,
#   "data": [
#     {"id": 1, "user": {...}, "role": "owner", "is_active": true, ...},
#     {"id": 2, "user": {...}, "role": "member", "is_active": true, ...}
#   ],
#   "meta": {},
#   "error": null
# }
```

**Test 7: Add project member - Legacy mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 5, "role": "member"}'

# Expected (Legacy):
# {"id": 3, "user": {...}, "role": "member", "is_active": true, ...}
# Status: 201 Created
```

**Test 8: Add project member - Envelope mode**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"user_id": 5, "role": "member"}'

# Expected (Envelope):
# {
#   "ok": true,
#   "data": {"id": 3, "user": {...}, "role": "member", "is_active": true, ...},
#   "meta": {},
#   "error": null
# }
# Status: 201 Created
```

**Test 9: Add member error - Invalid user (Legacy)**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 99999, "role": "member"}'

# Expected (Legacy):
# {"error": "User not found or not in same company"}
# Status: 400
```

**Test 10: Add member error - Invalid user (Envelope)**
```bash
curl -X POST https://www.ai-athens.cloud/api/projects/1/members/ \
  -H "Authorization: Bearer <MASTERADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Athens-Envelope: 1" \
  -d '{"user_id": 99999, "role": "member"}'

# Expected (Envelope):
# {
#   "ok": false,
#   "data": null,
#   "meta": {},
#   "error": {
#     "code": "INVALID_USER",
#     "message": "User not found or not in same company",
#     "details": null
#   }
# }
# Status: 400
```

---

## Behavior Preservation

**Before migration:**
- Action endpoints returned simple dicts: `{"status": "..."}`
- Members GET returned array of memberships
- Members POST returned membership object with 201 status
- Error responses: `{"error": "..."}`

**After migration (Legacy mode - default):**
- Identical response payloads
- Identical status codes
- Zero breaking changes

**After migration (Envelope mode - opt-in via X-Athens-Envelope: 1):**
- All action responses wrapped in `{ok, data, meta, error}` envelope
- Status codes unchanged
- Error responses have structured `{code, message, details}` format

---

## Files Changed

```
backend/projects/views.py    # 5 action endpoints migrated to use ok()/fail()
```

---

## Notes

- Only custom action endpoints migrated (activate, deactivate, archive, members)
- ViewSet default operations (list, retrieve, create, update, delete) use DRF defaults
- To migrate ViewSet list operations, would need to override list() method or add pagination_class
- Current patch focuses on custom actions for minimal risk
- Error handling improved with structured error code (INVALID_USER)
- Legacy mode preserves exact response format for backward compatibility

---

**Status:** ✅ Complete  
**Verification:** Django check passed, manual verification pending (requires running server)
