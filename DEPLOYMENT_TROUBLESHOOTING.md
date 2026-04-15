# Athens 2.0 - Deployment & Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Issue 1: 502 Bad Gateway Error

**Symptoms:**
- API requests return HTTP 502
- Frontend shows connection errors
- Nginx error log shows "Connection refused"

**Root Causes:**
1. Backend service not running
2. Port mismatch between nginx and backend service
3. Backend crashed due to code errors

**Solution Steps:**

```bash
# 1. Check if backend is running
sudo systemctl status athens2-backend

# 2. Check which port backend is using
sudo netstat -tlnp | grep gunicorn
# OR
ps aux | grep gunicorn | grep athens

# 3. Check nginx configuration
sudo grep -r "proxy_pass" /etc/nginx/sites-enabled/athens2*

# 4. If port mismatch found, update nginx
sudo sed -i 's/127.0.0.1:WRONG_PORT/127.0.0.1:CORRECT_PORT/g' /etc/nginx/sites-available/athens2-ssl
sudo nginx -t
sudo systemctl reload nginx

# 5. If backend not running, restart it
sudo systemctl restart athens2-backend
sudo systemctl status athens2-backend
```

**Prevention:**
- Always verify port configuration after deployment
- Use health check endpoint: `curl http://localhost:8003/api/system/health/`

---

### Issue 2: Master Admin Delete Returns 400 Error

**Symptoms:**
- Delete operation fails with 400 status
- Error message shows database constraint violation

**Root Causes:**
1. Self-deletion attempt (user trying to delete own account)
2. Foreign key constraints (user has related records)
3. Database integrity constraints

**Solution:**
- Self-deletion is now blocked with clear error message
- Check error response for specific constraint details
- Related records must be handled before deletion

**Code Fix Applied:**
```python
# /var/www/athens-2.0/backend/control_plane/views.py
def destroy(self, request, *args, **kwargs):
    instance = self.get_object()
    
    # Prevent self-deletion
    if instance.id == request.user.id:
        return fail('CANNOT_DELETE_SELF', 'You cannot delete your own account', status=400)
    
    try:
        instance.delete()
        # ... audit logging
    except Exception as e:
        return fail('DELETE_FAILED', f'Cannot delete master admin: {str(e)}', status=400)
```

---

### Issue 3: Backend Service Port Configuration

**Current Configuration:**
- **Athens 1.0** (Old): Port 8001 at `/var/www/athens/`
- **Athens 2.0** (New): Port 8003 at `/var/www/athens-2.0/`

**Service Files:**
```bash
# Athens 2.0 service
/etc/systemd/system/athens2-backend.service

# Check service configuration
sudo systemctl cat athens2-backend

# Verify port binding
sudo ss -tlnp | grep :8003
```

**Nginx Configuration:**
```bash
# Athens 2.0 nginx configs
/etc/nginx/sites-available/athens2-ssl
/etc/nginx/sites-available/athens2.conf

# Verify proxy configuration
sudo grep "proxy_pass" /etc/nginx/sites-enabled/athens2*
```

---

## 🔧 Deployment Checklist

### Pre-Deployment

- [ ] Backup database
- [ ] Review code changes
- [ ] Run tests locally: `pytest -v`
- [ ] Check for syntax errors: `python -m py_compile file.py`

### Deployment Steps

```bash
# 1. Navigate to project
cd /var/www/athens-2.0/backend

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Pull latest changes (if using git)
git pull origin main

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run migrations
python manage.py migrate

# 6. Collect static files
python manage.py collectstatic --noinput

# 7. Test configuration
python manage.py check --deploy

# 8. Restart services
sudo systemctl restart athens2-backend
sudo systemctl restart athens2-celery  # if using celery

# 9. Verify service status
sudo systemctl status athens2-backend

# 10. Check logs for errors
sudo journalctl -u athens2-backend -n 50 --no-pager

# 11. Test health endpoint
curl http://localhost:8003/api/system/health/
```

### Post-Deployment Verification

- [ ] Health check returns 200: `curl http://localhost:8003/api/system/health/`
- [ ] Login works on frontend
- [ ] API endpoints respond correctly
- [ ] No errors in logs: `sudo journalctl -u athens2-backend -n 20`
- [ ] Nginx access logs show 200 responses: `sudo tail -20 /var/log/nginx/access.log`

---

## 🔍 Diagnostic Commands

### Check Service Status
```bash
# All Athens services
sudo systemctl list-units | grep athens

# Specific service
sudo systemctl status athens2-backend

# Service logs (last 100 lines)
sudo journalctl -u athens2-backend -n 100 --no-pager

# Follow logs in real-time
sudo journalctl -u athens2-backend -f
```

### Check Port Bindings
```bash
# All listening ports
sudo netstat -tlnp

# Specific port
sudo ss -tlnp | grep :8003

# Process using port
sudo lsof -i :8003
```

### Check Nginx
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check error logs
sudo tail -100 /var/log/nginx/error.log

# Check access logs
sudo tail -100 /var/log/nginx/access.log

# Find 502 errors
sudo grep "502" /var/log/nginx/error.log | tail -20
```

### Check Database
```bash
# Connect to database
sudo -u postgres psql athens2

# Check migrations
python manage.py showmigrations

# Check for pending migrations
python manage.py migrate --plan
```

---

## 🛡️ Error Prevention

### 1. Port Configuration Management

**Create port verification script:**
```bash
#!/bin/bash
# /var/www/athens-2.0/scripts/verify-ports.sh

echo "=== Port Configuration Check ==="

# Check backend service port
SERVICE_PORT=$(sudo systemctl cat athens2-backend | grep "bind" | grep -oP ':\K[0-9]+')
echo "Backend service port: $SERVICE_PORT"

# Check nginx configuration
NGINX_PORT=$(sudo grep -r "proxy_pass.*127.0.0.1" /etc/nginx/sites-enabled/athens2* | grep -oP ':\K[0-9]+' | head -1)
echo "Nginx proxy port: $NGINX_PORT"

# Verify they match
if [ "$SERVICE_PORT" == "$NGINX_PORT" ]; then
    echo "✅ Port configuration is correct"
else
    echo "❌ PORT MISMATCH DETECTED!"
    echo "   Backend: $SERVICE_PORT"
    echo "   Nginx: $NGINX_PORT"
    exit 1
fi

# Check if port is listening
if sudo ss -tlnp | grep -q ":$SERVICE_PORT"; then
    echo "✅ Backend is listening on port $SERVICE_PORT"
else
    echo "❌ Backend is NOT listening on port $SERVICE_PORT"
    exit 1
fi
```

### 2. Pre-Deployment Validation

**Create deployment validation script:**
```bash
#!/bin/bash
# /var/www/athens-2.0/scripts/pre-deploy-check.sh

set -e

echo "=== Pre-Deployment Validation ==="

cd /var/www/athens-2.0/backend
source .venv/bin/activate

# Check Python syntax
echo "Checking Python syntax..."
find . -name "*.py" -not -path "./.venv/*" -not -path "./migrations/*" | xargs python -m py_compile

# Run tests
echo "Running tests..."
pytest -v --tb=short

# Check migrations
echo "Checking migrations..."
python manage.py migrate --check

# Check Django configuration
echo "Checking Django configuration..."
python manage.py check --deploy

echo "✅ All pre-deployment checks passed"
```

### 3. Automated Health Monitoring

**Create health check script:**
```bash
#!/bin/bash
# /var/www/athens-2.0/scripts/health-check.sh

HEALTH_URL="http://localhost:8003/api/system/health/"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$response" == "200" ]; then
    echo "✅ Backend is healthy"
    exit 0
else
    echo "❌ Backend health check failed (HTTP $response)"
    echo "Checking service status..."
    sudo systemctl status athens2-backend --no-pager
    exit 1
fi
```

### 4. Setup Cron Job for Monitoring

```bash
# Add to crontab
# */5 * * * * /var/www/athens-2.0/scripts/health-check.sh >> /var/log/athens2-health.log 2>&1
```

---

## 📝 Configuration Files Reference

### Backend Service
**Location:** `/etc/systemd/system/athens2-backend.service`

**Expected Configuration:**
```ini
[Unit]
Description=Athens 2.0 Backend (Django/Gunicorn)
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/athens-2.0/backend
Environment="PATH=/var/www/athens-2.0/backend/.venv/bin"
ExecStart=/var/www/athens-2.0/backend/.venv/bin/gunicorn athens2.wsgi:application \
    --bind 127.0.0.1:8003 \
    --workers 4 \
    --worker-tmp-dir /dev/shm \
    --timeout 120 \
    --graceful-timeout 30 \
    --access-logfile - \
    --error-logfile -
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=30
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Nginx Configuration
**Location:** `/etc/nginx/sites-available/athens2-ssl`

**Key Settings:**
```nginx
server {
    listen 443 ssl http2;
    server_name ai-athens.cloud www.ai-athens.cloud;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8003;  # MUST MATCH BACKEND PORT
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🚀 Quick Recovery Commands

### Backend Crashed
```bash
sudo systemctl restart athens2-backend
sudo journalctl -u athens2-backend -n 50 --no-pager
curl http://localhost:8003/api/system/health/
```

### Port Mismatch
```bash
# Find backend port
ps aux | grep gunicorn | grep athens-2.0

# Update nginx to match
sudo sed -i 's/127.0.0.1:OLD_PORT/127.0.0.1:NEW_PORT/g' /etc/nginx/sites-available/athens2-ssl
sudo nginx -t && sudo systemctl reload nginx
```

### Database Connection Issues
```bash
# Check PostgreSQL
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -c "SELECT version();"

# Check Django database settings
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py dbshell
```

---

## 📞 Emergency Contacts

**Log Locations:**
- Backend: `sudo journalctl -u athens2-backend`
- Nginx: `/var/log/nginx/error.log`
- PostgreSQL: `/var/log/postgresql/`

**Service Commands:**
```bash
# Restart all Athens 2.0 services
sudo systemctl restart athens2-backend athens2-celery

# Check all service statuses
sudo systemctl status athens2-backend athens2-celery --no-pager
```

---

**Last Updated:** February 23, 2026  
**Maintainer:** DevOps Team
