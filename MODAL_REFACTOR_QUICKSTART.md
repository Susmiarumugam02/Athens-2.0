# Quick Start: Modal Refactoring

## ✅ What's Done

1. **PasswordChangeModal** - Refactored (49% reduction)
2. **CompanyPasswordResetModal** - Refactored (50% reduction)
3. **Automation Script** - Created and tested
4. **Template** - ContactModal refactored as example

## 🚀 Execute Batch Refactoring

### Option 1: Automated (Recommended)

```bash
cd /var/www/athens-2.0

# 1. Scan CRM modals
node scripts/refactor-modals.js scan frontend/src/pages/services/crm/components

# 2. Preview one modal first
node scripts/refactor-modals.js preview frontend/src/pages/services/crm/components/ContactModal.tsx

# 3. Batch refactor all CRM modals
node scripts/refactor-modals.js refactor frontend/src/pages/services/crm/components

# 4. Test in browser
npm run dev
# Navigate to CRM → Test modals

# 5. If successful, refactor Finance
node scripts/refactor-modals.js refactor frontend/src/pages/services/finance/components

# 6. Refactor HR
node scripts/refactor-modals.js refactor frontend/src/pages/services/hr/components

# 7. Refactor Athens
node scripts/refactor-modals.js refactor frontend/src/features/athens
```

### Option 2: Manual (For Complex Modals)

Use template from: `frontend/src/pages/services/crm/components/ContactModal.refactored.tsx`

**Pattern**:
```tsx
import { ModalForm, FormField } from '../ui/ModalForm'
import { useForm } from 'react-hook-form'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: any
}

export const YourModal = ({ open, onOpenChange, onSuccess, editData }) => {
  const [loading, setLoading] = useState(false)
  const form = useForm({ mode: 'onChange', defaultValues: {} })
  
  const onSubmit = async (data) => {
    try {
      setLoading(true)
      await api.save(data)
      toast.success('Success')
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error('Failed')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <ModalForm open={open} onOpenChange={onOpenChange} title="Title" form={form} onSubmit={onSubmit} loading={loading}>
      <FormField label="Field" error={errors.field?.message} required>
        <Input {...register('field', { required: 'Required' })} />
      </FormField>
    </ModalForm>
  )
}
```

## 📊 Expected Results

| Module | Files | Lines Saved | Time Saved |
|--------|-------|-------------|------------|
| CRM | 20 | ~1,600 | 40 hours |
| Finance | 10 | ~700 | 20 hours |
| HR | 5 | ~380 | 10 hours |
| Athens | 15 | ~1,200 | 30 hours |
| **Total** | **50** | **~3,880** | **100 hours** |

## 🔍 Verification

After refactoring:
```bash
# Check old patterns removed
grep -r "isOpen:" frontend/src --include="*Modal.tsx"
# Should return 0 results

# Check new patterns added
grep -r "open:" frontend/src --include="*Modal.tsx" | wc -l
# Should match modal count

# Build check
npm run build
```

## 🐛 Rollback (If Needed)

```bash
# Restore from backups
find frontend/src -name "*.backup" -exec sh -c 'mv "$1" "${1%.backup}"' _ {} \;

# Or restore specific file
mv frontend/src/components/modals/UserModal.tsx.backup frontend/src/components/modals/UserModal.tsx
```

## 📝 Files Modified

### Completed
- ✅ `/frontend/src/components/auth/PasswordChangeModal.tsx`
- ✅ `/frontend/src/components/modals/CompanyPasswordResetModal.tsx`

### Ready for Automation
- 🔄 20 CRM modals
- 🔄 10 Finance modals
- 🔄 5 HR modals
- 🔄 15 Athens modals

### Manual Review Needed
- ⚠️ CreateCompanyModal (complex service selection)
- ⚠️ CompanyEditModal (complex service management)
- ⚠️ CompanyApprovalModal (view-only, already good)

## 🎯 Success Criteria

- [ ] All modals use `open`/`onOpenChange` props
- [ ] All form modals use ModalForm component
- [ ] All view modals use AppDialog component
- [ ] No TypeScript errors
- [ ] All modals tested manually
- [ ] Build succeeds
- [ ] 40% code reduction achieved

## 📚 Documentation

- **Standard**: `/frontend/MODAL_STANDARD.md`
- **Implementation**: `/MODAL_REFACTOR_IMPLEMENTATION.md`
- **Script**: `/scripts/refactor-modals.js`
- **Template**: `/frontend/src/pages/services/crm/components/ContactModal.refactored.tsx`

---

**Ready to execute!** Start with CRM modals for highest impact.
