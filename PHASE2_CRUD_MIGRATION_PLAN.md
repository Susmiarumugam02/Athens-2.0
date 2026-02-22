# PHASE 2 — DRF CRUD MIGRATION PLAN

**Start Date:** February 20, 2025  
**Status:** 🟡 Planning

---

## 🎯 Objective

Migrate DRF default CRUD operations (list/retrieve/create/update/destroy) to support envelope mode while preserving legacy behavior.

---

## 📋 Strategy

### Pagination Approach
1. **Non-paginated lists:** Wrap in `ok(data=serializer.data)`
2. **Paginated lists:** Use `paginate(request, queryset, serializer_class)` helper
3. **Single retrieve:** Wrap in `ok(data=serializer.data)`
4. **Create/Update:** Wrap in `ok(data=serializer.data)`
5. **Delete:** Wrap in `ok(data=None)` or `ok(data={'detail': 'Deleted'})`

### Implementation Order (Smallest to Largest)
1. **PATCH B5** — system (minimal CRUD, if any)
2. **PATCH B4** — control_plane (4 ViewSets)
3. **PATCH B1** — projects (moderate complexity)
4. **PATCH B3** — ergon (14 ViewSets)
5. **PATCH B2** — workforce (16 ViewSets)
6. **PATCH B6** — superadmin (security ViewSets)

---

## 🔧 Technical Approach

### Override Methods in ViewSets

```python
from system.api_response import ok, paginate

class ExampleViewSet(viewsets.ModelViewSet):
    # ... existing code ...
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check if paginated
        page = self.paginate_queryset(queryset)
        if page is not None:
            return paginate(request, queryset, self.serializer_class)
        
        serializer = self.get_serializer(queryset, many=True)
        return ok(data=serializer.data, request=request)
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return ok(data=serializer.data, request=request)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return ok(data=serializer.data, request=request, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return ok(data=serializer.data, request=request)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return ok(data=None, request=request, status=status.HTTP_204_NO_CONTENT)
```

---

## 📊 Module Inventory

### PATCH B5 — system
- **ViewSets:** 0 (only APIViews, already done)
- **Effort:** None

### PATCH B4 — control_plane
- **ViewSets:** 4 (TenantViewSet, SubscriptionViewSet, MasterAdminViewSet, AuditLogViewSet)
- **Pagination:** Likely yes
- **Effort:** Low

### PATCH B1 — projects
- **ViewSets:** ~3-4
- **Pagination:** Likely yes
- **Effort:** Medium

### PATCH B3 — ergon
- **ViewSets:** 14 (already have custom actions done)
- **Pagination:** Likely yes
- **Effort:** High

### PATCH B2 — workforce
- **ViewSets:** 16 (already have custom actions done)
- **Pagination:** Likely yes
- **Effort:** High

### PATCH B6 — superadmin
- **ViewSets:** Multiple security-related
- **Pagination:** Likely yes
- **Effort:** Medium

---

## 🚀 Execution Plan

### Step 1: Start with control_plane (PATCH B4)
- Smallest CRUD module
- Establish pattern
- Test pagination helper

### Step 2: Verify Pattern Works
- Test legacy mode (no header)
- Test envelope mode (with header)
- Test pagination
- Document findings

### Step 3: Scale to Larger Modules
- Apply pattern to projects
- Apply pattern to ergon
- Apply pattern to workforce
- Apply pattern to superadmin

---

## ✅ Success Criteria

- [ ] All ViewSet CRUD methods support envelope mode
- [ ] Pagination works correctly in both modes
- [ ] Legacy mode unchanged (no header)
- [ ] Envelope mode wraps responses (with header)
- [ ] HTTP status codes preserved
- [ ] No breaking changes

---

**Next Action:** Start PATCH B4 — control_plane CRUD
