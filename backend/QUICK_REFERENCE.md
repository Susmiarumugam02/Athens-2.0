# Athens 2.0 Backend - Quick Reference

## 🚀 Start Development

```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py runserver 0.0.0.0:8004
```

## 🧪 Run Tests

```bash
pytest -v                    # All tests
pytest authentication/       # Auth tests only
pytest control_plane/        # Control plane tests only
```

## 📋 Common Commands

```bash
# Create superuser
python manage.py createsuperuser

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Django shell
python manage.py shell

# Check for issues
python manage.py check
```

## 🔑 API Endpoints

### Authentication (Public)
```
POST /api/auth/master-admin/login/    # Master admin login
POST /api/auth/company/login/         # Company user login
POST /api/auth/token/refresh/         # Refresh access token
POST /api/auth/logout/                # Logout (requires auth)
```

### Control Plane (Superadmin Only)
```
GET/POST   /api/control-plane/tenants/
GET/PATCH  /api/control-plane/tenants/{id}/
POST       /api/control-plane/tenants/{id}/disable/
POST       /api/control-plane/tenants/{id}/enable/

GET/POST   /api/control-plane/subscriptions/

GET/POST   /api/control-plane/masters/
POST       /api/control-plane/masters/{id}/disable/
POST       /api/control-plane/masters/{id}/reset_password/

GET        /api/control-plane/audit-logs/
```

### System (Public)
```
GET /api/system/health/               # Health check
```

## 🔐 User Types

- **superadmin**: Platform administrator (control plane access)
- **masteradmin**: Tenant administrator
- **companyuser**: Regular tenant user
- **serviceuser**: Service account (future)

## 📝 Example Requests

### Login
```bash
curl -X POST http://localhost:8004/api/auth/master-admin/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

### Create Tenant
```bash
curl -X POST http://localhost:8004/api/control-plane/tenants/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "code": "acme"}'
```

### View Audit Logs
```bash
curl http://localhost:8004/api/control-plane/audit-logs/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🛡️ Security Features

- **JWT Tokens**: 60-min access, 7-day refresh
- **Rate Limiting**: 5/min on login endpoints
- **Account Lockout**: 5 failed attempts → 30-min lock
- **Password Expiry**: 90 days
- **Audit Logging**: All security events tracked

## 🗄️ Database Models

### authentication app
- **User**: email, user_type, company_id, security fields
- **SecurityLog**: event_type, severity, user, metadata
- **ServiceUserSession**: session management

### control_plane app
- **Tenant**: name, code, is_active
- **Subscription**: tenant, plan_name, status, validity
- **MasterAdmin**: user, tenant, is_active

## 🔧 Utilities

### Logging Security Events
```python
from authentication.utils import log_security_event
from authentication.models import SecurityLog

log_security_event(
    request, 
    user, 
    SecurityLog.EventType.LOGIN_SUCCESS,
    SecurityLog.Severity.INFO,
    {'extra': 'data'}
)
```

### Extracting Company/Project ID
```python
from authentication.utils import extract_company_id, extract_project_id

company_id = extract_company_id(request)  # From JWT or X-Company-ID header
project_id = extract_project_id(request)  # From X-Project-ID header or query
```

### Permission Classes
```python
from authentication.permissions import IsSuperAdmin, IsMasterAdmin, IsCompanyUser

class MyView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]
```

## 📊 Test Coverage

```
✓ 10/10 tests passing
✓ Authentication flow
✓ Security features (lockout, expiry)
✓ Permission enforcement
✓ Control plane CRUD
✓ Audit logging
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :8004
# Kill process
kill -9 <PID>
```

### Reset Database (Dev Only)
```bash
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Clear Token Blacklist
```bash
python manage.py shell
>>> from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
>>> OutstandingToken.objects.all().delete()
```

## 📚 Documentation

- **Full Runbook**: `/docs/backend-foundation.md`
- **Implementation Details**: `/backend/IMPLEMENTATION_COMPLETE.md`
- **Task Summary**: `/backend/TASK_COMPLETE.md`
- **Django Admin**: `http://localhost:8004/admin/`

## ✅ Status

- **Implementation**: 100% Complete
- **Tests**: 10/10 Passing
- **Production Ready**: Yes (with env config)
- **Next Steps**: Business module development
