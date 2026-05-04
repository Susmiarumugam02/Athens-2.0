# Athens 2.0 - Deployment Scripts

## Available Scripts

### 1. verify-ports.sh
**Purpose:** Verify port configuration consistency between backend service and nginx

**Usage:**
```bash
./scripts/verify-ports.sh
```

**Checks:**
- Backend service port configuration
- Nginx proxy port configuration
- Port consistency
- Backend listening status
- Health endpoint response

---

### 2. health-check.sh
**Purpose:** Monitor backend health and auto-restart if needed

**Usage:**
```bash
./scripts/health-check.sh
```

**Setup Cron Job (every 5 minutes):**
```bash
# Add to crontab
crontab -e

# Add this line:
*/5 * * * * /var/www/athens-2.0/scripts/health-check.sh >> /var/log/athens2-health.log 2>&1
```

---

### 3. pre-deploy-check.sh
**Purpose:** Validate code before deployment

**Usage:**
```bash
./scripts/pre-deploy-check.sh
```

**Checks:**
- Python syntax errors
- Django configuration
- Pending migrations
- Test suite
- Port configuration

---

## Quick Commands

### Run All Checks
```bash
cd /var/www/athens-2.0
./scripts/verify-ports.sh && ./scripts/health-check.sh
```

### Pre-Deployment
```bash
cd /var/www/athens-2.0
./scripts/pre-deploy-check.sh
```

### Post-Deployment
```bash
sudo systemctl restart athens2-backend
sleep 3
./scripts/health-check.sh
```

---

## Troubleshooting

### Port Mismatch Detected
```bash
# Auto-fix (updates nginx to match backend)
SERVICE_PORT=$(sudo systemctl cat athens2-backend | grep "bind" | grep -oP ':\K[0-9]+')
sudo sed -i "s/127.0.0.1:[0-9]\+/127.0.0.1:$SERVICE_PORT/g" /etc/nginx/sites-available/athens2-ssl
sudo nginx -t && sudo systemctl reload nginx
```

### Health Check Fails
```bash
# Check logs
sudo journalctl -u athens2-backend -n 50 --no-pager

# Restart service
sudo systemctl restart athens2-backend

# Verify
curl http://localhost:8003/api/system/health/
```

---

## Maintenance

### View Health Check Log
```bash
tail -f /var/log/athens2-health.log
```

### Clear Old Logs
```bash
sudo truncate -s 0 /var/log/athens2-health.log
```

---

**Last Updated:** February 23, 2026
