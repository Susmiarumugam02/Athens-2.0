# Athens 2.0 - Ultra-Fast Workflow Cheatsheet

## Setup (Do Once)

1. **Pin only:** `QUICK_REF.md`
2. **Unpin:** README.md, all other long docs
3. **Keep local:** `QUICK_REF_BACKEND.md`, `QUICK_REF_FRONTEND.md`, `QUICK_REF_DATABASE.md`
4. **Bookmark:** `FAST_MODE_TEMPLATES.md`

---

## Daily Workflow Pattern

```
1. Identify task type (backend/frontend/database)
2. Copy relevant template from FAST_MODE_TEMPLATES.md
3. Paste ONLY the code snippet needed (10-60 lines)
4. Add constraints (max files, no tests, etc.)
5. Get diffs → apply → test yourself
```

---

## Before/After Examples

### ❌ SLOW (typical request)

```
Hey, I need to add a new field to track who issued the CLRA license 
in the contractor compliance module. Can you help me figure out the 
best way to do this? I think it should be a text field. Let me know 
what you think and then we can implement it across the model, 
serializer, and admin interface.
```

**Problems:**
- Vague scope (no file list)
- Asks for opinions (generates alternatives)
- No output format specified
- ~150 tokens → ~2000 token response

---

### ✅ FAST (optimized request)

```
FAST MODE — PATCH ONLY
Goal: Add license_issuing_authority VARCHAR(200) to contractor_compliance.ContractorCompliance
Scope: model + migration + serializer + admin
Constraints: max 4 files, preserve tenant isolation, no tests, no commentary
Output: PATCH MAP + unified diffs only
```

**Benefits:**
- Precise scope (4 files max)
- No alternatives requested
- Hard output format
- ~50 tokens → ~400 token response

**Speed gain: 5x faster**

---

## Common Task Patterns

### 1. Add Field (Backend)

```
FAST MODE — PATCH ONLY
Goal: Add <field_name> <type> to <app>.<Model>
Scope: model + migration + serializer + admin
Constraints: max 4 files, preserve tenant isolation, no commentary
Output: PATCH MAP + diffs
```

### 2. Fix Bug

```
FAST MODE — BUGFIX PATCH ONLY
Input: [paste 10-line stack trace]
Goal: Fix root cause
Constraints: minimal diff, no refactors, no commentary
Output: PATCH MAP + diffs
```

### 3. New API Endpoint

```
FAST MODE — ENDPOINT ONLY
Goal: Add GET /api/<path>/
Behavior: <1-line description>
Scope: view + serializer + urls + permissions
Constraints: follow existing patterns, max 4 files, no commentary
Output: PATCH MAP + diffs
```

### 4. UI Component

```
FAST MODE — COMPONENT ONLY
Goal: Create <ComponentName> for <purpose>
Scope: component + route + menu link
Constraints: reuse KPICard/glass surfaces, match SAP-Python, no new libs, no commentary
Output: PATCH MAP + diffs
```

### 5. Database Migration

```
FAST MODE — MIGRATION ONLY
Goal: <describe schema change>
Constraints: backward-compatible, safe defaults, no commentary
Output: migration file diff only
```

---

## Speed Killers (Avoid These)

| ❌ Slow Pattern | ✅ Fast Pattern |
|----------------|----------------|
| "Can you help me..." | "FAST MODE: Add X to Y" |
| "What's the best way..." | "Implement X using pattern Y" |
| "Let me know what you think" | "Output: diffs only" |
| Paste entire file | Paste lines 40-110 only |
| No file limit | "Max 3 files" |
| "Make it better" | "Add field X, preserve behavior" |
| Ask for tests | "NO TESTS" |
| Ask for alternatives | "Single implementation only" |

---

## Ultra-Fast Header (Paste on Any Request)

```
ATHENS ULTRA-FAST MODE
- Use only provided snippets + listed files (no repo scans)
- Max 3 files, minimal diff
- Preserve tenant isolation + RBAC
- Output: PATCH MAP + unified diffs only
- No commentary, no tests, no docs
```

---

## When Speed Drops: Debug Checklist

1. ☐ Am I pasting entire files? → Paste 10-60 lines only
2. ☐ Did I specify max files? → Add "max 3 files"
3. ☐ Did I specify output format? → Add "Output: PATCH MAP + diffs only"
4. ☐ Am I asking for opinions? → Remove "what do you think", "best way"
5. ☐ Is Q running tests? → Add "NO TESTS, NO LINT"
6. ☐ Is Q searching repo? → Add "Use only provided snippets"
7. ☐ Am I asking for alternatives? → Add "Single implementation only"
8. ☐ Is scope too wide? → Break into smaller batches

---

## Snippet Extraction (How to Paste "Just Enough")

### For Models
```python
# Paste only the model class (lines 15-45)
class ContractorCompliance(models.Model):
    contractor = models.ForeignKey(...)
    # ... existing fields ...
    
    class Meta:
        db_table = 'contractor_compliance'
```

### For Views
```python
# Paste only the failing method (lines 80-120)
class ContractorComplianceViewSet(viewsets.ModelViewSet):
    def create(self, request):
        # ... method body ...
```

### For Serializers
```python
# Paste only the serializer class (lines 30-60)
class ContractorComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractorCompliance
        fields = '__all__'
```

**Rule:** 10-60 lines per snippet, not 200+ line files

---

## Batching Sweet Spot

| Batch Size | Speed | Risk | Best For |
|------------|-------|------|----------|
| 1 file | Fast | Low | Migrations, single fixes |
| 2-4 files | Fastest | Low | Feature additions (model+serializer+view) |
| 5-8 files | Medium | Medium | Module-wide changes |
| 9+ files | Slow | High | Avoid (break into smaller batches) |

**Optimal:** 2-4 files per request

---

## Real Latency Comparison

| Request Type | Old Way | New Way | Speedup |
|--------------|---------|---------|---------|
| Add field | ~45s | ~8s | 5.6x |
| Fix bug | ~60s | ~10s | 6x |
| New endpoint | ~90s | ~15s | 6x |
| UI component | ~120s | ~20s | 6x |

**Average speedup: 5-6x faster**

---

## Pro Tips

1. **Keep FAST_MODE_TEMPLATES.md open** in a browser tab
2. **Copy template → fill placeholders → paste** (5 seconds)
3. **Always include "Output: PATCH MAP + diffs only"**
4. **Set file limits even if you don't know exact count** ("max 4 files")
5. **Paste stack traces, not entire logs** (first 10 lines usually enough)
6. **Test yourself** (don't ask Q to verify, just run pytest/npm test)
7. **Batch related changes** (model+serializer+view in one request)
8. **Use "NO TESTS, NO DOCS"** for draft implementations

---

## Emergency: "It's Still Slow"

If you've followed all rules and it's still slow:

1. **Check pinned context** → Should only be QUICK_REF.md (~126 bytes)
2. **Check your prompt length** → Should be <100 tokens
3. **Check if you pasted full files** → Should be 10-60 line snippets
4. **Add explicit constraints:**
   ```
   ULTRA-FAST MODE
   - No repo scans
   - No tests
   - No alternatives
   - Max 3 files
   - Output: diffs only
   ```

---

## Success Metrics

You're doing it right when:
- ✅ Responses arrive in <15 seconds
- ✅ Responses are <500 tokens (mostly diffs)
- ✅ No explanations unless you ask
- ✅ No alternatives unless you ask
- ✅ Exact files you requested, no extras

---

## Quick Reference Card (Print This)

```
┌─────────────────────────────────────────┐
│ ATHENS 2.0 ULTRA-FAST WORKFLOW          │
├─────────────────────────────────────────┤
│ 1. Copy template from FAST_MODE_TEMPLATES│
│ 2. Paste 10-60 line snippet only        │
│ 3. Add "max N files"                    │
│ 4. Add "Output: PATCH MAP + diffs only" │
│ 5. Add "NO TESTS, NO COMMENTARY"        │
│ 6. Get diffs → apply → test yourself    │
└─────────────────────────────────────────┘

Speed Killers to Avoid:
❌ "Can you help..."
❌ "What's the best way..."
❌ Pasting entire files
❌ No file limits
❌ Asking for alternatives

Speed Boosters:
✅ "FAST MODE: Add X to Y"
✅ 10-60 line snippets
✅ "Max 3 files"
✅ "Output: diffs only"
✅ "NO TESTS, NO COMMENTARY"
```

---

**Result:** 5-6x faster development with Athens 2.0
