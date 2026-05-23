import React from 'react'
import { type UseFormReturn, type FieldValues } from 'react-hook-form'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from './AppDialog'
import { Button } from './Button'

interface ModalFormProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  form: UseFormReturn<T>
  onSubmit: (data: T) => void | Promise<void>
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  loading?: boolean
  submitLabel?: string
  cancelLabel?: string
  preventCloseOnLoading?: boolean
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
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  preventCloseOnLoading = true
}: ModalFormProps<T>) {
  const handleClose = () => {
    if (!loading || !preventCloseOnLoading) {
      onOpenChange(false)
    }
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data)
  })

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={size}
      loading={loading}
      closeOnOutsideClick={!loading || !preventCloseOnLoading}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <AppDialogHeader>
          <div className="flex-1">
            <AppDialogTitle>{title}</AppDialogTitle>
            {description && <AppDialogDescription>{description}</AppDialogDescription>}
          </div>
          <AppDialogCloseButton onClose={handleClose} disabled={loading && preventCloseOnLoading} />
        </AppDialogHeader>

        <AppDialogBody>
          {children}
        </AppDialogBody>

        <AppDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading && preventCloseOnLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : submitLabel}
          </Button>
        </AppDialogFooter>
      </form>
    </AppDialog>
  )
}

// Form field wrapper for consistent styling
interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({ label, error, required, children, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
  </div>
)
