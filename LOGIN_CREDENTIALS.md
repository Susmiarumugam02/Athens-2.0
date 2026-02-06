# Athens 2.0 - Login Credentials

## Test User Accounts

### Superadmin
- **Email:** `super@test.com`
- **Password:** `password123`
- **Access:** Control plane management (tenants, subscriptions, master admins)

### Master Admin
- **Email:** `master@test.com`
- **Password:** `password123`
- **Access:** Company management, projects, settings

### Company User
- **Email:** `company@test.com`
- **Password:** `password123`
- **Access:** Company dashboard, services

### Service User
- **Email:** `service@test.com`
- **Password:** `password123`
- **Access:** Service-specific features

### Admin (Superadmin)
- **Email:** `admin@athens.com`
- **Password:** `admin123`
- **Access:** Full system access

---

## Login URL
- **Frontend:** `http://localhost:5173/login`
- **Backend API:** `http://localhost:8004/api/auth/login/`

---

## Issue Fixed
The "Invalid credentials" error was caused by passwords not being properly hashed in the database. All passwords have been reset and are now working correctly.

---

**Last Updated:** $(date)
