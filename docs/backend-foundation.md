# Athens 2.0 Backend Foundation Runbook

## Overview
Athens 2.0 backend foundation with Django + DRF + JWT authentication, multi-tenant control plane, and comprehensive security logging.

## Architecture

### User Types
- **Superadmin**: Platform administrator (control plane access)
- **Master Admin**: Tenant administrator
- **Company User**: Regular tenant user
- **Service User**: Service-specific user (future)

### Key Features
- JWT authentication with refresh token rotation
- Account lockout after failed login attempts
- Password expiry tracking
- Comprehensive security event logging
- Multi-tenant architecture with company scoping
- Control plane for tenant/subscription management

## Setup

### 1. Install Dependencies

```bash
cd /var/www/athens-2.0/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Migrations

```bash
python manage.py migrate
```

### 3. Create Superadmin

```bash
python manage.py createsuperuser
# Email: admin@athens.com
# Password: (choose secure password)
```

The superuser will automatically be created with `user_type=superadmin`.

### 4. Run Development Server

```bash
python manage.py runserver 0.0.0.0:8004
```

## API Endpoints

### Authentication

#### Master Admin Login
```bash
curl -X POST http://localhost:8004/api/auth/master-admin/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "master@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "master@example.com",
    "user_type": "masteradmin",
    "is_master_admin": true,
    "company_id": 1
  },
  "password_expired": false
}
```

#### Company User Login
```bash
curl -X POST http://localhost:8004/api/auth/company/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "password": "password123"
  }'
```

#### Refresh Token
```bash
curl -X POST http://localhost:8004/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }'
```

#### Logout
```bash
curl -X POST http://localhost:8004/api/auth/logout/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }'
```

### Control Plane (Superadmin Only)

#### List Tenants
```bash
curl -X GET http://localhost:8004/api/control-plane/tenants/ \
  -H "Authorization: Bearer <superadmin_token>"
```

#### Create Tenant
```bash
curl -X POST http://localhost:8004/api/control-plane/tenants/ \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "code": "acme-corp"
  }'
```

#### Disable Tenant
```bash
curl -X POST http://localhost:8004/api/control-plane/tenants/1/disable/ \
  -H "Authorization: Bearer <superadmin_token>"
```

#### Create Subscription
```bash
curl -X POST http://localhost:8004/api/control-plane/subscriptions/ \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": 1,
    "plan_name": "Enterprise",
    "status": "active",
    "valid_from": "2024-01-01T00:00:00Z",
    "valid_until": "2025-01-01T00:00:00Z"
  }'
```

#### Create Master Admin
```bash
curl -X POST http://localhost:8004/api/control-plane/masters/ \
  -H "Authorization: Bearer <superadmin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "master@acme.com",
    "user_password": "SecurePass123!",
    "tenant": 1
  }'
```

#### View Audit Logs
```bash
# All logs
curl -X GET http://localhost:8004/api/control-plane/audit-logs/ \
  -H "Authorization: Bearer <superadmin_token>"

# Filtered by date range
curl -X GET "http://localhost:8004/api/control-plane/audit-logs/?start_date=2024-01-01&end_date=2024-12-31" \
  -H "Authorization: Bearer <superadmin_token>"

# Filtered by company
curl -X GET "http://localhost:8004/api/control-plane/audit-logs/?company_id=1" \
  -H "Authorization: Bearer <superadmin_token>"

# Filtered by event type
curl -X GET "http://localhost:8004/api/control-plane/audit-logs/?event_type=login_success" \
  -H "Authorization: Bearer <superadmin_token>"
```

### System

#### Health Check
```bash
curl http://localhost:8004/api/system/health/
```

Response:
```json
{"status": "ok"}
```

## Testing

### Run All Tests
```bash
pytest
```

### Run Specific Test File
```bash
pytest authentication/tests.py
pytest control_plane/tests.py
```

### Run with Coverage
```bash
pytest --cov=authentication --cov=control_plane
```

## Security Features

### Account Lockout
- After 5 failed login attempts, account is locked for 30 minutes
- Lockout is logged in SecurityLog with severity=CRITICAL

### Password Expiry
- Passwords expire after 90 days
- `password_expired` flag returned in login response
- Frontend should prompt for password change

### Security Logging
All security events are logged:
- Login success/failure
- Account lockout
- Password changes
- Tenant operations
- Master admin operations

### JWT Configuration
- Access token lifetime: 60 minutes
- Refresh token lifetime: 7 days
- Refresh token rotation enabled
- Blacklist after rotation enabled

## Database Models

### User
- email (unique)
- user_type (superadmin/masteradmin/companyuser/serviceuser)
- company_id (nullable, for tenant scoping)
- requires_2fa, totp_secret
- password_changed_at
- failed_login_count, locked_until

### Tenant
- name, code (slug)
- is_active
- created_by (User FK)

### Subscription
- tenant (FK)
- plan_name, status
- valid_from, valid_until

### MasterAdmin
- user (OneToOne)
- tenant (FK)
- is_active

### SecurityLog
- event_type, severity
- user, company_id
- ip_address, user_agent, device_fingerprint
- metadata (JSON)

## Admin Interface

Access Django admin at: http://localhost:8004/admin/

All models are registered and can be managed through the admin interface.

## Environment Variables

Create `.env` file:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=*
DATABASE_URL=sqlite:///db.sqlite3
```

## Production Considerations

1. **Database**: Switch from SQLite to PostgreSQL
2. **Secret Key**: Use environment variable
3. **HTTPS**: Enable HTTPS and set SECURE_SSL_REDIRECT=True
4. **CORS**: Restrict CORS_ALLOWED_ORIGINS to production domains
5. **Rate Limiting**: Adjust throttle rates based on load
6. **Logging**: Configure proper logging to files/services
7. **Monitoring**: Add APM and error tracking
8. **Backups**: Implement database backup strategy

## Troubleshooting

### Migration Issues
```bash
# Reset database (development only!)
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Token Issues
```bash
# Clear token blacklist
python manage.py shell
>>> from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
>>> OutstandingToken.objects.all().delete()
```

### Permission Denied
- Ensure user has correct `user_type`
- Check JWT token is valid and not expired
- Verify Authorization header format: `Bearer <token>`

## Next Steps

1. Add 2FA/TOTP implementation
2. Implement project-level scoping
3. Add business modules (PTW, Incidents, etc.)
4. Implement WebSocket support for real-time features
5. Add email notifications
6. Implement file upload/storage
7. Add API rate limiting per tenant
8. Implement audit log retention policies
