# Athens 2.0 QUICK_REF
Stack: Django + DRF | React + TS | Postgres
Auth: JWT (access+refresh). Tenant context required on most endpoints.
Repo: /backend (Django) | /frontend/src (React)
Rules: minimal diffs, keep RBAC + tenant isolation, avoid UI redesign unless asked.
Output preference: PATCH MAP + unified diffs only (no commentary).
