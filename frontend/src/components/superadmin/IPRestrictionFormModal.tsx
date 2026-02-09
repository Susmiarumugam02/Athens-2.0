import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'
import toast from 'react-hot-toast'
import { superadminApi } from '@/services/superadmin/superadminApi'

interface IPRestrictionFormModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  onSuccess: () => void
}

interface IPRestrictionFormData {
  ip_address: string
  ip_range: string
  restriction_type: 'allow' | 'deny'
  description: string
  is_active: boolean
}

export const IPRestrictionFormModal: React.FC<IPRestrictionFormModalProps> = ({
  open = false,
  onOpenChange,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)

  const form = useForm<IPRestrictionFormData>({
    mode: 'onChange',
    defaultValues: {
      ip_address: '',
      ip_range: '',
      restriction_type: 'allow',
      description: '',
      is_active: true
    }
  })

  const { register, formState: { errors }, watch } = form
  const ipAddress = watch('ip_address')
  const ipRange = watch('ip_range')

  const onSubmit = async (data: IPRestrictionFormData) => {
    // Validate that at least one IP field is filled
    if (!data.ip_address && !data.ip_range) {
      toast.error('Either IP address or IP range is required')
      return
    }

    try {
      setLoading(true)
      
      await superadminApi.security.createIPRestriction(data)
      toast.success('IP restriction added successfully')
      
      form.reset()
      if (onOpenChange) onOpenChange(false)
      if (onClose) onClose()
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange || (() => {})}
      title="Add IP Restriction"
      description="Configure IP-based access control"
      form={form}
      onSubmit={onSubmit}
      size="md"
      loading={loading}
      submitLabel="Add Restriction"
    >
      <div className="space-y-4">
        <FormField
          label="IP Address"
          error={errors.ip_address?.message}
        >
          <Input
            {...register('ip_address')}
            placeholder="192.168.1.1"
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Single IP address
          </p>
        </FormField>

        <FormField
          label="IP Range (CIDR)"
          error={errors.ip_range?.message}
        >
          <Input
            {...register('ip_range')}
            placeholder="192.168.1.0/24"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            IP range in CIDR notation
          </p>
        </FormField>

        {!ipAddress && !ipRange && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Either IP address or IP range is required
            </p>
          </div>
        )}

        <FormField
          label="Restriction Type"
          error={errors.restriction_type?.message}
          required
        >
          <select
            {...register('restriction_type')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
          </select>
        </FormField>

        <FormField
          label="Description"
          error={errors.description?.message}
          required
        >
          <textarea
            {...register('description', {
              required: 'Description is required',
              minLength: { value: 5, message: 'Description must be at least 5 characters' }
            })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Describe the purpose of this restriction"
          />
        </FormField>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('is_active')}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Active
          </span>
        </label>
      </div>
    </ModalForm>
  )
}

export default IPRestrictionFormModal
