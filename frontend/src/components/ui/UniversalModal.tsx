import React, { useState, useEffect } from 'react'
import { useForm, UseFormReturn, FieldValues } from 'react-hook-form'
import { ModalForm, FormField } from './ModalForm'
import { Input } from './Input'
import toast from 'react-hot-toast'

export interface UniversalField {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'multi-select'
  required?: boolean
  placeholder?: string
  options?: { value: string | number; label: string }[]
  rows?: number
  validation?: any
  defaultValue?: any
  disabled?: boolean
  description?: string
}

interface UniversalModalProps<T extends FieldValues = any> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: UniversalField[]
  onSubmit: (data: T) => Promise<void>
  editData?: T
  size?: 'sm' | 'md' | 'lg' | 'xl'
  submitLabel?: string
  cancelLabel?: string
}

export function UniversalModal<T extends FieldValues = any>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  editData,
  size = 'md',
  submitLabel,
  cancelLabel
}: UniversalModalProps<T>) {
  const [loading, setLoading] = useState(false)
  const isEditMode = !!editData

  const defaultValues = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : field.type === 'multi-select' ? [] : '')
    return acc
  }, {} as any)

  const form = useForm<T>({
    mode: 'onChange',
    defaultValues: defaultValues as T
  })

  const { register, formState: { errors }, reset, watch, setValue } = form

  useEffect(() => {
    if (editData) {
      reset(editData)
    } else {
      reset(defaultValues as T)
    }
  }, [editData, reset, open])

  const handleSubmit = async (data: T) => {
    try {
      setLoading(true)
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field: UniversalField) => {
    const error = errors[field.name]?.message as string | undefined

    switch (field.type) {
      case 'textarea':
        return (
          <FormField label={field.label} error={error} required={field.required}>
            <textarea
              {...register(field.name as any, field.validation)}
              rows={field.rows || 3}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
          </FormField>
        )

      case 'select':
        return (
          <FormField label={field.label} error={error} required={field.required}>
            <select
              {...register(field.name as any, field.validation)}
              disabled={field.disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
          </FormField>
        )

      case 'multi-select':
        const selectedValues = watch(field.name as any) || []
        return (
          <FormField label={field.label} error={error} required={field.required}>
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              {field.options?.map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(opt.value)}
                    onChange={(e) => {
                      const current = selectedValues
                      const updated = e.target.checked
                        ? [...current, opt.value]
                        : current.filter((v: any) => v !== opt.value)
                      setValue(field.name as any, updated, { shouldValidate: true })
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
          </FormField>
        )

      case 'checkbox':
        return (
          <FormField label={field.label} error={error}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register(field.name as any, field.validation)}
                disabled={field.disabled}
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm">{field.description || field.label}</span>
            </label>
          </FormField>
        )

      default:
        return (
          <FormField label={field.label} error={error} required={field.required}>
            <Input
              {...register(field.name as any, field.validation)}
              type={field.type || 'text'}
              placeholder={field.placeholder}
              disabled={field.disabled}
            />
            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
          </FormField>
        )
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      form={form}
      onSubmit={handleSubmit}
      size={size}
      loading={loading}
      submitLabel={submitLabel || (isEditMode ? 'Update' : 'Create')}
      cancelLabel={cancelLabel}
    >
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.name}>{renderField(field)}</div>
        ))}
      </div>
    </ModalForm>
  )
}
