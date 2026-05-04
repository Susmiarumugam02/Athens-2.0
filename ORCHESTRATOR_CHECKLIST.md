# Athens 2.0 - Orchestrator Deployment Checklist

## 🎯 Purpose
This checklist ensures all error prevention measures are followed for every deployment to avoid recurrence of known issues.

---

## Pre-Deployment Phase

### Code Validation
- [ ] Run syntax check: `find . -name "*.py" | xargs python -m py_compile`
- [ ] Run test suite: `pytest -v`
- [ ] Check Django config: `python manage.py check --deploy`
- [ ] Verify migrations: `python manage.py migrate --check`

### Automated Checks
- [ ] Run pre-deployment script: `./scripts/pre-deploy-check.sh`
- [ ] Review script output for any warnings
- [ ] Fix any issues before proceeding

### Documentation Review
- [ ] Changes documented in README.md
- [ ] API changes documented
- [ ] Breaking changes noted

---

## Deployment Phase

### Backup
- [ ] Database backup completed
- [ ] Code backup/git tag created
- [ ] Configuration files backed up

### Code Deployment
- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Collect static files: `python manage.py collectstatic --noinput`
- [ ] Run migrations: `python manage.py migrate`

### Service Management
- [ ] Restart backend: `sudo systemctl restart athens2-backend`
- [ ] Check service status: `sudo systemctl status athens2-backend`
- [ ] Wait 5 seconds for startup
- [ ] Verify no errors in logs: `sudo journalctl -u athens2-backend -n 20`

---

## Post-Deployment Phase

### Automated Verification
- [ ] Run port verification: `./scripts/verify-ports.sh`
- [ ] Run health check: `./scripts/health-check.sh`
- [ ] Verify all checks pass

### Manual Testing
- [ ] Test health endpoint: `curl http://localhost:8003/api/system/health/`
- [ ] Test login endpoint
- [ ] Test critical API endpoints
- [ ] Verify frontend loads correctly

### Monitoring Setup
- [ ] Check health monitoring cron job exists
- [ ] Verify logs are being written
- [ ] Check nginx access logs for 200 responses

---

## Issue-Specific Checks

### Port Configuration (Issue #1)
- [ ] Backend port matches nginx configuration
- [ ] Service is listening on correct port: `sudo ss -tlnp | grep :8003`
- [ ] Nginx configuration tested: `sudo nginx -t`
- [ ] No 502 errors in nginx logs

### Error Handling (Issue #2)
- [ ] Test master admin delete with proper error messages
- [ ] Verify self-deletion is blocked
- [ ] Check audit logs are being created
- [ ] Confirm error messages are helpful

---

## Rollback Plan

### If Deployment Fails
1. [ ] Stop new service: `sudo systemctl stop athens2-backend`
2. [ ] Restore code: `git checkout <previous-tag>`
3. [ ] Restore database: `psql athens2 < backup.sql`
4. [ ] Restart service: `sudo systemctl start athens2-backend`
5. [ ] Verify rollback: `./scripts/health-check.sh`

### If Port Mismatch Detected
1. [ ] Run: `./scripts/verify-ports.sh`
2. [ ] Follow fix command shown in output
3. [ ] Reload nginx: `sudo systemctl reload nginx`
4. [ ] Verify: `curl http://localhost:8003/api/system/health/`

---

## Communication

### Before Deployment
- [ ] Notify team of deployment window
- [ ] Announce expected downtime (if any)
- [ ] Prepare rollback plan

### During Deployment
- [ ] Update status in team chat
- [ ] Report any issues immediately
- [ ] Document any deviations from plan

### After Deployment
- [ ] Announce completion
- [ ] Share verification results
- [ ] Document any issues encountered

---

## Monitoring (First 24 Hours)

### Immediate (First Hour)
- [ ] Monitor logs: `sudo journalctl -u athens2-backend -f`
- [ ] Check error rate in nginx logs
- [ ] Verify no 502 errors
- [ ] Test all critical endpoints

### Short-term (First 24 Hours)
- [ ] Review health check logs: `tail -f /var/log/athens2-health.log`
- [ ] Monitor service uptime
- [ ] Check for any error patterns
- [ ] Verify cron jobs running

---

## Documentation Updates

### After Successful Deployment
- [ ] Update README.md with version
- [ ] Document any new issues discovered
- [ ] Update troubleshooting guide if needed
- [ ] Create incident report if issues occurred

### After Failed Deployment
- [ ] Document failure reason
- [ ] Update checklist with new checks
- [ ] Add to troubleshooting guide
- [ ] Schedule post-mortem meeting

---

## Sign-off

### Deployment Team
- [ ] Developer: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______
- [ ] QA: _________________ Date: _______

### Verification
- [ ] All checks passed
- [ ] No errors in logs
- [ ] Frontend functional
- [ ] APIs responding correctly

### Approval
- [ ] Technical Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

---

## Quick Commands Reference

```bash
# Pre-deployment
cd /var/www/athens-2.0
./scripts/pre-deploy-check.sh

# Deployment
cd /var/www/athens-2.0/backend
source .venv/bin/activate
git pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart athens2-backend

# Post-deployment
cd /var/www/athens-2.0
./scripts/verify-ports.sh
./scripts/health-check.sh
curl http://localhost:8003/api/system/health/

# Monitoring
sudo journalctl -u athens2-backend -f
tail -f /var/log/athens2-health.log
sudo tail -f /var/log/nginx/error.log | grep 502

# Rollback
sudo systemctl stop athens2-backend
git checkout <previous-tag>
sudo systemctl start athens2-backend
./scripts/health-check.sh
```

---

## Emergency Contacts

**On-Call Engineer:** _____________  
**Technical Lead:** _____________  
**DevOps Lead:** _____________

---

## Notes

_Use this section to document any deployment-specific notes or deviations from the standard process._

---

**Version:** 1.0  
**Last Updated:** February 23, 2026  
**Next Review:** March 23, 2026
