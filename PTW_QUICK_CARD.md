# PTW Refactor - Quick Reference Card

## 🎯 Objective
Refactor PTW from old Athens → Athens 2.0 with multi-tenant architecture

## 📊 Scope Reduction
- **Old Athens:** 20+ models, 39+ endpoints, complex grade-based workflows
- **Athens 2.0:** 13 core models, 18 endpoints, simplified risk-based workflows

## 🚀 Quick Start Commands

### 1. Create PTW App
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py startapp ptw
```

### 2. Add to INSTALLED_APPS
```python
# athens2/settings.py
INSTALLED_APPS = [
    ...
    'ptw',
]
```

### 3. Copy Core Files (Selective Import)
```bash
# Models (adapt for multi-tenant)
cp /var/www/athens/app/backend/ptw/models.py /var/www/athens-2.0/backend/ptw/models.py

# Serializers
cp /var/www/athens/app/backend/ptw/serializers.py /var/www/athens-2.0/backend/ptw/serializers.py

# Views
cp /var/www/athens/app/backend/ptw/views.py /var/www/athens-2.0/backend/ptw/views.py

# Workflow Manager
cp /var/www/athens/app/backend/ptw/unified_workflow_manager.py /var/www/athens-2.0/backend/ptw/workflow_manager.py

# Utilities
cp /var/www/athens/app/backend/ptw/qr_utils.py /var/www/athens-2.0/backend/ptw/
cp /var/www/athens/app/backend/ptw/status_utils.py /var/www/athens-2.0/backend/ptw/
cp /var/www/athens/app/backend/ptw/export_utils.py /var/www/athens-2.0/backend/ptw/
```

## 🔧 Critical Adaptations

### Multi-Tenant Pattern
```python
# Add to EVERY model
class Permit(models.Model):
    athens_tenant_id = models.IntegerField(db_index=True)
    # ... other fields
    
    class Meta:
        indexes = [
            models.Index(fields=['athens_tenant_id', 'status']),
        ]

# Add to EVERY queryset
def get_queryset(self):
    return Permit.objects.filter(
        athens_tenant_id=self.request.user.athens_tenant_id
    )
```

### User Model Reference
```python
# OLD (remove)
from django.contrib.auth import get_user_model
User = get_user_model()

# NEW (use)
from authentication.models import User
```

### Project Model Reference
```python
# OLD (remove)
from authentication.models import Project

# NEW (use)
from ergon.models import Project
```

## 📦 Model Implementation Order

### Phase 1: Foundation (Day 1)
1. PermitType
2. Permit
3. PermitAudit

### Phase 2: Workflow (Day 2)
4. WorkflowTemplate
5. WorkflowInstance
6. WorkflowStep

### Phase 3: Features (Day 3)
7. DigitalSignature
8. PermitExtension
9. GasReading

### Phase 4: Advanced (Day 4)
10. IsolationPointLibrary
11. PermitIsolationPoint
12. CloseoutChecklistTemplate
13. PermitCloseout

## 🔌 API Endpoints (Minimal Set)

### Core (5)
- `GET /api/ptw/permits/` - List
- `POST /api/ptw/permits/` - Create
- `GET /api/ptw/permits/{id}/` - Detail
- `PATCH /api/ptw/permits/{id}/` - Update
- `DELETE /api/ptw/permits/{id}/` - Delete

### Workflow (3)
- `POST /api/ptw/permits/{id}/submit/`
- `POST /api/ptw/permits/{id}/approve/`
- `POST /api/ptw/permits/{id}/reject/`

### Signatures (2)
- `POST /api/ptw/permits/{id}/sign/`
- `GET /api/ptw/permits/{id}/signatures/`

### Extensions (2)
- `POST /api/ptw/permits/{id}/extend/`
- `POST /api/ptw/extensions/{id}/approve/`

### Closeout (2)
- `GET /api/ptw/permits/{id}/closeout/`
- `POST /api/ptw/permits/{id}/closeout/`

### Export (2)
- `GET /api/ptw/permits/{id}/export/pdf/`
- `GET /api/ptw/permits/export/excel/`

**Total: 18 endpoints**

## 🧪 Testing Commands

```bash
# Run all PTW tests
pytest ptw/tests/ -v

# Run specific test
pytest ptw/tests/test_permit_creation.py -v

# Coverage
pytest ptw/tests/ --cov=ptw --cov-report=html
```

## 🗄️ Database Commands

```bash
# Create migrations
python manage.py makemigrations ptw

# Apply migrations
python manage.py migrate ptw

# Seed permit types
python manage.py seed_permit_types

# Check database
python manage.py dbshell
\dt ptw_*
```

## 📋 Verification Checklist

### Backend
- [ ] Models created (13 models)
- [ ] Migrations applied
- [ ] Serializers working
- [ ] ViewSets functional
- [ ] URLs configured
- [ ] Workflow engine operational
- [ ] Multi-tenant filtering enforced
- [ ] Tests passing

### Frontend
- [ ] Components copied
- [ ] API client updated
- [ ] Routes configured
- [ ] List view working
- [ ] Create form working
- [ ] Detail view working
- [ ] Workflow UI functional

### Integration
- [ ] Authentication working
- [ ] Authorization enforced
- [ ] Audit logging active
- [ ] QR codes generating
- [ ] PDF export working
- [ ] Signatures functional

## 🚨 Common Issues & Fixes

### Issue: Import errors
```python
# Fix: Update imports
from authentication.models import User  # Not get_user_model()
from ergon.models import Project  # Not authentication.models.Project
```

### Issue: Missing athens_tenant_id
```python
# Fix: Add to model
athens_tenant_id = models.IntegerField(db_index=True)

# Fix: Add to queryset filter
.filter(athens_tenant_id=request.user.athens_tenant_id)
```

### Issue: Circular imports
```python
# Fix: Use string references
project = models.ForeignKey('ergon.Project', ...)
user = models.ForeignKey('authentication.User', ...)
```

## 📊 Performance Targets

- List view: < 100ms
- Detail view: < 50ms
- Create: < 200ms
- Workflow transition: < 100ms
- PDF export: < 2s

## 🔐 Security Checklist

- [ ] Multi-tenant isolation
- [ ] Permission guards
- [ ] Audit trail
- [ ] Input validation
- [ ] Rate limiting
- [ ] SQL injection prevention

## 📞 Quick Links

- **Old Athens PTW:** `/var/www/athens/app/backend/ptw/`
- **Athens 2.0 PTW:** `/var/www/athens-2.0/backend/ptw/`
- **Documentation:** `/var/www/athens/PTW_COMPLETE_IMPLEMENTATION_GUIDE.md`
- **Tests:** `/var/www/athens/app/backend/ptw/tests/`

## 🎬 Next Action

```bash
# Start implementation
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py startapp ptw
```

---

**Status:** 📋 Ready to Execute
**Estimated Time:** 12 days
**Complexity:** High
**Priority:** High
