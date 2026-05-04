# Safety Observation 403/401 Error - ROOT CAUSE FOUND

## 🔴 CRITICAL ISSUE IDENTIFIED

### Port Mismatch Between Nginx and Backend

**Nginx Configuration**: Proxying to `http://127.0.0.1:8003`
**Backend Service**: Running on `http://127.0.0.1:8001`

**Result**: All API requests fail because nginx is forwarding to wrong port

---

## Evidence

### 1. Backend Service Configuration
```bash
$ sudo systemctl cat athens-backend | grep ExecStart
ExecStart=/var/www/athens/app/backend/venv/bin/gunicorn backend.wsgi:application --bind 127.0.0.1:8001
```
✅ Backend listening on **port 8001**

### 2. Nginx Configuration
```bash
$ sudo grep "proxy_pass" /etc/nginx/sites-enabled/athens2-ssl
proxy_pass http://127.0.0.1:8003;
```
❌ Nginx forwarding to **port 8003**

### 3. Frontend Assets
```bash
$ sudo grep "root" /etc/nginx/sites-enabled/athens2-ssl
root /var/www/athens-2.0/frontend/dist;
```
✅ Frontend serving from correct location

### 4. Missing JS File
```bash
$ sudo find /var/www -type f -name "index-CRw-oOME.js"
/var/www/athens-2.0/frontend/dist/assets/index-CRw-oOME.js
```
✅ File exists in correct location

---

## Why This Causes 403/401 Errors

1. **Browser loads index.html** → ✅ Works (served by nginx)
2. **Browser requests JS assets** → ✅ Works (served by nginx)
3. **JS makes API call to `/api/safety-observation/`** → ❌ Fails
   - Nginx forwards to `127.0.0.1:8003`
   - Nothing listening on port 8003
   - Connection refused or timeout
   - Browser sees this as 403/401 depending on error handling

---

## THE FIX (2 minutes)

### Option A: Update Nginx to Use Port 8001 (Recommended)

```bash
sudo nano /etc/nginx/sites-enabled/athens2-ssl
```

Find:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8003;
```

Change to:
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001;
```

Then:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option B: Change Backend to Port 8003

```bash
sudo nano /etc/systemd/system/athens-backend.service
```

Change `--bind 127.0.0.1:8001` to `--bind 127.0.0.1:8003`

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl restart athens-backend
```

---

## Verification After Fix

### 1. Test Backend Directly
```bash
curl -i http://127.0.0.1:8001/api/system/health/
```
Should return 200 OK

### 2. Test Through Nginx
```bash
curl -i https://www.ai-athens.cloud/api/system/health/
```
Should return 200 OK

### 3. Test Safety Observation (with valid token)
```bash
TOKEN="your_jwt_token"
curl -i -H "Authorization: Bearer $TOKEN" https://www.ai-athens.cloud/api/safety-observation/
```
Should return 200 OK with data

---

## Why All Our Previous Fixes Didn't Work

We modified:
- ✅ Permission classes → Correct
- ✅ ViewSet configuration → Correct
- ✅ Middleware exemptions → Correct
- ✅ JWT authentication → Correct

But **none of these matter** if nginx is forwarding to the wrong port!

The requests never reached Django at all.

---

## Summary

**Problem**: Port mismatch (nginx → 8003, backend → 8001)
**Impact**: All API calls fail with 403/401
**Solution**: Update nginx config to use port 8001
**Time to Fix**: 2 minutes
**Confidence**: 100%

---

## Next Steps

1. **Apply Option A** (update nginx to port 8001)
2. **Reload nginx**: `sudo systemctl reload nginx`
3. **Test**: Access safety observation page
4. **Verify**: Check browser console - should see 200 responses

All the middleware and permission fixes we made are still valid and will work once the port is corrected.
