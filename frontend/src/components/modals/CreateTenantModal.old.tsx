import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { controlPlaneService } from '../../services/controlPlaneService'

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
const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles', 'America/Chicago', 'Europe/Paris', 'Asia/Shanghai']

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm<TenantFormData>()

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
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title="Create Tenant">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Tenant Name"
          {...register('name', { required: 'Name is required' })}
          error={errors.name?.message}
          placeholder="Enter tenant name"
          autoFocus
        />
        <Input
          label="Tenant Code"
          {...register('code', { required: 'Code is required' })}
          error={errors.code?.message}
          placeholder="e.g., acme-corp"
        />

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} Additional Details
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Input
              label="Admin Email"
              type="email"
              {...register('admin_email')}
              placeholder="admin@example.com"
            />
            <Input
              label="Contact Phone"
              {...register('contact_phone')}
              placeholder="+1 (555) 123-4567"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Industry</label>
              <select {...register('industry')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
              <select {...register('timezone')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Select timezone</option>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Tenant'}</Button>
        </div>
      </form>
    </Modal>
  )
}
