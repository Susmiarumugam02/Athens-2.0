# Tenant Isolation Audit Report

Date: 2026-05-25

## Critical Finding

The employee leak was caused by project-admin scoping that allowed peer admins to see each other's employees when they shared the same `admin_type` and project:

```python
created_by_admin_type=admin_type,
created_by_admin__project=project
```

That is not tenant/company isolation. It is project-level sharing between separate admins. A newly created admin could therefore see employees created by another admin on the same project.

## Fixes Applied

- `backend/workforce/views.py`
  - Fixed `_tenant_id()` so it no longer falls back to `project.id` as a tenant identifier.
  - Changed `EmployeeViewSet.get_queryset()` so client/EPC/contractor project admins only see `Employee.created_by_admin=request.user`.
  - Applied the same owner isolation to `_get_role_isolated_employees()`, attendance/dashboard helper flows, scoped user attendance helpers, and workforce KPI stats.
  - Changed MOM participant lookup under employee management so project admins only see users they created.
  - New employee login accounts are now created with the authenticated admin's resolved `tenant`, `company_id`, and `athens_tenant_id` context instead of trusting inherited or missing legacy values.

- `frontend/src/store/authStore.ts`
  - Clears tenant-scoped browser state on successful login and logout.
  - Removes stale `user`, `auth_user`, `employee_data`, selected Athens project, service session, and legacy auth keys that could briefly hydrate another tenant's UI state.

- `frontend/src/pages/athens-admin/EmployeeManagement.tsx`
  - Clears employee/stat state before each fetch.
  - Refetches when the authenticated user changes to prevent previous-admin data from remaining visible during tenant switches.

## Vulnerable APIs/Tables Found During Static Audit

These modules still contain global query patterns that must be hardened before the platform can be called fully tenant-isolated:

- `quality`: `QualityStandard`, `QualityTemplate`, `QualityInspection`, `QualityDefect`, `QualityObservation`, `SupplierQuality`, `QualityMetrics`, `QualityAlert` use `objects.all()` in viewsets.
- `ptw`: `Permit`, `PermitType`, permit workers, approvals, extensions, isolation points, audits, gas readings, photos, signatures, workflow instances, integrations, compliance reports, and webhook endpoints expose global queryset declarations.
- `incidentmanagement`: `Incident.objects.all()` and broad notification recipient queries.
- `worker`: `Worker.objects.all()` in the worker viewset.
- `manpower`: `ManpowerEntry.objects.all()` and `DailyManpowerSummary.objects.all()` fallback paths, including comments that explicitly say "show all for now".
- `mom`: `Mom.objects.all()`, broad participant serializers/querysets, and user lookups by raw ID.
- `inductiontraining`: `InductionTraining.objects.all()` and broad user training lookups.
- `tbt`: `ToolboxTalk.objects.all()` and serializer user queryset using `User.objects.all()`.
- `chatbox`: fallback active-user lookup can expose all active users when project context is absent.
- `ai_bot`: RAG/vector/intelligent services index records using global `.objects.all()` across observations, incidents, permits, workers, manpower, MoM, projects, induction, job training, toolbox talks, permit types, and hazard libraries.
- `admin_attendance`: workforce/admin attendance queries need tenant and creator scoping review.

## Data Model Gaps Observed

- Workforce tables already carry `athens_tenant_id`; `Employee` also has creator ownership fields.
- Several business models use only `created_by` or UUID `athens_tenant_id` and do not consistently expose integer `tenant_id`/`company_id`.
- AI embedding/index tables need tenant metadata before shared vector retrieval can be safe.

## Verification

- `python3 -m py_compile backend/workforce/views.py` passed.
- `python3 manage.py makemigrations workforce --check --dry-run --skip-checks` reported no model changes.
- `npm run build` passed. Vite reported existing warnings unrelated to this fix, including a duplicate JSX `style` attribute in `src/components/ConsideringParametersPanel.tsx`.
