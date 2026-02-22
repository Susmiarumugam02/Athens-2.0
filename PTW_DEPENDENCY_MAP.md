# PTW Dependency Map (Ground Truth)

## Phase 2 Complete - Deterministic Dependency List

### Import Analysis Results

**Total PTW files analyzed:** 43 Python files  
**External dependencies found:** 13 Athens-specific imports  
**Startup blockers:** 8 (imported by urls.py/views.py at module level)

---

## A: STARTUP BLOCKERS (Must exist before PTW loads)

These are imported at module-level in `ptw/urls.py` or `ptw/views.py`:

| Module | Import Location | Exists in Athens 2.0? | Resolution |
|--------|----------------|----------------------|------------|
| `authentication.models.CustomUser` | ptw/views.py:15 | ✅ YES (alias for User) | ✅ Already resolved |
| `authentication.models.Project` | ptw/views.py:16 | ✅ YES | ✅ Already resolved |
| `authentication.models.UserDetail` | ptw/views.py:17 | ✅ YES | ✅ Added in Phase 1 |
| `authentication.models.AdminDetail` | ptw/views.py:17 | ✅ YES | ✅ Added in Phase 1 |
| `authentication.tenant_scoped` | ptw/views.py:28 | ✅ YES | ✅ Copied in Phase 1 |
| `authentication.rbac_permissions` | ptw/views.py:29 | ✅ YES | ✅ Already exists |
| `permissions.decorators` | ptw/views.py:79 | ❌ NO | **BLOCKER** - needs `permissions` app |
| `worker.models.Worker` | ptw/models.py:12 | ❌ NO | **BLOCKER** - needs `worker` app |

---

## B: RUNTIME-ONLY (Can be lazy-imported)

These are imported inside functions/methods:

| Module | Usage | Resolution |
|--------|-------|------------|
| `authentication.models_notification.Notification` | Inside notification functions | Move to lazy import |
| `authentication.signature_template_generator_new` | Inside signature generation | Move to lazy import |
| `authentication.serializers.AdminUserCommonSerializer` | Inside serializer methods | Move to lazy import |
| `authentication.tenant_scoped_utils` | Inside view methods | ❌ Missing - create shim |
| `worker.serializers.WorkerSerializer` | Inside permit worker serialization | Move to lazy import |

---

## C: OPTIONAL FEATURES (Never required for startup)

| Package | Purpose | Required? |
|---------|---------|-----------|
| `celery` | Async tasks | Optional - graceful degradation |
| `channels` | WebSockets | Optional - graceful degradation |
| `reportlab` | PDF generation | Optional - return 501 if missing |
| `qrcode` | QR code generation | Optional - return 501 if missing |
| `face_recognition` | Face recognition | Optional - return 501 if missing |
| `opencv-python` | Image processing | Optional - return 501 if missing |

---

## Missing Apps Analysis

### 1. `permissions` App
**Status:** ❌ Not in Athens 2.0  
**Used by:** PTW views for `@require_permission` decorator  
**Resolution:** 
- Option A: Copy entire `permissions` app from old Athens
- Option B: Replace with Athens 2.0 `RequireTenantPermission`
- **Chosen:** Option B (simpler, uses existing pattern)

### 2. `worker` App  
**Status:** ❌ Not in Athens 2.0  
**Used by:** PTW models for `PermitWorker` FK relationship  
**Resolution:**
- Option A: Copy entire `worker` app (20+ files)
- Option B: Create minimal Worker model in PTW
- **Chosen:** Option A (worker is core to Athens, needed by multiple modules)

### 3. `authentication.tenant_scoped_utils`
**Status:** ❌ Not in Athens 2.0  
**Used by:** PTW views for tenant context helpers  
**Resolution:** Create compatibility shim in `ptw/compat/`

---

## Resolution Strategy

### Phase 3: Remove Startup Coupling
1. ✅ Replace `permissions.decorators` with `RequireTenantPermission`
2. ✅ Move optional imports inside functions
3. ✅ Create `ptw/compat/tenant_utils.py` shim

### Phase 4: Import Worker App
1. Copy `worker` app from old Athens
2. Add to INSTALLED_APPS (behind feature flag)
3. Run migrations
4. Verify PTW models work

### Phase 5: Enable PTW
1. Set `FEATURE_PTW_ENABLED = True`
2. Verify server boots
3. Test PTW endpoints
4. Run full test suite

---

## Files Requiring Modification

### Immediate (Phase 3)
- `ptw/views.py` - Remove `permissions.decorators` import
- `ptw/views.py` - Move heavy imports inside methods
- `ptw/compat/tenant_utils.py` - Create shim (NEW FILE)

### Short-term (Phase 4)
- Copy `/var/www/athens/app/backend/worker/` → `/var/www/athens-2.0/backend/worker/`
- `athens2/settings.py` - Add `worker` to conditional INSTALLED_APPS
- Run `python manage.py makemigrations worker`
- Run `python manage.py migrate worker`

### Final (Phase 5)
- `athens2/settings.py` - Set `FEATURE_PTW_ENABLED = True`
- Test all PTW endpoints
- Document any remaining limitations

---

## Current Status

✅ **Phase 1 Complete** - Server boots with PTW disabled  
✅ **Phase 2 Complete** - Dependency map created  
⏳ **Phase 3 Next** - Remove startup coupling  

**Blockers Remaining:** 2
1. `permissions` app usage (can be replaced)
2. `worker` app dependency (must be imported)

**Estimated Time to PTW Working:**
- Phase 3: 15 minutes
- Phase 4: 30 minutes  
- Phase 5: 15 minutes
- **Total: ~1 hour**
