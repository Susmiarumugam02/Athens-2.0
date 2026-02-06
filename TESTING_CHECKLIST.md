# Testing & Deployment Checklist

## 🧪 Pre-Deployment Testing

### Backend Setup
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Migrations applied (`python manage.py migrate`)
- [ ] Superadmin user created (see QUICK_START_SUPERADMIN.md)
- [ ] Backend running on port 8004

### Frontend Setup
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (VITE_API_URL)
- [ ] Frontend running on port 5173
- [ ] No console errors on startup

---

## 🔐 Authentication Testing

### Superadmin Login
- [ ] Login with superadmin credentials
- [ ] Auto-redirects to `/superadmin/dashboard`
- [ ] JWT token stored in localStorage
- [ ] User info displayed in sidebar
- [ ] Logout works correctly

### Master Admin Login
- [ ] Create master admin via Superadmin UI
- [ ] Logout from superadmin
- [ ] Login with master admin credentials
- [ ] Auto-redirects to `/master-admin`
- [ ] Cannot access superadmin routes
- [ ] Redirects to `/permission-denied` if attempted

### Company User Login
- [ ] Login with company user credentials
- [ ] Auto-redirects to `/app`
- [ ] Cannot access admin routes
- [ ] Proper permission denied handling

---

## 📊 Superadmin Dashboard Testing

### Dashboard Page
- [ ] KPI cards display correct counts
- [ ] Total Tenants count is accurate
- [ ] Active Tenants count is accurate
- [ ] Subscription counts are correct
- [ ] Recent activity feed shows last 10 logs
- [ ] Activity feed displays user email, event, IP
- [ ] Loading spinner shows while fetching data
- [ ] Error handling works if backend is down

---

## 🏢 Tenant Management Testing

### List View
- [ ] All tenants displayed in table
- [ ] Columns: Name, Domain, Status, Created Date
- [ ] Status badges show correct colors (green/gray)
- [ ] Table is responsive on mobile

### Create Tenant
- [ ] "Create Tenant" button opens modal
- [ ] Form validation works (required fields)
- [ ] Can enter tenant name
- [ ] Can enter domain
- [ ] "Create" button submits form
- [ ] Success toast appears
- [ ] Modal closes after creation
- [ ] New tenant appears in list
- [ ] Audit log entry created

### Enable/Disable Tenant
- [ ] "Disable" button works for active tenant
- [ ] Status badge changes to gray
- [ ] Success toast appears
- [ ] "Enable" button works for inactive tenant
- [ ] Status badge changes to green
- [ ] Audit log entry created for each action

---

## 👥 Master Admin Management Testing

### List View
- [ ] All master admins displayed
- [ ] Columns: Email, Tenant, Status, Created Date
- [ ] Tenant names displayed (not just IDs)
- [ ] Status badges correct

### Create Master Admin
- [ ] "Create Master Admin" button opens modal
- [ ] Email field validates email format
- [ ] Password field is type="password"
- [ ] Tenant dropdown shows only active tenants
- [ ] Form validation works
- [ ] "Create" button submits form
- [ ] Success toast appears
- [ ] New master admin appears in list
- [ ] Can login with new credentials

### Disable Master Admin
- [ ] "Disable" button shows for active masters
- [ ] Confirmation works
- [ ] Status changes to inactive
- [ ] User cannot login after disable
- [ ] Audit log entry created

### Reset Password
- [ ] "Reset Password" button works
- [ ] Confirmation dialog appears
- [ ] New password displayed in toast (10 seconds)
- [ ] Can copy new password
- [ ] Can login with new password
- [ ] Old password no longer works
- [ ] Audit log entry created

---

## 💳 Subscription Management Testing

### List View
- [ ] All subscriptions displayed
- [ ] Columns: Tenant, Plan, Status, Start Date, End Date
- [ ] Status badges correct (active/inactive/suspended)
- [ ] Dates formatted correctly

### Create Subscription
- [ ] "Create Subscription" button opens modal
- [ ] Tenant dropdown shows active tenants
- [ ] Plan name field accepts text
- [ ] Status dropdown has 3 options
- [ ] Start date defaults to today
- [ ] End date is optional
- [ ] Form validation works
- [ ] "Create" button submits form
- [ ] Success toast appears
- [ ] New subscription appears in list

---

## 📝 Audit Logs Testing

### List View
- [ ] All logs displayed in table
- [ ] Columns: User, Event, Severity, IP, Timestamp
- [ ] Severity badges color-coded
- [ ] Timestamps formatted correctly
- [ ] Shows "System" for system events

### Filters
- [ ] Start date filter works
- [ ] End date filter works
- [ ] Event type filter works
- [ ] "Apply Filters" button triggers reload
- [ ] Filtered results are correct
- [ ] Can clear filters

### Export CSV
- [ ] "Export CSV" button enabled when logs exist
- [ ] Button disabled when no logs
- [ ] CSV file downloads
- [ ] CSV contains all columns
- [ ] CSV data matches table data
- [ ] Filename includes timestamp

---

## ⚙️ Settings Testing

### Superadmin Settings
- [ ] Page loads without errors
- [ ] Placeholder message displayed
- [ ] Navigation works

### Master Admin Settings
- [ ] Page loads (UltraSecureSettings)
- [ ] All existing features work
- [ ] Password change works
- [ ] 2FA works
- [ ] API keys work

---

## 🚨 Error Handling Testing

### Permission Denied
- [ ] Accessing superadmin route as master admin shows 403
- [ ] Accessing master admin route as company user shows 403
- [ ] Permission denied page displays correctly
- [ ] "Go Back" button works
- [ ] "Go Home" button works

### Not Found
- [ ] Invalid route shows 404 page
- [ ] 404 page displays correctly
- [ ] Navigation works from 404

### Network Errors
- [ ] Backend down shows error toast
- [ ] Loading states handle errors gracefully
- [ ] No console errors on network failure

### Validation Errors
- [ ] Empty form shows validation errors
- [ ] Invalid email format rejected
- [ ] Required fields enforced
- [ ] Error messages are user-friendly

---

## 📱 Responsive Design Testing

### Desktop (1920x1080)
- [ ] Sidebar fully visible
- [ ] Tables display all columns
- [ ] Modals centered
- [ ] No horizontal scroll

### Tablet (768x1024)
- [ ] Sidebar collapsible
- [ ] Tables scroll horizontally if needed
- [ ] Modals responsive
- [ ] Touch targets adequate

### Mobile (375x667)
- [ ] Sidebar hidden by default
- [ ] Menu button works
- [ ] Tables scroll horizontally
- [ ] Modals full-width
- [ ] Forms stack vertically

---

## 🔒 Security Testing

### Authentication
- [ ] Cannot access protected routes without login
- [ ] JWT token expires after 60 minutes
- [ ] Refresh token works
- [ ] Logout clears all tokens
- [ ] Session persists on page reload

### Authorization
- [ ] Superadmin can access all routes
- [ ] Master admin blocked from superadmin routes
- [ ] Company user blocked from admin routes
- [ ] API returns 403 for unauthorized requests

### Audit Logging
- [ ] All actions logged (create, disable, reset)
- [ ] Logs include user email
- [ ] Logs include IP address
- [ ] Logs include timestamp
- [ ] Logs include event metadata

---

## 🚀 Deployment Checklist

### Backend
- [ ] SECRET_KEY changed from default
- [ ] DEBUG = False in production
- [ ] ALLOWED_HOSTS configured
- [ ] CORS_ALLOWED_ORIGINS set
- [ ] Database configured (PostgreSQL)
- [ ] Static files collected
- [ ] Migrations applied
- [ ] Superuser created
- [ ] HTTPS enabled
- [ ] HSTS configured
- [ ] SSL redirect enabled

### Frontend
- [ ] VITE_API_URL set to production backend
- [ ] Build created (`npm run build`)
- [ ] Build tested locally (`npm run preview`)
- [ ] No console errors in production build
- [ ] Assets optimized
- [ ] HTTPS enabled

### Infrastructure
- [ ] Backend server running (Gunicorn/uWSGI)
- [ ] Nginx/Apache configured
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Database backups enabled
- [ ] Monitoring enabled
- [ ] Logging configured

---

## ✅ Sign-off

### Functional Testing
- [ ] All features tested
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] User experience smooth

### Security Testing
- [ ] Authentication working
- [ ] Authorization enforced
- [ ] Audit logging complete
- [ ] No security warnings

### Documentation
- [ ] README updated
- [ ] Quick start guide complete
- [ ] API documentation current
- [ ] Deployment guide ready

---

**Tested By:** _______________  
**Date:** _______________  
**Status:** ⬜ Pass | ⬜ Fail | ⬜ Needs Review  

**Notes:**
