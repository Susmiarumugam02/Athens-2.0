# Modal System Migration Guide

## Overview
This guide explains how to migrate from the old `Modal` component to the new `AppDialog` system.

## New Components

### Core Components
- `AppDialog` - Base dialog wrapper
- `AppDialogHeader` - Header section with title/description
- `AppDialogBody` - Scrollable content area
- `AppDialogFooter` - Action buttons area
- `AppDialogTitle` - Title text
- `AppDialogDescription` - Description text
- `AppDialogCloseButton` - Close button with X icon

### Convenience Components
- `SimpleDialog` - Pre-configured dialog with common pattern
- `ModalForm` - Form-specific dialog with react-hook-form integration
- `FormField` - Form field wrapper with label and error display

## Migration Steps

### 1. Simple Modal (View/Display)

**Before:**
```tsx
import { Modal } from '../ui/Modal'

<Modal isOpen={open} onClose={() => setOpen(false)} title="View Details">
  <div className="space-y-4">
    <p>Content here</p>
  </div>
</Modal>
```

**After:**
```tsx
import { SimpleDialog } from '../ui/AppDialog'

<SimpleDialog
  open={open}
  onOpenChange={setOpen}
  title="View Details"
  description="Optional description"
  size="md"
>
  <div className="space-y-4">
    <p>Content here</p>
  </div>
</SimpleDialog>
```

### 2. Modal with Actions

**Before:**
```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Confirm Action">
  <div className="space-y-4">
    <p>Are you sure?</p>
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </div>
  </div>
</Modal>
```

**After:**
```tsx
<SimpleDialog
  open={open}
  onOpenChange={setOpen}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  primaryAction={{
    label: 'Confirm',
    onClick: handleConfirm
  }}
  secondaryAction={{
    label: 'Cancel',
    onClick: () => setOpen(false)
  }}
>
  <p>Additional content if needed</p>
</SimpleDialog>
```

### 3. Form Modal (with react-hook-form)

**Before:**
```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Create Item">
  <form onSubmit={handleSubmit}>
    <div className="space-y-4">
      <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
      <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} />
    </div>
    <div className="flex justify-end gap-3 mt-6">
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button type="submit">Create</Button>
    </div>
  </form>
</Modal>
```

**After:**
```tsx
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'

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
  form.reset()
  setOpen(false)
}

<ModalForm
  open={open}
  onOpenChange={setOpen}
  title="Create Item"
  form={form}
  onSubmit={onSubmit}
  submitLabel="Create"
>
  <div className="space-y-4">
    <FormField label="Name" error={form.formState.errors.name?.message} required>
      <Input {...form.register('name', { required: 'Name is required' })} />
    </FormField>
    <FormField label="Email" error={form.formState.errors.email?.message} required>
      <Input {...form.register('email', { 
        required: 'Email is required',
        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
      })} />
    </FormField>
  </div>
</ModalForm>
```

### 4. Custom Layout Modal

**Before:**
```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Custom">
  <div>Custom content</div>
</Modal>
```

**After:**
```tsx
import { AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppDialogTitle, AppDialogCloseButton } from '../ui/AppDialog'

<AppDialog open={open} onOpenChange={setOpen} size="lg">
  <AppDialogHeader>
    <AppDialogTitle>Custom Layout</AppDialogTitle>
    <AppDialogCloseButton onClose={() => setOpen(false)} />
  </AppDialogHeader>
  <AppDialogBody>
    <div>Custom content with full control</div>
  </AppDialogBody>
  <AppDialogFooter>
    <Button onClick={() => setOpen(false)}>Close</Button>
  </AppDialogFooter>
</AppDialog>
```

## Key Differences

### Props
- `isOpen` → `open`
- `onClose` → `onOpenChange(false)`
- `visible` → `open`
- `maskClosable` → `closeOnOutsideClick`

### Sizes
- Same: `sm`, `md`, `lg`, `xl`
- New: `fullscreen`

### Features
- ✅ Better mobile responsiveness (bottom sheet on mobile)
- ✅ Built-in loading state
- ✅ Form validation integration
- ✅ Keyboard shortcuts (Enter to submit in forms)
- ✅ Better accessibility
- ✅ Performance optimized with React.memo

## Benefits

1. **Consistency** - All modals look and behave the same
2. **Type Safety** - Full TypeScript support
3. **Validation** - Built-in form validation with react-hook-form
4. **Accessibility** - Focus trap, ESC key, ARIA labels
5. **Performance** - Optimized re-renders, lazy mounting
6. **Mobile First** - Responsive design out of the box
7. **Developer Experience** - Less boilerplate, cleaner code

## Modals to Migrate

Priority order:
1. ✅ CreateTenantModal - DONE (example implementation)
2. CompanyEditModal
3. CompanyDeleteModal
4. CompanyApprovalModal
5. PasswordChangeModal
6. All CRM modals
7. All HR modals
8. All Finance modals

## Testing Checklist

After migration, verify:
- [ ] Modal opens and closes correctly
- [ ] ESC key closes modal
- [ ] Click outside closes modal (unless loading)
- [ ] Form validation works
- [ ] Submit button disabled when invalid
- [ ] Loading state prevents closing
- [ ] Mobile view works (bottom sheet or full screen)
- [ ] Focus trap works (Tab cycles through elements)
- [ ] Keyboard submit works (Ctrl/Cmd + Enter)
