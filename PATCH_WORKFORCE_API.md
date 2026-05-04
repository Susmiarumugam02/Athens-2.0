# PATCH A3 — Workforce API Response Standardization

**Module:** `backend/workforce`  
**Commit:** (pending)  
**Pattern:** Opt-in envelope via `X-Athens-Envelope: 1` header  
**Scope:** Phase 1 - Custom actions/overrides only (DRF default CRUD untouched)

---

## 📊 Migration Summary

**Total Response() occurrences:** 6  
**Migrated endpoints:** 3 custom actions/overrides  
**DRF default CRUD:** Untouched (Phase 2)

### Migrated Endpoints

| Endpoint | Method | Type | Lines | Error Codes |
|----------|--------|------|-------|-------------|
| `/api/workforce/employees/{id}/` | DELETE | Override | 58-60 | - |
| `/api/workforce/payroll-cycles/{id}/process/` | POST | Action | 125-134 | VALIDATION_ERROR, PROCESSING_FAILED |
| `/api/workforce/payroll-cycles/{id}/lock/` | POST | Action | 136-143 | INVALID_STATUS |

### Files Modified

- `backend/workforce/views.py` (lines 1, 58-60, 125-143)
  - Added import: `from system.api_response import ok, fail`
  - Migrated EmployeeViewSet.destroy() override
  - Migrated PayrollCycleViewSet.process() action
  - Migrated PayrollCycleViewSet.lock() action

---

## 🧪 Verification (Manual Curl Tests)

### Setup
```bash
# Login as MasterAdmin
TOKEN=$(curl -s -X POST http://localhost:8004/api/auth/master-admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.access')

# Get employee ID for testing
EMPLOYEE_ID=1
CYCLE_ID=1
```

---

## ✅ SUCCESS CASES

### 1. Employee Soft Delete (Legacy Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (200 OK):**
```json
{
  "detail": "Employee marked as inactive"
}
```

### 2. Employee Soft Delete (Envelope Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "detail": "Employee marked as inactive"
  },
  "meta": {},
  "error": null
}
```

---

### 3. Payroll Cycle Process (Legacy Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/process/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (200 OK):**
```json
{
  "processed_count": 25,
  "total_amount": "125000.00",
  "cycle_id": 1
}
```

### 4. Payroll Cycle Process (Envelope Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/process/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "processed_count": 25,
    "total_amount": "125000.00",
    "cycle_id": 1
  },
  "meta": {},
  "error": null
}
```

---

### 5. Payroll Cycle Lock (Legacy Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/lock/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (200 OK):**
```json
{
  "detail": "Payroll cycle locked"
}
```

### 6. Payroll Cycle Lock (Envelope Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/lock/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (200 OK):**
```json
{
  "ok": true,
  "data": {
    "detail": "Payroll cycle locked"
  },
  "meta": {},
  "error": null
}
```

---

## ❌ ERROR CASES

### 7. Unauthorized Access (Legacy Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/"
```

**Expected Response (401 Unauthorized):**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 8. Unauthorized Access (Envelope Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (401 Unauthorized):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "NOT_AUTHENTICATED",
    "message": "Authentication credentials were not provided.",
    "details": {}
  }
}
```

---

### 9. Forbidden Access (Legacy Mode)
```bash
# Login as regular user without admin permissions
USER_TOKEN=$(curl -s -X POST http://localhost:8004/api/auth/company/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"pass"}' | jq -r '.access')

curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/" \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

**Expected Response (403 Forbidden):**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 10. Forbidden Access (Envelope Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/${EMPLOYEE_ID}/" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (403 Forbidden):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action.",
    "details": {}
  }
}
```

---

### 11. Not Found (Legacy Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/99999/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (404 Not Found):**
```json
{
  "detail": "Not found."
}
```

### 12. Not Found (Envelope Mode)
```bash
curl -X DELETE "http://localhost:8004/api/workforce/employees/99999/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (404 Not Found):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "NOT_FOUND",
    "message": "Not found.",
    "details": {}
  }
}
```

---

### 13. Validation Error - Invalid Cycle Status (Legacy Mode)
```bash
# Try to lock a cycle that's not in 'processed' status
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/lock/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Only processed cycles can be locked"
}
```

### 14. Validation Error - Invalid Cycle Status (Envelope Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/lock/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (400 Bad Request):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "INVALID_STATUS",
    "message": "Only processed cycles can be locked",
    "details": null
  }
}
```

---

### 15. Processing Error (Legacy Mode)
```bash
# Trigger processing error (e.g., invalid cycle data)
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/process/" \
  -H "Authorization: Bearer ${TOKEN}"
```

**Expected Response (400 Bad Request or 500 Internal Server Error):**
```json
{
  "error": "Cycle already processed"
}
```

### 16. Processing Error (Envelope Mode)
```bash
curl -X POST "http://localhost:8004/api/workforce/payroll-cycles/${CYCLE_ID}/process/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Athens-Envelope: 1"
```

**Expected Response (400 Bad Request):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cycle already processed",
    "details": null
  }
}
```

**Or (500 Internal Server Error):**
```json
{
  "ok": false,
  "data": null,
  "meta": {},
  "error": {
    "code": "PROCESSING_FAILED",
    "message": "Payroll processing failed: Database connection error",
    "details": null
  }
}
```

---

## 📋 Error Code Catalog

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Payroll processing validation failures |
| `INVALID_STATUS` | 400 | Payroll cycle not in correct status for operation |
| `PROCESSING_FAILED` | 500 | Payroll processing system errors |
| `NOT_AUTHENTICATED` | 401 | Missing/invalid authentication (auto-handled) |
| `PERMISSION_DENIED` | 403 | Insufficient permissions (auto-handled) |
| `NOT_FOUND` | 404 | Resource not found (auto-handled) |

---

## ✅ Verification Checklist

- [x] Legacy mode (no header) returns original payload format
- [x] Envelope mode (with header) returns `{ok, data, meta, error}` format
- [x] HTTP status codes unchanged in both modes
- [x] Permission errors (401/403) handled by custom exception handler
- [x] Not found errors (404) handled by custom exception handler
- [x] Business validation errors use `fail()` with structured error codes
- [x] Success responses use `ok()` with original data payload
- [x] DRF default CRUD operations untouched (Phase 2)

---

## 🎯 Phase 2 Scope (Deferred)

The following ViewSets have DRF default CRUD operations that will be migrated in Phase 2 with pagination strategy:

- DepartmentViewSet (list/retrieve/create/update/destroy)
- DesignationViewSet (list/retrieve/create/update/destroy)
- EmployeeViewSet (list/retrieve/create/update) - destroy already migrated
- ShiftScheduleViewSet (list/retrieve/create/update/destroy)
- HolidayViewSet (list/retrieve/create/update/destroy)
- AttendanceViewSet (list/retrieve/create/update/destroy)
- PayrollCycleViewSet (list/retrieve/create/update/destroy) - actions already migrated
- PayrollEntryViewSet (list/retrieve - read-only)
- PayrollSettingsViewSet (list/retrieve/create/update/destroy)
- BonusRecordViewSet (list/retrieve/create/update/destroy)
- FineViewSet (list/retrieve/create/update/destroy)
- AdvanceViewSet (list/retrieve/create/update/destroy)
- EmployeeProfileViewSet (list/retrieve/create/update/destroy)
- LeaveTypeViewSet (list/retrieve/create/update/destroy)
- LeaveBalanceViewSet (list/retrieve/create/update/destroy)
- LeaveRequestViewSet (list/retrieve/create/update/destroy)

**Total ViewSets:** 16  
**Total CRUD endpoints:** ~80 (16 ViewSets × 5 operations average)

---

## 📝 Notes

- **Zero Breaking Changes:** Legacy mode behavior preserved byte-for-byte
- **Opt-in Envelope:** Clients must explicitly send `X-Athens-Envelope: 1` header
- **Custom Exception Handler:** Automatically wraps DRF exceptions (401/403/404) in envelope format
- **Phase 1 Focus:** Only custom actions/overrides migrated for minimal risk
- **Phase 2 Strategy:** CRUD operations require pagination strategy before migration
