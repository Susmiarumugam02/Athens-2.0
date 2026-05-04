# Manpower Module Import Plan

## Source
Legacy Athens: `/var/www/athens/app/backend/manpower/`

## Target
Athens 2.0: `/var/www/athens-2.0/backend/ergon_manpower/`

## Implementation Strategy

### 1. Models (3 tables)
- `WorkType` - Work categories (civil, electrical, plumbing, etc.)
- `ManpowerEntry` - Daily manpower records by category/gender/shift
- `DailyManpowerSummary` - Aggregated daily stats

### 2. Key Features
- Multi-dimensional tracking (category, gender, shift, work_type)
- Hours worked + overtime tracking
- Attendance status (present, absent, late, half_day)
- Daily summaries with efficiency calculations
- Dashboard analytics (trends, distributions)

### 3. Tenant Integration
- Add `athens_tenant_id` to all models
- Scope queries by tenant
- Project-level isolation

### 4. API Endpoints
```
POST   /api/ergon/manpower/                    # Create entries
GET    /api/ergon/manpower/                    # List (grouped by date)
GET    /api/ergon/manpower/individual/         # List individual records
GET    /api/ergon/manpower/<id>/               # Get single entry
PUT    /api/ergon/manpower/<id>/               # Update entry
DELETE /api/ergon/manpower/<id>/               # Delete entry
GET    /api/ergon/manpower/by-date/?date=      # Get by date
GET    /api/ergon/manpower/work-types/         # List work types
POST   /api/ergon/manpower/work-types/         # Create work type
GET    /api/ergon/manpower/daily-summary/      # Daily summaries
GET    /api/ergon/manpower/dashboard-stats/    # Analytics
```

### 5. Permissions
- Owner/Admin: Full CRUD
- Viewer: Read-only
- Tenant isolation enforced

### 6. Files to Create
```
backend/ergon_manpower/
├── __init__.py
├── apps.py
├── models.py           # 3 models
├── serializers.py      # 5 serializers
├── views.py            # 8 views
├── urls.py             # 10 endpoints
├── permissions.py      # Permission class
├── admin.py            # Django admin
└── migrations/
    └── 0001_initial.py
```

## Execution Steps
1. Create app structure
2. Adapt models (add tenant fields)
3. Create serializers
4. Create views (simplified, tenant-scoped)
5. Configure URLs
6. Register in settings
7. Run migrations
8. Test endpoints
