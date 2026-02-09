# Standard Modal Template

All modals in Athens 2.0 must follow this standardized pattern based on the Create Tenant Modal.

## Components Used

1. **ModalForm** - Main wrapper for form-based modals
2. **FormField** - Standardized field wrapper with label and error display
3. **AppDialog** - Base dialog component (for non-form modals)

## Standard Pattern

```tsx
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'
import toast from 'react-hot-toast'

interface YourModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: YourDataType // Optional for edit mode
}

interface FormData {
  field1: string
  field2: string
  // ... more fields
}

export const YourModal: React.FC<YourModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editData
}) => {
  const [loading, setLoading] = useState(false)
  const isEditMode = !!editData

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: editData || {
      field1: '',
      field2: ''
    }
  })

  const { register, formState: { errors } } = form

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true)
      
      if (isEditMode) {
        await yourApi.update(editData.id, data)
        toast.success('Updated successfully')
      } else {
        await yourApi.create(data)
        toast.success('Created successfully')
      }
      
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Item' : 'Create New Item'}
      description="Brief description of what this modal does"
      form={form}
      onSubmit={onSubmit}
      size="lg"
      loading={loading}
      submitLabel={isEditMode ? 'Update' : 'Create'}
    >
      <div className="space-y-4">
        <FormField
          label="Field 1"
          error={errors.field1?.message}
          required
        >
          <Input
            {...register('field1', {
              required: 'Field 1 is required',
              minLength: { value: 2, message: 'Minimum 2 characters' }
            })}
            placeholder="Enter field 1"
            autoFocus
          />
        </FormField>

        <FormField
          label="Field 2"
          error={errors.field2?.message}
        >
          <Input
            {...register('field2')}
            placeholder="Enter field 2 (optional)"
          />
        </FormField>
      </div>
    </ModalForm>
  )
}
```

## Key Features

### 1. Props Interface
- `open: boolean` - Controls modal visibility
- `onOpenChange: (open: boolean) => void` - Callback to close modal
- `onSuccess: () => void` - Callback after successful operation
- `editData?: T` - Optional data for edit mode

### 2. Form Management
- Use `react-hook-form` for all forms
- Set `mode: 'onChange'` for real-time validation
- Provide `defaultValues` for all fields

### 3. Loading State
- Local `loading` state for submit button
- Pass to `ModalForm` component
- Disable form during submission

### 4. Edit Mode Support
- Detect edit mode: `const isEditMode = !!editData`
- Conditional title: `isEditMode ? 'Edit' : 'Create'`
- Conditional submit label: `isEditMode ? 'Update' : 'Create'`
- Pre-fill form with `editData`

### 5. Error Handling
- Try-catch around API calls
- Toast notifications for success/error
- Display backend error messages

### 6. Form Reset
- Call `form.reset()` after successful submission
- Close modal with `onOpenChange(false)`
- Trigger parent refresh with `onSuccess()`

### 7. Validation
- Use `register` with validation rules
- Display errors with `FormField` component
- Required fields marked with red asterisk

### 8. Size Options
- `sm` - Small (max-w-sm)
- `md` - Medium (max-w-md) - Default
- `lg` - Large (max-w-2xl)
- `xl` - Extra Large (max-w-4xl)
- `fullscreen` - Full screen (95vw x 95vh)

## Advanced Features

### Collapsible Sections
```tsx
const [showAdvanced, setShowAdvanced] = useState(false)

<button
  type="button"
  onClick={() => setShowAdvanced(!showAdvanced)}
  className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
>
  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
</button>

{showAdvanced && (
  <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
    {/* Advanced fields */}
  </div>
)}
```

### Auto-Generated Fields
```tsx
const nameValue = watch('name')

useEffect(() => {
  if (nameValue && !form.formState.dirtyFields.code) {
    setValue('code', generateSlug(nameValue), { shouldValidate: true })
  }
}, [nameValue, form.formState.dirtyFields.code, setValue])
```

### Conditional Fields
```tsx
const typeValue = watch('type')

{typeValue === 'specific' && (
  <FormField label="Specific Options">
    {/* Conditional fields */}
  </FormField>
)}
```

## Non-Form Modals

For modals without forms (e.g., confirmation dialogs), use `SimpleDialog`:

```tsx
import { SimpleDialog } from '../ui/AppDialog'

<SimpleDialog
  open={open}
  onOpenChange={onOpenChange}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  size="sm"
  primaryAction={{
    label: 'Confirm',
    onClick: handleConfirm,
    variant: 'danger'
  }}
  secondaryAction={{
    label: 'Cancel',
    onClick: () => onOpenChange(false)
  }}
>
  <p>Additional content here</p>
</SimpleDialog>
```

## DO NOT

❌ Create custom modal wrappers  
❌ Use inline styles  
❌ Skip validation  
❌ Forget loading states  
❌ Ignore error handling  
❌ Skip form reset after submission  
❌ Use different modal libraries  

## DO

✅ Use ModalForm for all form modals  
✅ Use FormField for all form fields  
✅ Implement proper validation  
✅ Show loading states  
✅ Handle errors gracefully  
✅ Reset form after submission  
✅ Support both create and edit modes  
✅ Use consistent sizing  
✅ Follow the standard pattern exactly
