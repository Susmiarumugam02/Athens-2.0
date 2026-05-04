# ATHENS 2.0 - ARCHITECTURE EXTRACTION REPORT
**Date:** February 20, 2025  
**Status:** FACTUAL EXTRACTION ONLY - NO REFACTORING  
**Repository:** /var/www/athens-2.0

---

## 1) FRONTEND ARCHITECTURE MAP

### Structure:
```
frontend/
├── src/
│   ├── main.tsx                    # Entry point (React 19 + Vite)
│   ├── App.tsx                     # Minimal wrapper (auth init only)
│   ├── lib/
│   │   ├── router.tsx              # React Router v7 - route definitions
│   │   ├── api.ts                  # Axios client + interceptors
│   │   ├── tokenManager.ts         # JWT token storage/refresh
│   │   └── utils.ts                # Utilities
│   ├── store/
│   │   ├── authStore.ts            # Zustand auth state (persisted)
│   │   ├── serviceUserStore.ts     # Service user sessions
│   │   ├── projectContext.ts       # Project context
│   │   └── themeStore.ts           # Theme state
│   ├── layouts/
│   │   ├── SuperadminLayout.tsx    # Fixed header + sidebar
│   │   ├── MasterAdminLayout.tsx   # Fixed header + sidebar
│   │   └── CompanyLayout.tsx       # Fixed header + sidebar
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SapSidebar.tsx      # 280px fixed sidebar
│   │   │   ├── menuConfig.ts       # Menu definitions by role
│   │   │   └── PageContainer.tsx   # Content wrapper
│   │   ├── ui/                     # SAP design system components
│   │   ├── ui-legacy/              # Old Athens components (unused)
│   │   ├── auth/                   # Auth guards & wrappers
│   │   ├── modals/                 # Modal components
│   │   └── [domain]/               # Feature components
│   ├── pages/
│   │   ├── auth/                   # Login, 2FA
│   │   ├── superadmin/             # Superadmin pages
│   │   ├── masteradmin/            # MasterAdmin pages
│   │   ├── company/                # Company user pages
│   │   ├── ergon/                  # ERGON category pages
│   │   ├── workforce/              # Workforce category pages
│   │   └── services/               # External service pages
│   ├── services/                   # API service layer
│   ├── styles/
│   │   └── sap/                    # SAP design system CSS
│   └── types/                      # TypeScript types
├── vite.config.ts                  # Vite config (aliases, proxy)
├── tailwind.config.js              # Tailwind + SAP theme
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

### Entry/Routes/Layout:
**Entry Flow:**
```
main.tsx 
  → BrowserRouter 
  → QueryClientProvider (React Query)
  → AppWrapper (auth init)
  → AppRouter (lib/router.tsx)
```

**Routing Structure:**
- **Library:** react-router-dom v7.13.0
- **Pattern:** Nested routes with Outlet
- **Route Groups:**
  - `/login`, `/2fa` - Public routes
  - `/superadmin/*` - SuperadminLayout wrapper
  - `/master-admin/*` - MasterAdminLayout wrapper
  - `/app/*` - CompanyLayout wrapper (ERGON, Workforce)
  - `/services/*` - Service-specific routes
  - `/employee`, `/jobs` - Public/mobile routes

**Layout System:**
- **Pattern:** Fixed header (64px) + Fixed sidebar (280px) + Scrollable content
- **Sidebar:** SapSidebar component (persistent, auto-close on mobile)
- **Header:** Sticky, gradient background, user profile, notifications
- **Content:** Independent scroll container with max-width 1600px

### State/API/Auth:
**State Management:**
- **Zustand** (v5.0.11) with persistence
- **Stores:**
  - `authStore.ts` - User, tokens, security flags (localStorage + sessionStorage)
  - `serviceUserStore.ts` - Service user sessions (sessionStorage)
  - `projectContext.ts` - Project selection
  - `themeStore.ts` - Dark/light mode

**API Layer:**
- **Client:** Axios (v1.13.4)
- **Base URL:** `import.meta.env.VITE_API_URL` (empty string for same-origin in prod)
- **Auth:** JWT Bearer tokens in Authorization header
- **Service Users:** Session key as query parameter (`?session_key=...`)
- **Interceptors:**
  - Request: Add auth token (exclude login endpoints)
  - Response: Auto-refresh on 401, logout on refresh failure
- **Token Storage:** 
  - Access token: sessionStorage `_at` or localStorage `_at`
  - Refresh token: localStorage via tokenManager
- **Error Handling:** Toast notifications (react-hot-toast)

**Auth Flow:**
```
Login → POST /api/auth/login/
  ↓
Check 2FA required → Navigate to /2fa
  ↓
Store tokens (setTokens) → localStorage + sessionStorage
  ↓
Update authStore (user, isAuthenticated)
  ↓
Redirect based on user_type:
    - superadmin → /superadmin/dashboard
    - masteradmin → /master-admin
    - companyuser → /app
    - serviceuser → /service
```

**Token Refresh:**
```
API call → 401 response
  ↓
Check refreshToken exists
  ↓
POST /api/auth/token/refresh/ {refresh}
  ↓
Success: Update access token, retry original request
  ↓
Failure: Clear tokens, redirect to /login
```

### Build/Lint:
- **Build Tool:** Vite v7.2.4
- **TypeScript:** v5.9.3 (strict mode)
- **Linter:** ESLint v9.39.1 (react-hooks, react-refresh plugins)
- **Formatter:** None detected (no Prettier config)
- **CSS:** Tailwind v3.4.17 + PostCSS
- **Scripts:**
  - `npm run dev` - Dev server (port 5173)
  - `npm run build` - Production build
  - `npm run lint` - ESLint check
  - `npm run ui:check` - UI pattern validation

### Evidence (file paths):
- Entry: `/var/www/athens-2.0/frontend/src/main.tsx`
- Router: `/var/www/athens-2.0/frontend/src/lib/router.tsx`
- API: `/var/www/athens-2.0/frontend/src/lib/api.ts`
- Auth Store: `/var/www/athens-2.0/frontend/src/store/authStore.ts`
- Layouts: `/var/www/athens-2.0/frontend/src/layouts/`
- Menu Config: `/var/www/athens-2.0/frontend/src/components/layout/menuConfig.ts`
- Vite Config: `/var/www/athens-2.0/frontend/vite.config.ts`
- Package: `/var/www/athens-2.0/frontend/package.json`

---

## 2) BACKEND ARCHITECTURE MAP

### Structure:
```
backend/
├── athens2/                        # Django project root
│   ├── settings.py                 # Single settings file (no split)
│   ├── urls.py                     # Root URL config
│   ├── wsgi.py                     # WSGI entry
│   └── asgi.py                     # ASGI entry
├── authentication/                 # Auth app (User, SecurityLog)
│   ├── models.py                   # User, Project, SecurityLog, ServiceUserSession
│   ├── views.py                    # Login, logout, token refresh
│   ├── urls.py                     # /api/auth/*
│   ├── permissions.py              # Permission classes
│   ├── company_settings.py         # Company CRUD endpoints
│   └── masteradmin/                # MasterAdmin sub-module
│       ├── urls.py
│       └── views.py
├── control_plane/                  # SaaS management
│   ├── models.py                   # Tenant, Subscription, Service, TenantService
│   ├── views.py                    # Tenant/Subscription ViewSets
│   ├── urls.py                     # /api/control-plane/*
│   ├── serializers.py
│   └── project_module_views.py     # Project module management
├── system/                         # System utilities
│   ├── models.py                   # Service definitions
│   ├── views.py                    # Health check, service management
│   └── urls.py                     # /api/system/*
├── projects/                       # Project management
│   ├── models.py                   # Project, ProjectMember
│   ├── views.py                    # Project CRUD
│   └── urls.py                     # /api/projects/*
├── workforce/                      # HR & Workforce module
│   ├── models.py                   # Employee, Attendance, Payroll, etc.
│   ├── views.py                    # Workforce ViewSets
│   └── urls.py                     # /api/workforce/*
├── ergon/                          # Operations & Finance module
│   ├── models.py                   # Tasks, Planner, Followups, etc.
│   ├── views.py                    # ERGON ViewSets
│   └── urls.py                     # /api/ergon/*
├── superadmin/                     # Superadmin module
│   ├── models/                     # Superadmin models
│   ├── api/                        # API views
│   └── urls.py                     # /api/superadmin/*
├── [other apps]/                   # PTW, Incident, Safety, etc.
├── manage.py                       # Django CLI
├── requirements.txt                # Python dependencies
└── .env                            # Environment variables
```

### Apps/URLs/Auth/Tenancy:
**Installed Apps (settings.py):**
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
    'authentication',      # Core auth
    'control_plane',       # SaaS management
    'system',              # System utilities
    'projects',            # Project management
    'superadmin',          # Superadmin module
    'workforce',           # HR & Workforce
    'ergon',               # Operations & Finance
]
```

**URL Structure:**
```
/api/auth/                  → authentication.urls
  ├── login/                → unified_login (POST)
  ├── token/refresh/        → token_refresh (POST)
  ├── logout/               → logout (POST)
  ├── users/                → list_users (GET)
  ├── masteradmin/          → masteradmin sub-module
  └── ...

/api/control-plane/         → control_plane.urls
  ├── tenants/              → TenantViewSet (CRUD)
  ├── subscriptions/        → SubscriptionViewSet (CRUD)
  ├── masters/              → MasterAdminViewSet (CRUD)
  ├── audit-logs/           → AuditLogViewSet (Read-only)
  └── tenant-services/      → TenantServiceViewSet (Read-only)

/api/system/                → system.urls
  ├── health/               → Health check
  ├── services/             → List services
  └── tenant-services/      → Tenant service management

/api/projects/              → projects.urls
  ├── /                     → Project CRUD
  └── {id}/members/         → Project members

/api/workforce/             → workforce.urls
  ├── employees/            → EmployeeViewSet
  ├── attendance/           → AttendanceViewSet
  ├── payroll/              → PayrollViewSet
  └── ...

/api/ergon/                 → ergon.urls
  ├── tasks/                → TaskViewSet
  ├── planner/              → PlannerViewSet
  └── ...

/api/superadmin/            → superadmin.urls
  └── ...

/admin/                     → Django admin
```

**Authentication:**
- **Framework:** Django REST Framework + SimpleJWT
- **User Model:** `authentication.User` (AbstractBaseUser + PermissionsMixin)
- **User Types:** superadmin, masteradmin, companyuser, serviceuser
- **JWT Config:**
  - Access token: 60 minutes
  - Refresh token: 7 days
  - Rotation: Enabled
  - Blacklist: Enabled after rotation
- **Login Endpoint:** `/api/auth/login/` (unified for all user types)
- **Token Refresh:** `/api/auth/token/refresh/`
- **Logout:** `/api/auth/logout/` (blacklist refresh token)

**Multi-Tenant Handling:**
- **Tenant Model:** `control_plane.Tenant` (name, code, is_active)
- **User Scoping:**
  - `company_id` (integer) - Legacy field
  - `athens_tenant_id` (UUID) - Legacy field (DEPRECATED)
  - `tenant` (FK to Tenant) - New field for MasterAdmin scoping
- **Request Scoping:**
  - JWT token contains user info
  - Views filter by `request.user.company_id` or `request.user.tenant`
  - No middleware for automatic tenant extraction
- **Service Users:**
  - Session-based auth (session_key as query param)
  - `ServiceUserSession` model tracks sessions
  - No JWT tokens for service users

### DB/Migrations/Services:
**Database:**
- **Engine:** PostgreSQL (required)
- **Config:** Environment variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
- **Connection:** Single database (no multi-db routing)

**Key Models:**
- **authentication.User** - Custom user model (email-based)
- **authentication.Project** - Business projects
- **authentication.SecurityLog** - Security events
- **control_plane.Tenant** - Tenant companies
- **control_plane.Subscription** - Subscription plans
- **control_plane.Service** - External services (HR, Finance, CRM, etc.)
- **control_plane.TenantService** - Tenant-service links with tier
- **workforce.*** - 20+ models (Employee, Attendance, Payroll, etc.)
- **ergon.*** - Task, Planner, Followup models

**Migrations:**
- Standard Django migrations per app
- No custom migration strategy detected
- Migration files in each app's `migrations/` folder

**Business Logic Placement:**
- **Views:** Most logic in ViewSet classes (DRF pattern)
- **Serializers:** Validation and transformation logic
- **Models:** Basic model methods and properties
- **Services:** Some apps have `services.py` (e.g., workforce, ergon)
- **No clear service layer pattern** - logic mixed in views/serializers

**Background Jobs:**
- No Celery/RQ detected in requirements.txt
- No background task infrastructure found

**Logging/Audit:**
- **SecurityLog model** - Tracks auth events (login, logout, password change, etc.)
- **AthensAuditLog model** - Tracks control plane actions
- **Audit endpoints:** `/api/control-plane/audit-logs/`
- **No centralized logging middleware** - manual logging in views

### Deployment/Testing:
**Deployment:**
- **WSGI:** Gunicorn (not in requirements.txt, likely installed separately)
- **Static Files:** Collected to `backend/staticfiles/`
- **Media Files:** Stored in `backend/media/`
- **Environment:** Production (DEBUG=False, ALLOWED_HOSTS set)
- **Domain:** ai-athens.cloud
- **No Docker config found**
- **Deployment script:** `/var/www/athens-2.0/deploy.sh`

**Testing:**
- **Framework:** pytest + pytest-django
- **Config:** `backend/pytest.ini`
- **Test Files:** Found in `authentication/tests/`, `control_plane/tests/`
- **Coverage:** 10/10 tests passing (per README)
- **Test Scripts:** 
  - `automated_api_tests.sh`
  - `manual_test_checklist.sh`
  - `smoke_test_services.sh`

### Evidence (file paths):
- Settings: `/var/www/athens-2.0/backend/athens2/settings.py`
- Root URLs: `/var/www/athens-2.0/backend/athens2/urls.py`
- User Model: `/var/www/athens-2.0/backend/authentication/models.py`
- Tenant Model: `/var/www/athens-2.0/backend/control_plane/models.py`
- Auth URLs: `/var/www/athens-2.0/backend/authentication/urls.py`
- Control Plane URLs: `/var/www/athens-2.0/backend/control_plane/urls.py`
- Requirements: `/var/www/athens-2.0/backend/requirements.txt`
- Pytest Config: `/var/www/athens-2.0/backend/pytest.ini`

---

## 3) INTEGRATION MAP

### Environments:
**Development:**
- Frontend: `http://localhost:5173` (Vite dev server)
- Backend: `http://localhost:8004` (Django runserver)
- API Base URL: `VITE_API_URL=http://localhost:8004`

**Production:**
- Frontend: `https://ai-athens.cloud` (static build)
- Backend: `https://ai-athens.cloud` (same origin)
- API Base URL: Empty string (same-origin requests)
- CORS: Configured for `https://ai-athens.cloud`

### Auth Flow:
```
1. User enters credentials on /login
   ↓
2. Frontend: POST /api/auth/login/ {email, password, totp_code?}
   ↓
3. Backend: Validate credentials
   ↓
4. Check 2FA requirement
   ↓ (if 2FA required)
5. Return {requires_2fa: true, user_id: X}
   → Frontend navigates to /2fa
   → User enters TOTP code
   → Retry login with totp_code
   ↓ (if 2FA not required or verified)
6. Return {access, refresh, user: {...}}
   ↓
7. Frontend: Store tokens
   - tokenManager.setTokens(access, refresh)
   - localStorage: _at, _rt
   - sessionStorage: _at, user
   ↓
8. Update authStore
   - user, isAuthenticated, firstLoginRequired, approvalPending
   ↓
9. Redirect based on user_type
   - superadmin → /superadmin/dashboard
   - masteradmin → /master-admin
   - companyuser → /app
   - serviceuser → /service
```

**Token Refresh Flow:**
```
1. API request → 401 Unauthorized
   ↓
2. Axios interceptor catches 401
   ↓
3. Check if refresh token exists
   ↓
4. POST /api/auth/token/refresh/ {refresh}
   ↓
5. Success: Update access token
   - tokenManager.setTokens(newAccess, refresh)
   - Retry original request with new token
   ↓
6. Failure: Clear tokens, redirect to /login
```

**Logout Flow:**
```
1. User clicks logout
   ↓
2. Frontend: POST /api/auth/logout/ {refresh}
   ↓
3. Backend: Blacklist refresh token
   ↓
4. Frontend: Clear tokens and state
   - tokenManager.clearTokens()
   - authStore.logout()
   - sessionStorage.clear()
   - localStorage.removeItem('auth-storage')
   ↓
5. Redirect to /login
```

### Tenant Flow:
**Tenant Context Propagation:**
- **Frontend:** No explicit tenant header sent
- **Backend:** Tenant extracted from `request.user.company_id` or `request.user.tenant`
- **MasterAdmin:** Scoped to single tenant via `user.tenant` FK
- **CompanyUser:** Scoped to company via `user.company_id`
- **SuperAdmin:** No tenant scoping (global access)

**Service User Flow:**
```
1. Service user login: POST /api/auth/service-user/login/
   {unique_service_id, password, service_type}
   ↓
2. Backend: Create ServiceUserSession
   - Generate session_key
   - Store in database with expiry
   ↓
3. Return {session_key, user, service}
   ↓
4. Frontend: Store session_key
   - sessionStorage: service_session_key
   - serviceUserStore: sessionKey, serviceUser
   ↓
5. API requests: Add session_key as query param
   - axios interceptor: config.params.session_key = sessionKey
   ↓
6. Backend: Validate session_key in views
   - Check ServiceUserSession.session_key
   - Verify not expired
```

### Error Handling:
**Frontend:**
- **Global Error Boundary:** `components/ui/ErrorBoundary.tsx`
- **Toast Notifications:** react-hot-toast (Sonner as alternative)
- **API Errors:** Axios interceptor shows toast on error
- **Validation Errors:** Form-level error display
- **No retry logic** - single attempt per request

**Backend:**
- **DRF Exception Handler:** Default DRF error responses
- **Validation Errors:** Serializer validation
- **Permission Errors:** 403 Forbidden
- **Auth Errors:** 401 Unauthorized
- **No global error middleware** - standard DRF handling

### Evidence (file paths):
- API Client: `/var/www/athens-2.0/frontend/src/lib/api.ts`
- Token Manager: `/var/www/athens-2.0/frontend/src/lib/tokenManager.ts`
- Auth Store: `/var/www/athens-2.0/frontend/src/store/authStore.ts`
- Service User Store: `/var/www/athens-2.0/frontend/src/store/serviceUserStore.ts`
- Auth Views: `/var/www/athens-2.0/backend/authentication/views.py`
- Settings (CORS): `/var/www/athens-2.0/backend/athens2/settings.py`

---

## 4) TOP 10 ARCHITECTURE RISKS / CONFLICT HOTSPOTS

### 1. DUAL TENANT IDENTIFICATION SYSTEM
**Symptom:** Three different tenant identifiers in User model
- `company_id` (integer) - Legacy field
- `athens_tenant_id` (UUID) - Legacy field marked DEPRECATED
- `tenant` (FK to Tenant) - New field

**Where found:**
- `/var/www/athens-2.0/backend/authentication/models.py` (lines 108-120)
- Multiple views use `company_id`, some use `tenant`

**Why it's risky:**
- Data inconsistency: Which field is source of truth?
- Migration incomplete: Old code may use deprecated fields
- Query confusion: Filtering by wrong field causes access control bugs
- No clear migration path documented

### 2. MIXED AUTH PATTERNS (JWT vs SESSION)
**Symptom:** Two completely different auth mechanisms in same codebase
- JWT tokens for regular users (access + refresh)
- Session keys for service users (query parameter)

**Where found:**
- `/var/www/athens-2.0/frontend/src/lib/api.ts` (lines 95-130)
- `/var/www/athens-2.0/backend/authentication/models.py` (ServiceUserSession)

**Why it's risky:**
- Security inconsistency: Different attack surfaces
- Code duplication: Two auth flows to maintain
- Confusion: Developers must remember which pattern for which user type
- Session key in URL: Potential logging/caching exposure

### 3. NO SERVICE LAYER PATTERN
**Symptom:** Business logic scattered across views, serializers, models
- Complex logic in ViewSet methods
- Validation in serializers
- Some apps have `services.py`, others don't

**Where found:**
- `/var/www/athens-2.0/backend/workforce/views.py` (ViewSets with complex logic)
- `/var/www/athens-2.0/backend/control_plane/views.py` (Mixed patterns)

**Why it's risky:**
- Hard to test: Logic coupled to HTTP layer
- Code duplication: Same logic repeated in multiple views
- Transaction management unclear: No consistent pattern
- Difficult to refactor: Logic spread across multiple files

### 4. SETTINGS NOT SPLIT BY ENVIRONMENT
**Symptom:** Single `settings.py` file with DEBUG flag
- No `settings/base.py`, `settings/dev.py`, `settings/prod.py` pattern
- Environment-specific config via env vars only

**Where found:**
- `/var/www/athens-2.0/backend/athens2/settings.py`

**Why it's risky:**
- Accidental production changes: Easy to commit wrong DEBUG value
- No environment-specific middleware: Can't have dev-only tools
- Secret management: All secrets in one file
- No clear separation: Dev and prod configs mixed

### 5. INCONSISTENT API RESPONSE FORMATS
**Symptom:** Different response structures across endpoints
- Some return `{data: [...]}`, others return `[...]` directly
- Error responses vary: `{error: "..."}` vs `{message: "..."}`
- Pagination inconsistent: Some use DRF pagination, others custom

**Where found:**
- Multiple API endpoints across apps
- `/var/www/athens-2.0/frontend/src/lib/api.ts` (client handles multiple formats)

**Why it's risky:**
- Frontend complexity: Must handle multiple response shapes
- Error handling fragile: Can't rely on consistent error format
- Documentation confusion: No single API contract
- Breaking changes: Easy to change format accidentally

### 6. TOKEN STORAGE SPLIT (localStorage + sessionStorage)
**Symptom:** Tokens stored in multiple places with unclear priority
- Access token: sessionStorage `_at` OR localStorage `_at`
- Refresh token: localStorage only
- User data: sessionStorage `user` AND localStorage `auth-storage`

**Where found:**
- `/var/www/athens-2.0/frontend/src/lib/tokenManager.ts`
- `/var/www/athens-2.0/frontend/src/store/authStore.ts` (lines 150-180)

**Why it's risky:**
- State synchronization: Can get out of sync
- Security confusion: Which storage is more secure?
- Logout incomplete: Must clear multiple locations
- Hydration bugs: Race conditions on page load

### 7. MENU CONFIGURATION HARDCODED IN FRONTEND
**Symptom:** Menu items defined in TypeScript, not fetched from backend
- `menuConfig.ts` has hardcoded menu structure
- Module enablement checked client-side only
- No backend validation of menu access

**Where found:**
- `/var/www/athens-2.0/frontend/src/components/layout/menuConfig.ts`

**Why it's risky:**
- Security bypass: User can modify frontend to show hidden menus
- Inconsistency: Backend permissions may differ from frontend menu
- Deployment coupling: Menu changes require frontend rebuild
- No dynamic configuration: Can't enable/disable features per tenant

### 8. MULTIPLE DESIGN SYSTEMS COEXISTING
**Symptom:** Two complete UI systems in codebase
- `components/ui/` - SAP design system (active)
- `components/ui-legacy/` - Old Athens components (unused)
- Conditional CSS loading based on env var

**Where found:**
- `/var/www/athens-2.0/frontend/src/components/ui/`
- `/var/www/athens-2.0/frontend/src/components/ui-legacy/`
- `/var/www/athens-2.0/frontend/src/main.tsx` (lines 19-22)

**Why it's risky:**
- Bundle size: Shipping unused code
- Maintenance burden: Two systems to update
- Confusion: Which components to use?
- Migration incomplete: Legacy code may still reference old components

### 9. NO CENTRALIZED PERMISSION CHECKING
**Symptom:** Permission checks scattered throughout codebase
- Some views use DRF permission classes
- Some views have manual `if user.user_type == ...` checks
- Frontend has separate permission guards
- No single source of truth for permissions

**Where found:**
- `/var/www/athens-2.0/backend/authentication/permissions.py`
- Multiple view files with inline permission checks
- `/var/www/athens-2.0/frontend/src/components/auth/PermissionGuard.tsx`

**Why it's risky:**
- Security holes: Easy to forget permission check
- Inconsistency: Different permission logic in different places
- Hard to audit: Can't easily verify all endpoints are protected
- Frontend/backend mismatch: Different permission rules

### 10. MASSIVE API CLIENT FILE (2000+ LINES)
**Symptom:** Single `api.ts` file with all API methods
- 200+ API methods in one file
- No organization by domain/module
- Hard to find specific endpoint
- Difficult to maintain

**Where found:**
- `/var/www/athens-2.0/frontend/src/lib/api.ts` (2000+ lines)

**Why it's risky:**
- Merge conflicts: High-traffic file
- Cognitive overload: Too much to understand at once
- No clear ownership: Who maintains which section?
- Testing difficulty: Hard to mock specific API calls
- Bundle size: All API methods loaded even if unused

---

## SUMMARY

**Architecture Style:** Monolithic full-stack (Django + React)

**Key Patterns:**
- Frontend: Component-based React with Zustand state management
- Backend: Django REST Framework with ViewSet pattern
- Auth: JWT for regular users, session keys for service users
- Multi-tenancy: User-scoped filtering (no middleware)
- Routing: Nested React Router with layout wrappers
- API: RESTful with DRF conventions (mostly)

**Technology Stack:**
- Frontend: React 19, TypeScript, Vite, Tailwind, Zustand, React Query
- Backend: Django 5.0, DRF 3.14, SimpleJWT 5.3, PostgreSQL
- Deployment: Production on ai-athens.cloud (no Docker)

**Maturity Level:**
- ✅ Working system in production
- ✅ Authentication and authorization functional
- ✅ Multi-tenant support (with caveats)
- ⚠️ Inconsistent patterns across modules
- ⚠️ Technical debt from migration (legacy fields, dual UI systems)
- ⚠️ No clear architectural guidelines enforced

**Next Steps (NOT IMPLEMENTED - FOR FUTURE):**
1. Standardize tenant identification (single source of truth)
2. Implement service layer pattern
3. Split settings by environment
4. Centralize permission checking
5. Refactor API client into domain modules
6. Remove legacy UI components
7. Standardize API response formats
8. Document architectural decisions (ADRs)
9. Implement API versioning
10. Add integration tests for critical flows

---

**END OF EXTRACTION REPORT**
