# MasterAdmin Module Architecture

## Module Boundary Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                      Athens 2.0 Application                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    App Shell (Core)                         │ │
│  │  • Router (lib/router.tsx)                                  │ │
│  │  • Layouts (SuperadminLayout, MasterAdminLayout)            │ │
│  │  • Auth Store (store/authStore.ts)                          │ │
│  │  • API Client (lib/api.ts)                                  │ │
│  │  • Design System (components/ui/*)                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          MasterAdmin Module (Self-Contained)                │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │   Routes     │  │    Guards    │  │     API      │     │ │
│  │  │              │  │              │  │              │     │ │
│  │  │ • /tenants   │  │ • Permission │  │ • tenants.*  │     │ │
│  │  │ • /users     │  │ • Context    │  │ • users.*    │     │ │
│  │  │ • /subs      │  │ • Scoping    │  │ • subs.*     │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │                              ↓                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │    Pages     │  │    Types     │  │  Services    │     │ │
│  │  │              │  │              │  │              │     │ │
│  │  │ • Tenants    │  │ • Tenant     │  │ • Business   │     │ │
│  │  │ • Users      │  │ • User       │  │   Logic      │     │ │
│  │  │ • Subs       │  │ • Sub        │  │   (future)   │     │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │ │
│  │                                                              │ │
│  │  Public API: index.ts                                       │ │
│  │  • MasterAdminRoutes                                        │ │
│  │  • MasterAdminGuard                                         │ │
│  │  • masterAdminApi                                           │ │
│  │  • useTenantContext                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↓                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Backend API Layer                          │ │
│  │  /api/control-plane/                                        │ │
│  │  • tenants/     (CRUD + enable/disable)                     │ │
│  │  • masters/     (CRUD + reset password)                     │ │
│  │  • subscriptions/ (CRUD)                                    │ │
│  │  • audit-logs/  (Read-only)                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   User       │
│   Action     │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  Frontend Component (TenantCompaniesList.tsx)            │
│  • User clicks "Disable Tenant"                          │
│  • Component calls masterAdminApi.tenants.disable(id)    │
└──────┬───────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  API Client (api/client.ts)                              │
│  • Constructs request: POST /tenants/:id/disable/        │
│  • Adds auth headers (JWT token)                         │
│  • Sends request via apiClient (lib/api.ts)              │
└──────┬───────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  Backend Endpoint (control_plane/views.py)               │
│  • TenantViewSet.disable()                               │
│  • Permission check: IsSuperAdmin                        │
│  • Update tenant.is_active = False                       │
│  • Log security event (SecurityLog)                      │
│  • Return response                                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  Database (PostgreSQL/SQLite)                            │
│  • UPDATE tenants SET is_active = false WHERE id = ?     │
│  • INSERT INTO security_logs (...)                       │
└──────┬───────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────┐
│  Response to Frontend                                     │
│  • { message: "Tenant disabled" }                        │
│  • Component refreshes list                              │
│  • User sees updated status badge                        │
└──────────────────────────────────────────────────────────┘
```

## Permission Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Authentication                       │
│  • Login → JWT token → authStore                            │
│  • user.user_type: 'superadmin' | 'masteradmin'             │
│  • user.company_id: tenant_id (for MasterAdmin)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              MasterAdminGuard (Frontend)                     │
│  • Check: isAuthenticated                                   │
│  • Check: user_type in ['superadmin', 'masteradmin']        │
│  • If requireSuperAdmin: user_type === 'superadmin'         │
│  • Pass → Render children                                   │
│  • Fail → Navigate to /permission-denied                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              useTenantContext Hook                           │
│  • isSuperAdmin: user_type === 'superadmin'                 │
│  • isMasterAdmin: user_type === 'masteradmin'               │
│  • tenantId: user.company_id (for MasterAdmin)              │
│  • canManageAllTenants: isSuperAdmin                        │
│  • canManageTenant(id): isSuperAdmin || tenantId === id     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Component Logic                                 │
│  • Filter data by tenantId (if MasterAdmin)                 │
│  • Show/hide actions based on isSuperAdmin                  │
│  • Disable buttons if !canManageTenant(id)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend Permission Check                        │
│  • IsSuperAdmin permission class                            │
│  • Check: user.user_type == UserType.SUPERADMIN             │
│  • Pass → Execute action                                    │
│  • Fail → 403 Forbidden                                     │
└─────────────────────────────────────────────────────────────┘
```

## Module Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Points                        │
│                                                              │
│  1. Router Registration                                      │
│     • File: lib/router.tsx                                  │
│     • Import: MasterAdminRoutes                             │
│     • Route: /masteradmin/*                                 │
│                                                              │
│  2. Sidebar Menu                                             │
│     • File: layouts/SuperadminLayout.tsx                    │
│     • Items: Tenant Companies, Users, Subscriptions         │
│     • Icons: Building, Users, CreditCard                    │
│                                                              │
│  3. API Client                                               │
│     • File: lib/api.ts (shared)                             │
│     • Base URL: /api/control-plane/                         │
│     • Auth: JWT token from authStore                        │
│                                                              │
│  4. Design System                                            │
│     • Components: DataTable, Badge, Button, etc.            │
│     • Styles: SAP-Python design parity                      │
│     • Theme: Dark mode support                              │
│                                                              │
│  5. Auth Store                                               │
│     • File: store/authStore.ts (shared)                     │
│     • Data: user, isAuthenticated, logout                   │
│     • Used by: MasterAdminGuard, useTenantContext           │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
frontend/src/modules/masteradmin/
│
├── api/                          # Backend communication
│   └── client.ts                 # API client functions
│       • masterAdminApi.tenants.*
│       • masterAdminApi.users.*
│       • masterAdminApi.subscriptions.*
│
├── guards/                       # Access control
│   └── MasterAdminGuard.tsx      # Permission guard + context hook
│       • MasterAdminGuard component
│       • useTenantContext hook
│
├── pages/                        # UI screens
│   ├── TenantCompaniesList.tsx   # Tenant management
│   ├── MasterAdminUsersList.tsx  # User management
│   └── SubscriptionsList.tsx     # Subscription management
│
├── routes/                       # Route configuration
│   └── index.tsx                 # MasterAdminRoutes component
│       • /tenants → TenantCompaniesList
│       • /users → MasterAdminUsersList
│       • /subscriptions → SubscriptionsList
│
├── types/                        # TypeScript definitions
│   └── index.ts                  # Type definitions
│       • TenantCompany
│       • MasterAdminUser
│       • Subscription
│       • Request/Response types
│
├── services/                     # Business logic (future)
│   └── (reserved for complex logic)
│
├── components/                   # Local UI components (future)
│   └── (reserved for module-specific components)
│
├── index.ts                      # Public API
│   • Export: MasterAdminRoutes
│   • Export: MasterAdminGuard
│   • Export: masterAdminApi
│   • Export: useTenantContext
│   • Export: Module metadata
│
└── README.md                     # Module documentation
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
│                                                              │
│  Layer 1: Frontend Guard                                     │
│  • MasterAdminGuard checks user_type                        │
│  • useTenantContext enforces tenant scoping                 │
│  • UI hides/disables actions based on permissions           │
│                                                              │
│  Layer 2: API Client                                         │
│  • JWT token attached to all requests                       │
│  • Token refresh on 401 errors                              │
│  • Error handling and user feedback                         │
│                                                              │
│  Layer 3: Backend Permission                                 │
│  • IsSuperAdmin permission class                            │
│  • IsAuthenticated base requirement                         │
│  • User type validation                                     │
│                                                              │
│  Layer 4: Database Scoping                                   │
│  • Tenant isolation via company_id                          │
│  • Row-level security (future)                              │
│  • Audit logging on all writes                              │
│                                                              │
│  Layer 5: Audit Trail                                        │
│  • SecurityLog records all actions                          │
│  • IP address + user agent tracking                         │
│  • Metadata includes tenant/user context                    │
└─────────────────────────────────────────────────────────────┘
```

## Future Extensions

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 2: Modals                           │
│  • CreateTenantModal                                        │
│  • EditTenantModal                                          │
│  • CreateMasterAdminModal                                   │
│  • EditMasterAdminModal                                     │
│  • CreateSubscriptionModal                                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Phase 3: Workflows                        │
│  • Company approval queue                                   │
│  • Bulk operations                                          │
│  • Export functionality                                     │
│  • Advanced filtering                                       │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    Phase 4: Athens Modules                   │
│  • PTW (Permit to Work)                                     │
│  • Incident Management                                      │
│  • Training Management                                      │
│  • Project-level scoping                                    │
└─────────────────────────────────────────────────────────────┘
```

---

**Architecture Pattern:** Self-Contained Module with Clean Boundaries  
**Integration Strategy:** Minimal coupling, maximum cohesion  
**Security Model:** Multi-layer defense with audit trail  
**Last Updated:** February 6, 2025
