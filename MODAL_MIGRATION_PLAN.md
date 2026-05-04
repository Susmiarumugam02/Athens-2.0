# Modal Migration Plan - AppDialog Universal System

## AUDIT RESULTS

### Existing Modal Components Found:
1. `/src/ui/sap/components/AppDialog.tsx` - ✅ PRIMARY (already good structure)
2. `/src/ui/sap/components/Modal.tsx` - LEGACY (to deprecate)
3. `/src/ui/sap/components/ModalForm.tsx` - ✅ NEW (just created)
4. `/src/components/ui/Modal.tsx` - SHIM (re-exports SAP Modal)
5. `/src/components/ui/AppDialog.tsx` - SHIM (re-exports SAP AppDialog)
6. `/src/components/ui/ModalForm.tsx` - SHIM (re-exports SAP ModalForm)
7. `/src/components/ui-legacy/` - LEGACY (to remove)

### Modal Usage Inventory (150+ files):
- Tenant/Master/Subscription modals: 10 files
- Company modals: 5 files
- SuperAdmin modals: 15 files
- CRM modals: 30+ files
- Finance modals: 20+ files
- HR modals: 15+ files
- Inventory modals: 10+ files
- Athens feature modals: 40+ files

## MIGRATION STRATEGY

### Phase 1: Core Infrastructure ✅
- [x] AppDialog exists with proper structure
- [x] Create ModalForm utility
- [x] Create MVP CreateTenantModal

### Phase 2: Update Shims (ensure all imports work)
- [ ] Update `/src/components/ui/ModalForm.tsx` to re-export new ModalForm
- [ ] Ensure all imports resolve correctly

### Phase 3: Migrate Control Plane Modals (10 files)
- [ ] CreateTenantModal
- [ ] EditTenantModal
- [ ] ViewTenantModal
- [ ] DeleteTenantModal
- [ ] CreateMasterAdminModal
- [ ] EditMasterAdminModal
- [ ] ViewMasterAdminModal
- [ ] DeleteMasterAdminModal
- [ ] ViewSubscriptionModal

### Phase 4: Migrate SuperAdmin Modals (15 files)
- [ ] UserFormModal
- [ ] RoleFormModal
- [ ] AnnouncementFormModal
- [ ] IPRestrictionFormModal
- [ ] ConfirmActionDialog
- [ ] AuditLogDetailDrawer
- [ ] SessionsDrawer

### Phase 5: Migrate Company Modals (5 files)
- [ ] CompanyApprovalModal
- [ ] CompanyDeleteModal
- [ ] CompanyEditModal
- [ ] CompanyPasswordResetModal
- [ ] CompanyViewModal

### Phase 6: Migrate Feature Modals (100+ files)
- CRM, Finance, HR, Inventory, Athens modules

## IMPLEMENTATION RULES

### Standard Pattern:
```tsx
import { ModalForm, FormField } from '@/ui/sap/components/ModalForm'
import { AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter } from '@/ui/sap/components/AppDialog'

// For forms:
<ModalForm
  open={open}
  onOpenChange={onOpenChange}
  title="Title"
  form={form}
  onSubmit={onSubmit}
  loading={loading}
>
  <FormField label="Field" error={errors.field?.message}>
    <Input {...register('field')} />
  </FormField>
</ModalForm>

// For view/confirm dialogs:
<AppDialog open={open} onOpenChange={onOpenChange} size="md">
  <AppDialogHeader>
    <AppDialogTitle>Title</AppDialogTitle>
  </AppDialogHeader>
  <AppDialogBody>Content</AppDialogBody>
  <AppDialogFooter>
    <Button onClick={onClose}>Close</Button>
  </AppDialogFooter>
</AppDialog>
```

### Consistency Requirements:
- All modals use AppDialog or ModalForm
- No custom overlay/backdrop implementations
- Consistent spacing: p-6 for header/body/footer
- Consistent button alignment: justify-end in footer
- Loading states handled by ModalForm
- Form validation errors shown via FormField

## CLEANUP TASKS
- [ ] Remove `/src/components/ui-legacy/`
- [ ] Remove `/src/ui/sap/components/Modal.tsx` (old)
- [ ] Update all imports to use AppDialog/ModalForm
- [ ] Remove duplicate modal CSS
- [ ] Verify build passes
- [ ] Test modal functionality

## SUCCESS CRITERIA
- ✅ Single modal system (AppDialog + ModalForm)
- ✅ All modals migrated
- ✅ No legacy modal code remains
- ✅ Consistent UX across all modals
- ✅ Build passes without errors
- ✅ All functionality preserved
