# Fast Mode Templates

Copy/paste these templates for maximum speed. Replace `<placeholders>` with your specifics.

---

## 1) Add a field end-to-end (backend)

```
FAST MODE — PATCH ONLY
Goal: Add field <field_name> (<type>) to <app>/<model>.
Scope: model + migration + serializer (+ admin if applicable).
Constraints: minimal diff, preserve tenant isolation + permissions, no docs, no tests, no commentary.
Output: PATCH MAP then unified diffs for each file.
```

**Example:**
```
FAST MODE — PATCH ONLY
Goal: Add field license_issuing_authority (VARCHAR 200) to contractor_compliance/ContractorCompliance.
Scope: model + migration + serializer + admin.
Constraints: minimal diff, preserve tenant isolation + permissions, no docs, no tests, no commentary.
Output: PATCH MAP then unified diffs for each file.
```

---

## 2) Fix a bug from stack trace (backend)

```
FAST MODE — BUGFIX PATCH ONLY
Input: <paste stack trace + exact function/class>
Goal: Fix root cause without refactors.
Constraints: minimal diff, keep behavior stable, no new dependencies, no commentary.
Output: PATCH MAP + unified diffs only.
```

**Example:**
```
FAST MODE — BUGFIX PATCH ONLY
Input: 
  File "workforce/views.py", line 142, in create
    KeyError: 'employee_id'
Goal: Fix root cause without refactors.
Constraints: minimal diff, keep behavior stable, no new dependencies, no commentary.
Output: PATCH MAP + unified diffs only.
```

---

## 3) Frontend UI parity patch

```
FAST MODE — UI PATCH ONLY
Goal: Make <page/component> match existing SAP-Python parity patterns used elsewhere in repo.
Scope: only these files: <file1>, <file2>.
Constraints: no new components unless strictly required, no route changes, no commentary.
Output: unified diffs only.
```

**Example:**
```
FAST MODE — UI PATCH ONLY
Goal: Make ContractorList.tsx match existing SAP-Python parity patterns (glass cards, gradient depth).
Scope: only these files: frontend/src/pages/ContractorList.tsx
Constraints: no new components unless strictly required, no route changes, no commentary.
Output: unified diffs only.
```

---

## 4) Batch change across multiple files safely

```
BATCH — PATCH ONLY
Change: <single change description>
Files allowed: <list>
Constraints: max <N> files, max <M> lines changed per file, preserve RBAC/tenant rules, no commentary.
Output: PATCH MAP + unified diffs.
```

**Example:**
```
BATCH — PATCH ONLY
Change: Rename field contractor_name to company_name across serializers and views.
Files allowed: contractor_compliance/serializers.py, contractor_compliance/views.py, contractor_compliance/admin.py
Constraints: max 3 files, max 20 lines changed per file, preserve RBAC/tenant rules, no commentary.
Output: PATCH MAP + unified diffs.
```

---

## 5) Add new API endpoint (backend)

```
FAST MODE — ENDPOINT ONLY
Goal: Add <HTTP_METHOD> /api/<path>/ endpoint.
Behavior: <1-line description>
Scope: view + serializer + URL routing (+ permissions if non-standard).
Constraints: follow existing module patterns, preserve tenant isolation, no tests, no docs, no commentary.
Output: PATCH MAP + unified diffs.
```

**Example:**
```
FAST MODE — ENDPOINT ONLY
Goal: Add GET /api/contractor-compliance/expiring-licenses/ endpoint.
Behavior: Return licenses expiring within 30 days for current tenant.
Scope: view + serializer + URL routing + permission guard.
Constraints: follow existing module patterns, preserve tenant isolation, no tests, no docs, no commentary.
Output: PATCH MAP + unified diffs.
```

---

## 6) Add new React page/component (frontend)

```
FAST MODE — COMPONENT ONLY
Goal: Create <ComponentName> for <purpose>.
Scope: component file + route (if page) + parent integration.
Constraints: reuse existing UI primitives (KPICard, glass surfaces), match SAP-Python patterns, no new libs, no commentary.
Output: PATCH MAP + unified diffs.
```

**Example:**
```
FAST MODE — COMPONENT ONLY
Goal: Create ContractorComplianceDetail page for viewing single contractor compliance record.
Scope: component file + route + sidebar menu link.
Constraints: reuse existing UI primitives (KPICard, glass surfaces), match SAP-Python patterns, no new libs, no commentary.
Output: PATCH MAP + unified diffs.
```

---

## 7) Database migration only

```
FAST MODE — MIGRATION ONLY
Goal: <describe schema change>
Constraints: backward-compatible, safe defaults, no data loss, no commentary.
Output: migration file diff only.
```

**Example:**
```
FAST MODE — MIGRATION ONLY
Goal: Add nullable license_issuing_authority VARCHAR(200) to contractor_compliance table.
Constraints: backward-compatible, safe defaults, no data loss, no commentary.
Output: migration file diff only.
```

---

## 8) Refactor/extract utility

```
FAST MODE — REFACTOR ONLY
Goal: Extract <functionality> from <source> into <target>.
Files: <list>
Constraints: preserve behavior exactly, update imports, max <N> files, no commentary.
Output: PATCH MAP + unified diffs.
```

**Example:**
```
FAST MODE — REFACTOR ONLY
Goal: Extract tenant validation logic from contractor_compliance/views.py into utils/tenant_validators.py.
Files: contractor_compliance/views.py, utils/tenant_validators.py (new)
Constraints: preserve behavior exactly, update imports, max 2 files, no commentary.
Output: PATCH MAP + unified diffs.
```

---

## Pro Tips

1. **Always specify output format**: "PATCH MAP + unified diffs only"
2. **Set file limits**: "max 3 files" prevents scope creep
3. **No commentary**: Saves ~40% tokens on responses
4. **Paste only relevant code**: Don't dump entire files, just the failing section
5. **Batch related changes**: One request for model+serializer+view is faster than 3 separate requests

---

## Speed Comparison

| Approach | Tokens | Response Time | Clarity |
|----------|--------|---------------|---------|
| ❌ "Can you help me add a field?" | ~2000 | Slow | Vague |
| ✅ FAST MODE template | ~200 | Fast | Precise |

**Result:** ~10x token reduction, ~5x faster responses.
