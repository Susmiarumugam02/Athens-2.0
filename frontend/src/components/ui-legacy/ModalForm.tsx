import React, { useCallback } from 'react'
import type { UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form'
import { AppDialog, AppDialogHeader, AppDialogBody, AppDialogFooter, AppDialogTitle, AppDialogDescription, AppDialogCloseButton } from './AppDialog'
import { Button } from './Button'

interface ModalFormProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: UseFormReturn<T>
  onSubmit: SubmitHandler<T>
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  submitVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
}

export function ModalForm<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  form,
  onSubmit,
  children,
  size = 'md',
  loading = false,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitVariant = 'primary'
}: ModalFormProps<T>) {
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    form.handleSubmit(onSubmit)(e)
  }, [form, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      form.handleSubmit(onSubmit)()
    }
  }, [form, onSubmit])

  const isValid = form.formState.isValid
  const isSubmitting = form.formState.isSubmitting || loading

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      loading={isSubmitting}
      closeOnOutsideClick={!isSubmitting}
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <AppDialogHeader>
          <div className="flex-1">
            <AppDialogTitle>{title}</AppDialogTitle>
            {description && <AppDialogDescription>{description}</AppDialogDescription>}
          </div>
          <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={isSubmitting} />
        </AppDialogHeader>

        <AppDialogBody>
          {children}
        </AppDialogBody>

        <AppDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant={submitVariant}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </AppDialogFooter>
      </form>
    </AppDialog>
  )
}

// Form field wrapper with error display
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    )}
  </div>
)
