import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '@/ui/sap/components/ModalForm'
import { Input } from '@/ui/sap/components/Input'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { controlPlaneService } from '@/services/controlPlaneService'

interface CreateTenantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface TenantFormData {
  name: string
  code: string
  admin_email?: string
  contact_phone?: string
  industry?: string
  timezone?: string
}

const INDUSTRIES = ['Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail', 'Education', 'Construction', 'Energy', 'Other']
const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore']

// Slugify helper
const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const form = useForm<TenantFormData>({
    defaultValues: {
      name: '',
      code: '',
      admin_email: '',
      contact_phone: '',
      industry: '',
      timezone: 'UTC'
    }
  })

  const { register, formState: { errors }, reset, setValue, watch } = form
  const tenantName = watch('name')

  // Auto-generate code from name
  React.useEffect(() => {
    if (tenantName && !form.getValues('code')) {
      setValue('code', slugify(tenantName))
    }
  }, [tenantName, form, setValue])

  const onSubmit = async (data: TenantFormData) => {
    try {
      setLoading(true)
      await controlPlaneService.createTenant(data)
      toast.success('Tenant created successfully')
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title="Create Tenant"
      description="Add a new tenant to the platform"
      form={form}
      onSubmit={onSubmit}
      size="md"
      loading={loading}
      submitLabel="Create Tenant"
    >
      <div className="space-y-4">
        <FormField label="Tenant Name" error={errors.name?.message} required>
          <Input
            {...register('name', { required: 'Tenant name is required' })}
            placeholder="Enter tenant name"
            autoFocus
          />
        </FormField>

        <FormField label="Tenant Code" error={errors.code?.message} required>
          <Input
            {...register('code', { 
              required: 'Tenant code is required',
              pattern: {
                value: /^[a-z0-9-]+$/,
                message: 'Code must be lowercase letters, numbers, and hyphens only'
              }
            })}
            placeholder="tenant-code"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Auto-generated from name, but you can edit it
          </p>
        </FormField>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <FormField label="Admin Email" error={errors.admin_email?.message}>
              <Input
                type="email"
                {...register('admin_email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address'
                  }
                })}
                placeholder="admin@example.com"
              />
            </FormField>

            <FormField label="Contact Phone" error={errors.contact_phone?.message}>
              <Input
                {...register('contact_phone')}
                placeholder="+1 (555) 123-4567"
              />
            </FormField>

            <FormField label="Industry">
              <select
                {...register('industry')}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Timezone">
              <select
                {...register('timezone')}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </div>
    </ModalForm>
  )
}
