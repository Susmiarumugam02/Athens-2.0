# QUICK_REF_DATABASE
DB: Postgres via Django ORM
Rules:
- Backward-compatible migrations (defaults/nullability handled safely).
- Never change PK types lightly; avoid tenant-id datatype mismatches.
Deliverable: model + migration + serializer updates as requested; diffs only.
