# Modal System Quick Reference

## 🚀 Quick Start

### 1. Simple Display Modal
```tsx
import { SimpleDialog } from '@/components/ui/AppDialog'

<SimpleDialog
  open={open}
  onOpenChange={setOpen}
  title="View Details"
  size="md"
>
  <p>Your content here</p>
</SimpleDialog>
```

### 2. Confirmation Modal
```tsx
<SimpleDialog
  open={open}
  onOpenChange={setOpen}
  title="Confirm Action"
  description="Are you sure?"
  primaryAction={{
    label: 'Confirm',
    onClick: handleConfirm,
    variant: 'danger'
  }}
  secondaryAction={{
    label: 'Cancel',
    onClick: () => setOpen(false)
  }}
>
  <p>Additional details...</p>
</SimpleDialog>
```

### 3. Form Modal (Recommended)
```tsx
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '@/components/ui/ModalForm'
import { Input } from '@/components/ui/Input'

interface FormData {
  name: string
  email: string
}

const form = useForm<FormData>({
  mode: 'onChange',
  defaultValues: { name: '', email: '' }
})

const onSubmit = async (data: FormData) => {
  await api.create(data)
  toast.success('Created!')
  form.reset()
  setOpen(false)
}

<ModalForm
  open={open}
  onOpenChange={setOpen}
  title="Create Item"
  description="Fill in the details"
  form={form}
  onSubmit={onSubmit}
  submitLabel="Create"
  size="lg"
>
  <div className="space-y-4">
    <FormField 
      label="Name" 
      error={form.formState.errors.name?.message} 
      required
    >
      <Input 
        {...form.register('name', { 
          required: 'Name is required',
          minLength: { value: 2, message: 'Min 2 chars' }
        })} 
        placeholder="Enter name"
      />
    </FormField>

    <FormField 
      label="Email" 
      error={form.formState.errors.email?.message}
      required
    >
      <Input 
        {...form.register('email', { 
          required: 'Email is required',
          pattern: { 
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
            message: 'Invalid email' 
          }
        })} 
        type="email"
        placeholder="email@example.com"
      />
    </FormField>
  </div>
</ModalForm>
```

### 4. Custom Layout Modal
```tsx
import { 
  AppDialog, 
  AppDialogHeader, 
  AppDialogBody, 
  AppDialogFooter,
  AppDialogTitle,
  AppDialogCloseButton 
} from '@/components/ui/AppDialog'

<AppDialog open={open} onOpenChange={setOpen} size="xl">
  <AppDialogHeader>
    <AppDialogTitle>Custom Layout</AppDialogTitle>
    <AppDialogCloseButton onClose={() => setOpen(false)} />
  </AppDialogHeader>

  <AppDialogBody>
    <div className="space-y-6">
      {/* Your custom content */}
    </div>
  </AppDialogBody>

  <AppDialogFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>
      Cancel
    </Button>
    <Button onClick={handleSave}>
      Save
    </Button>
  </AppDialogFooter>
</AppDialog>
```

## 📋 Props Reference

### AppDialog
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | required | Open state |
| `onOpenChange` | `(open: boolean) => void` | required | State setter |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'fullscreen'` | `'md'` | Modal size |
| `loading` | `boolean` | `false` | Prevents closing |
| `closeOnOutsideClick` | `boolean` | `true` | Click outside behavior |
| `className` | `string` | `''` | Additional classes |

### SimpleDialog
Extends AppDialog with:
| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Modal title |
| `description` | `string` | Optional description |
| `primaryAction` | `{ label, onClick, variant? }` | Primary button |
| `secondaryAction` | `{ label, onClick }` | Secondary button |

### ModalForm
| Prop | Type | Description |
|------|------|-------------|
| `form` | `UseFormReturn<T>` | react-hook-form instance |
| `onSubmit` | `SubmitHandler<T>` | Form submit handler |
| `submitLabel` | `string` | Submit button text |
| `cancelLabel` | `string` | Cancel button text |
| `submitVariant` | Button variant | Submit button style |

## 🎨 Sizes

- `sm` - 384px (24rem)
- `md` - 512px (32rem) - Default
- `lg` - 672px (42rem)
- `xl` - 896px (56rem)
- `fullscreen` - 95vw x 95vh

## 🎯 Button Variants

- `primary` - Blue (default action)
- `secondary` - Gray
- `outline` - Bordered
- `ghost` - Transparent
- `danger` - Red (destructive)
- `success` - Green

## ⌨️ Keyboard Shortcuts

- `ESC` - Close modal
- `Ctrl/Cmd + Enter` - Submit form (in ModalForm)
- `Tab` - Cycle through focusable elements

## ✅ Validation Example

```tsx
const form = useForm<FormData>({
  mode: 'onChange', // Validate on change
  defaultValues: { ... }
})

// In JSX:
<Input 
  {...form.register('field', {
    required: 'This field is required',
    minLength: { value: 3, message: 'Min 3 characters' },
    maxLength: { value: 50, message: 'Max 50 characters' },
    pattern: { 
      value: /^[a-z0-9-]+$/, 
      message: 'Only lowercase, numbers, hyphens' 
    },
    validate: {
      unique: async (value) => {
        const exists = await checkUnique(value)
        return !exists || 'Already exists'
      }
    }
  })} 
/>
```

## 🔄 Migration Checklist

When migrating an old modal:

1. ✅ Change `isOpen` → `open`
2. ✅ Change `onClose` → `onOpenChange`
3. ✅ Replace `Modal` with `AppDialog` or `SimpleDialog` or `ModalForm`
4. ✅ Use `FormField` for form inputs
5. ✅ Add validation with react-hook-form
6. ✅ Test ESC key, outside click, form submission
7. ✅ Test mobile view
8. ✅ Verify no visual regression

## 📱 Mobile Behavior

- Automatically switches to bottom sheet on mobile
- Slide-in animation from bottom
- Full width with rounded top corners
- Touch-friendly spacing

## 🎭 Examples in Codebase

- ✅ `CreateTenantModal.tsx` - Form with validation
- ✅ `CompanyDeleteModal.tsx` - Confirmation with custom content
- See `MODAL_MIGRATION_GUIDE.md` for more examples

## 🐛 Common Issues

**Issue**: Form doesn't submit
- ✅ Check `form.formState.isValid`
- ✅ Ensure all required fields have validation
- ✅ Check console for validation errors

**Issue**: Modal doesn't close
- ✅ Check if `loading` prop is true
- ✅ Verify `onOpenChange` is called correctly

**Issue**: TypeScript errors
- ✅ Import types: `import type { UseFormReturn } from 'react-hook-form'`
- ✅ Use correct button variants

## 📚 Related Files

- `src/components/ui/AppDialog.tsx`
- `src/components/ui/ModalForm.tsx`
- `MODAL_MIGRATION_GUIDE.md`
- `MODAL_SYSTEM_REFACTORING_COMPLETE.md`
