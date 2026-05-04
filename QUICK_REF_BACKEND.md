# QUICK_REF_BACKEND
Framework: Django + DRF
Must preserve: tenant isolation + RBAC/permission guards + audit logging behavior.
Patterns:
- Views: prefer DRF ViewSets; keep response format consistent with existing module.
- Serializers: validate, avoid breaking existing fields.
- Migrations: safe defaults; use RunPython only if required.
Deliverable: PATCH MAP + unified diffs (no explanations).
