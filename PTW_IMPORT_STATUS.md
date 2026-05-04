# PTW Import Status

## Current Status: ⚠️ BLOCKED - Dependency Chain Too Deep

### Problem
PTW module from old Athens has cascading dependencies that require systematic import of multiple interconnected modules.

### Dependencies Imported So Far
1. ✅ `django-filter` - Filtering support
2. ✅ `reportlab` - PDF generation
3. ✅ `qrcode` + `pillow` - QR code generation
4. ✅ `celery` - Async task processing
5. ✅ `channels` + `channels-redis` - WebSocket support
6. ✅ `face-recognition` + `opencv-python` - Face recognition
7. ✅ `redis` - Caching and message broker
8. ✅ `authentication.tenant_scoped` - Tenant scoping ViewSets
9. ✅ `authentication.project_isolation` - Project isolation utilities
10. ✅ `authentication.signature_template_generator_new` - Signature templates
11. ✅ `authentication.models_notification` - Notification models
12. ✅ `control_plane.CollaborationProject` - Collaboration models
13. ✅ `control_plane.CollaborationMembership` - Membership models
14. ✅ `control_plane.CollaborationSharePolicy` - Share policy models
15. ✅ `authentication.UserDetail` - Extended user profile
16. ✅ `authentication.AdminDetail` - Extended admin profile

### Still Missing
- More authentication models (CompanyDetail, etc.)
- Worker module models and dependencies
- PTW-specific utility modules
- Notification system integration
- File upload/storage configuration
- Media file handling

### Recommended Approach

**Option 1: Stub Implementation (Quick)**
- Create minimal PTW API endpoints that return empty data
- Allows frontend development to proceed
- Backend can be filled in incrementally

**Option 2: Complete Import (Thorough)**
- Systematically import all dependencies from old Athens
- Copy entire `worker` module
- Copy all authentication helper modules
- Run migrations for all new models
- Test end-to-end

**Option 3: Hybrid (Recommended)**
- Import PTW models only (no views/serializers)
- Create simple REST endpoints manually
- Use existing Athens 2.0 patterns (AuditLogMixin, RequireTenantPermission)
- Gradually add features as needed

### Current Error
```
ModuleNotFoundError: No module named 'authentication.models_notification'
```

Server keeps crashing because PTW views try to import modules that don't exist yet.

### Next Steps
1. **Immediate**: Disable PTW temporarily, create stub API
2. **Short-term**: Import worker module completely
3. **Medium-term**: Import remaining authentication modules
4. **Long-term**: Full PTW integration with all features

### Files Modified
- `/var/www/athens-2.0/backend/athens2/settings.py` - Added PTW to INSTALLED_APPS
- `/var/www/athens-2.0/backend/athens2/urls.py` - Added PTW URL routing
- `/var/www/athens-2.0/backend/control_plane/models.py` - Added Collaboration models
- `/var/www/athens-2.0/backend/authentication/models.py` - Added UserDetail, AdminDetail
- `/var/www/athens-2.0/backend/authentication/tenant_scoped.py` - Copied from old Athens
- `/var/www/athens-2.0/backend/authentication/project_isolation.py` - Copied from old Athens
- `/var/www/athens-2.0/backend/authentication/signature_template_generator_new.py` - Copied
- `/var/www/athens-2.0/backend/authentication/models_notification.py` - Copied

### Frontend Status
- ✅ PTW routes added (`/app/ptw`, `/app/ptw/permits`)
- ✅ PTW landing page created
- ✅ Permits list page created with API integration
- ❌ Backend API not responding (server crashes on startup)

### Recommendation
**Create stub PTW API immediately** to unblock frontend development while backend import continues in parallel.
