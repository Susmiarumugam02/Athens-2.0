import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'
import { controlPlaneService } from '../../services/controlPlaneService'
import type { Tenant } from '../../services/controlPlaneService'

interface EditTenantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenant: Tenant | null
  onSuccess: () => void
}

const INDUSTRIES = ['Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail', 'Education', 'Construction', 'Energy', 'Other']
const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'America/Los_Angeles', 'America/Chicago', 'Europe/Paris', 'Asia/Shanghai']

export const EditTenantModal: React.FC<EditTenantModalProps> = ({ open, onOpenChange, tenant, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  useEffect(() => {
    if (tenant) {
      reset(tenant)
    }
  }, [tenant, reset])

  const onSubmit = async (data: any) => {
    if (!tenant) return
    try {
      setLoading(true)
      await controlPlaneService.updateTenant(tenant.id, data)
      toast.success('Tenant updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <AppDialogHeader>
          <AppDialogTitle>Edit Tenant</AppDialogTitle>
          <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={loading} />
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
        <Input label="Tenant Name" {...register('name', { required: 'Name is required' })} error={errors.name?.message} />
        <Input label="Tenant Code" {...register('code', { required: 'Code is required' })} error={errors.code?.message} />
        <Input label="Admin Email" type="email" {...register('admin_email')} />
        <Input label="Contact Phone" {...register('contact_phone')} />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Industry</label>
          <select {...register('industry')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">Select industry</option>
            {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
          <select {...register('timezone')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">Select timezone</option>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Tenant'}</Button>
        </AppDialogFooter>
      </form>
    </AppDialog>
  )
}
