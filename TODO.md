# HT Cable Pre-Commissioning Checklist Implementation TODO

## Status: [0/14] In Progress

### 1. ✅ [DONE] Create TODO.md

### 2. Create frontend/src/services/inspectionService.ts
### 3. Update frontend/src/lib/router.tsx (add HT pre-commission routes)
### 4. Update frontend/src/pages/inspection/components/forms/htPreCommissionConfig.ts (add missing fields, test_types)
### 5. Update frontend/src/pages/inspection/components/forms/HTPreCommissionForm.tsx
   - Add missing General fields
   - Dynamic tests table (add/remove)
   - Attachments upload
   - Final status + override
   - Workflow states
### 6. Create/Update frontend/src/pages/inspection/components/forms/HTPreCommissionFormList.tsx
### 7. Update backend/inspection/models_forms.py (HTPreCommissionForm)
### 8. Update backend/inspection/serializers_forms.py
### 9. Update backend/inspection/views_forms.py (logic/validations)
### 10. Run Django migrations (makemigrations inspection, migrate)
### 11. Test API endpoints (Postman: create/list/update)
### 12. Test frontend: npm run dev → full form flow
### 13. Dark theme + responsive validation
### 14. Mark complete + attempt_completion

**Next Step: #2 - inspectionService.ts**

