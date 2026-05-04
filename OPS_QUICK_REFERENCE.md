# Athens 2.0 - Operations Quick Reference Card

## 🚨 Emergency Response

### Backend Down (502 Error)
```bash
# 1. Check service
sudo systemctl status athens2-backend

# 2. Restart if needed
sudo systemctl restart athens2-backend

# 3. Verify
curl http://localhost:8003/api/system/health/
```

### Port Mismatch
```bash
# Run verification
./scripts/verify-ports.sh

# If mismatch detected, it will show fix command
```

---

## 📊 Health Checks

### Quick Health Check
```bash
curl http://localhost:8003/api/system/health/
# Expected: {"status": "ok"}
```

### Full Verification
```bash
cd /var/www/athens-2.0
./scripts/verify-ports.sh
```

### Service Status
```bash
sudo systemctl status athens2-backend athens2-celery
```

---

## 🔍 Diagnostics

### View Logs
```bash
# Last 50 lines
sudo journalctl -u athens2-backend -n 50 --no-pager

# Follow in real-time
sudo journalctl -u athens2-backend -f

# Errors only
sudo journalctl -u athens2-backend -p err -n 50
```

### Check Ports
```bash
# What's listening
sudo ss -tlnp | grep :8003

# Process details
ps aux | grep gunicorn | grep athens-2.0
```

### Nginx Status
```bash
# Test config
sudo nginx -t

# Check errors
sudo tail -50 /var/log/nginx/error.log | grep 502

# Reload config
sudo systemctl reload nginx
```

---

## 🚀 Deployment

### Pre-Deploy
```bash
cd /var/www/athens-2.0
./scripts/pre-deploy-check.sh
```

### Deploy
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart athens2-backend
```

### Post-Deploy
```bash
./scripts/health-check.sh
./scripts/verify-ports.sh
```

---

## 🔧 Common Fixes

### Restart All Services
```bash
sudo systemctl restart athens2-backend athens2-celery
```

### Clear Cache
```bash
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py clear_cache
```

### Database Connection
```bash
# Test connection
sudo -u postgres psql athens2 -c "SELECT version();"

# Django shell
cd /var/www/athens-2.0/backend
source .venv/bin/activate
python manage.py dbshell
```

---

## 📍 Key Locations

### Code
- Athens 2.0: `/var/www/athens-2.0/`
- Athens 1.0: `/var/www/athens/`

### Configuration
- Service: `/etc/systemd/system/athens2-backend.service`
- Nginx: `/etc/nginx/sites-available/athens2-ssl`

### Logs
- Backend: `sudo journalctl -u athens2-backend`
- Nginx: `/var/log/nginx/error.log`
- Health: `/var/log/athens2-health.log`

### Scripts
- `/var/www/athens-2.0/scripts/verify-ports.sh`
- `/var/www/athens-2.0/scripts/health-check.sh`
- `/var/www/athens-2.0/scripts/pre-deploy-check.sh`

---

## 🔢 Port Assignments

| Service | Port | Location |
|---------|------|----------|
| Athens 1.0 | 8001 | /var/www/athens/ |
| Athens 2.0 | 8003 | /var/www/athens-2.0/ |
| SAP Backend | 8006 | - |

---

## 📞 Escalation

### Level 1: Self-Service
- Run health checks
- Check logs
- Restart services

### Level 2: Documentation
- [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md)
- [scripts/README.md](./scripts/README.md)

### Level 3: Team Lead
- Complex database issues
- Configuration changes
- Code deployment

---

## ⚡ One-Liners

```bash
# Full health check
curl -s http://localhost:8003/api/system/health/ | jq

# Service restart with verification
sudo systemctl restart athens2-backend && sleep 3 && curl http://localhost:8003/api/system/health/

# View recent errors
sudo journalctl -u athens2-backend -p err --since "10 minutes ago"

# Check all Athens services
sudo systemctl status athens* --no-pager

# Nginx reload
sudo nginx -t && sudo systemctl reload nginx

# Port verification
./scripts/verify-ports.sh && echo "✅ All OK"
```

---

**Print this card and keep it handy!**  
**Last Updated:** February 23, 2026
