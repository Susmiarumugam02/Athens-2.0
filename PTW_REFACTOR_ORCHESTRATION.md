# PTW Module Refactor & Rebuild - Orchestration Plan

## Executive Summary

Refactor and rebuild the PTW (Permit to Work) module from old Athens into Athens 2.0 with:
- ✅ Multi-tenant architecture (athens_tenant_id)
- ✅ Simplified core models (20+ → 12 core models)
- ✅ Modern Django 5.0 + PostgreSQL
- ✅ Production-ready workflow engine
- ✅ Mobile-first design

## Phase 1: Core Models Migration (Day 1-2)

### 1.1 Create PTW App Structure
```bash
cd /var/www/athens-2.0/backend
python manage.py startapp ptw
```

### 1.2 Core Models (Priority Order)

**Tier 1 - Foundation (Implement First)**
1. `PermitType` - Permit categories and configurations
2. `Permit` - Core permit model with multi-tenant support
3. `WorkflowTemplate` - Workflow definitions
4. `WorkflowInstance` - Active workflows
5. `WorkflowStep` - Workflow step tracking

**Tier 2 - Essential Features**
6. `PermitExtension` - Time extensions
7. `DigitalSignature` - E-signatures with JSON payload
8. `PermitAudit` - Audit trail
9. `GasReading` - Gas testing records

**Tier 3 - Advanced Features**
10. `IsolationPointLibrary` - LOTO points catalog
11. `PermitIsolationPoint` - Isolation assignments
12. `CloseoutChecklistTemplate` - Closeout templates
13. `PermitCloseout` - Closeout tracking

**Deferred to Phase 2**
- PermitWorker (depends on Worker module)
- PermitToolboxTalk (nice-to-have)
- HazardLibrary (can use JSON fields initially)
- WebhookEndpoint (Phase 3)

### 1.3 Key Model Changes from Old Athens

**Multi-Tenant Support:**
```python
# Add to ALL models
athens_tenant_id = models.IntegerField(db_index=True)

# Index pattern
class Meta:
    indexes = [
        models.Index(fields=['athens_tenant_id', 'status']),
    ]
```

**User References:**
```python
# Old Athens
from django.contrib.auth import get_user_model
User = get_user_model()

# Athens 2.0
from authentication.models import User
```

**Project References:**
```python
# Old Athens
from authentication.models import Project

# Athens 2.0
from ergon.models import Project  # Or create PTW-specific project model
```

## Phase 2: API Layer (Day 3-4)

### 2.1 Serializers (Import & Adapt)
Copy from: `/var/www/athens/app/backend/ptw/serializers.py`

**Key Changes:**
- Add `athens_tenant_id` to all serializers
- Update User serializer references
- Simplify nested serializers

### 2.2 ViewSets (Import & Adapt)
Copy from: `/var/www/athens/app/backend/ptw/views.py`

**Key Changes:**
```python
# Add tenant filtering to all querysets
def get_queryset(self):
    user = self.request.user
    tenant_id = user.athens_tenant_id
    return Permit.objects.filter(athens_tenant_id=tenant_id)
```

### 2.3 URL Configuration
```python
# ptw/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'permits', views.PermitViewSet, basename='permit')
router.register(r'permit-types', views.PermitTypeViewSet, basename='permittype')
router.register(r'workflows', views.WorkflowViewSet, basename='workflow')

urlpatterns = [
    path('', include(router.urls)),
]
```

## Phase 3: Workflow Engine (Day 5-6)

### 3.1 Import Workflow Manager
Copy from: `/var/www/athens/app/backend/ptw/unified_workflow_manager.py`

**Simplifications:**
- Remove complex grade-based logic (use risk_level instead)
- Keep core state machine
- Maintain signature gating

### 3.2 Status Transitions
```python
VALID_TRANSITIONS = {
    'draft': ['submitted', 'cancelled'],
    'submitted': ['under_review', 'rejected', 'draft'],
    'under_review': ['approved', 'rejected'],
    'approved': ['active', 'cancelled'],
    'active': ['completed', 'suspended', 'expired'],
    'suspended': ['active', 'cancelled'],
    'completed': [],
    'cancelled': [],
    'expired': [],
    'rejected': ['draft']
}
```

## Phase 4: Utilities & Services (Day 7)

### 4.1 Import Core Utilities
- `qr_utils.py` - QR code generation
- `status_utils.py` - Status normalization
- `export_utils.py` - PDF/Excel export
- `notification_utils.py` - Notifications

### 4.2 Signature Service
Copy from: `/var/www/athens/app/backend/ptw/unified_signature_pipeline.py`

**Keep:**
- JSON stroke format
- Signature validation
- Multi-role signatures

## Phase 5: Frontend Integration (Day 8-10)

### 5.1 Copy Frontend Components
From: `/var/www/athens/app/frontend/src/features/ptw/`

**Priority Components:**
1. `PermitList.tsx` - List view
2. `PermitDetail.tsx` - Detail view
3. `EnhancedPermitForm.tsx` - Create/Edit form
4. `WorkflowManager.tsx` - Workflow UI
5. `PTWKPIDashboard.tsx` - Dashboard

### 5.2 API Client
Copy: `/var/www/athens/app/frontend/src/services/ptwAPI.ts`

**Update:**
- Change base URL to Athens 2.0 backend
- Add tenant context to requests

### 5.3 Routes
```typescript
// Athens 2.0 routing
{
  path: '/ptw',
  element: <PTWLayout />,
  children: [
    { index: true, element: <PermitList /> },
    { path: 'new', element: <EnhancedPermitForm /> },
    { path: ':id', element: <PermitDetail /> },
    { path: ':id/edit', element: <EnhancedPermitForm /> },
  ]
}
```

## Phase 6: Testing & Validation (Day 11-12)

### 6.1 Import Test Suite
From: `/var/www/athens/app/backend/ptw/tests/`

**Priority Tests:**
1. `test_permit_creation_and_qr.py`
2. `test_workflow_statuses.py`
3. `test_signature_json_contract.py`
4. `test_closeout.py`
5. `test_isolation_points.py`

### 6.2 Run Tests
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
pytest ptw/tests/ -v
```

## Implementation Checklist

### Backend
- [ ] Create ptw app
- [ ] Implement Tier 1 models (5 models)
- [ ] Implement Tier 2 models (4 models)
- [ ] Implement Tier 3 models (4 models)
- [ ] Create serializers
- [ ] Create viewsets
- [ ] Configure URLs
- [ ] Import workflow manager
- [ ] Import utilities
- [ ] Run migrations
- [ ] Seed permit types
- [ ] Run tests

### Frontend
- [ ] Copy PTW components
- [ ] Update API client
- [ ] Configure routes
- [ ] Test list view
- [ ] Test create form
- [ ] Test detail view
- [ ] Test workflow UI
- [ ] Test signatures

### Integration
- [ ] Multi-tenant filtering
- [ ] Permission guards
- [ ] Audit logging
- [ ] QR code generation
- [ ] PDF export
- [ ] Notifications

## Database Schema Summary

### Core Tables (13)
1. `ptw_permit_type` - Permit categories
2. `ptw_permit` - Main permits table
3. `ptw_workflow_template` - Workflow definitions
4. `ptw_workflow_instance` - Active workflows
5. `ptw_workflow_step` - Workflow steps
6. `ptw_permit_extension` - Time extensions
7. `ptw_digital_signature` - E-signatures
8. `ptw_permit_audit` - Audit trail
9. `ptw_gas_reading` - Gas tests
10. `ptw_isolation_point_library` - LOTO catalog
11. `ptw_permit_isolation_point` - Isolation assignments
12. `ptw_closeout_checklist_template` - Closeout templates
13. `ptw_permit_closeout` - Closeout tracking

### Indexes Strategy
```sql
-- All tables
CREATE INDEX idx_tenant ON ptw_permit(athens_tenant_id);

-- Permit table
CREATE INDEX idx_permit_status ON ptw_permit(athens_tenant_id, status);
CREATE INDEX idx_permit_number ON ptw_permit(permit_number);
CREATE INDEX idx_permit_dates ON ptw_permit(planned_start_time, planned_end_time);

-- Workflow
CREATE INDEX idx_workflow_permit ON ptw_workflow_instance(permit_id);
CREATE INDEX idx_workflow_step_status ON ptw_workflow_step(workflow_id, status);
```

## API Endpoints (Minimal Viable Set)

### Core CRUD (5 endpoints)
- `GET /api/ptw/permits/` - List permits
- `POST /api/ptw/permits/` - Create permit
- `GET /api/ptw/permits/{id}/` - Get permit
- `PATCH /api/ptw/permits/{id}/` - Update permit
- `DELETE /api/ptw/permits/{id}/` - Delete permit

### Workflow (3 endpoints)
- `POST /api/ptw/permits/{id}/submit/` - Submit for approval
- `POST /api/ptw/permits/{id}/approve/` - Approve permit
- `POST /api/ptw/permits/{id}/reject/` - Reject permit

### Signatures (2 endpoints)
- `POST /api/ptw/permits/{id}/sign/` - Add signature
- `GET /api/ptw/permits/{id}/signatures/` - List signatures

### Extensions (2 endpoints)
- `POST /api/ptw/permits/{id}/extend/` - Request extension
- `POST /api/ptw/extensions/{id}/approve/` - Approve extension

### Closeout (2 endpoints)
- `GET /api/ptw/permits/{id}/closeout/` - Get closeout checklist
- `POST /api/ptw/permits/{id}/closeout/` - Update closeout

### Exports (2 endpoints)
- `GET /api/ptw/permits/{id}/export/pdf/` - Export PDF
- `GET /api/ptw/permits/export/excel/` - Export Excel

**Total: 18 endpoints (vs 39+ in old Athens)**

## Migration Strategy

### Data Migration (If Needed)
```python
# management/commands/migrate_ptw_data.py
from django.core.management.base import BaseCommand
from ptw.models import Permit, PermitType
import mysql.connector

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Connect to old Athens MySQL
        old_db = mysql.connector.connect(
            host='localhost',
            user='root',
            password='Ergon@2024',
            database='u494785662_ergon_site'
        )
        
        # Migrate permit types
        # Migrate permits
        # Migrate workflows
        # etc.
```

## Performance Targets

- List view: < 100ms (paginated, 50 items)
- Detail view: < 50ms
- Create permit: < 200ms
- Workflow transition: < 100ms
- PDF export: < 2s
- Excel export (100 permits): < 5s

## Security Checklist

- [ ] Multi-tenant isolation enforced
- [ ] Permission-based access control
- [ ] Audit trail on all mutations
- [ ] Signature validation
- [ ] QR code security
- [ ] Rate limiting on API
- [ ] Input validation
- [ ] SQL injection prevention

## Deployment Steps

1. **Backend Deployment**
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py makemigrations ptw
python manage.py migrate ptw
python manage.py seed_permit_types
sudo systemctl restart athens2-backend
```

2. **Frontend Deployment**
```bash
cd /var/www/athens-2.0/frontend
npm run build
sudo systemctl restart athens2-frontend
```

3. **Verification**
```bash
curl http://localhost:8003/api/ptw/permits/ -H "Authorization: Bearer $TOKEN"
```

## Success Criteria

- [ ] All 13 core models created
- [ ] 18 API endpoints functional
- [ ] Multi-tenant filtering works
- [ ] Workflow engine operational
- [ ] Signatures working
- [ ] PDF export functional
- [ ] Frontend integrated
- [ ] Tests passing (>80% coverage)
- [ ] Performance targets met
- [ ] Security audit passed

## Timeline

- **Day 1-2:** Core models
- **Day 3-4:** API layer
- **Day 5-6:** Workflow engine
- **Day 7:** Utilities
- **Day 8-10:** Frontend
- **Day 11-12:** Testing
- **Total: 12 days**

## Next Steps

1. Review and approve this plan
2. Create ptw app structure
3. Start with Tier 1 models
4. Implement incrementally
5. Test continuously

---

**Status:** 📋 Plan Ready | Awaiting Approval
**Complexity:** High | **Effort:** 12 days | **Priority:** High
