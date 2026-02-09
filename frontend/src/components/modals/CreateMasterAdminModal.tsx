import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { controlPlaneService, Tenant } from '../../services/controlPlaneService'

interface CreateMasterAdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore']
const LANGUAGES = [{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'hi', label: 'Hindi' }]
const ROLES = [{ value: 'admin', label: 'Administrator' }, { value: 'manager', label: 'Manager' }, { value: 'viewer', label: 'Viewer' }]

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export const CreateMasterAdminModal: React.FC<CreateMasterAdminModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [autoPassword, setAutoPassword] = useState(generatePassword())
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm()

  useEffect(() => {
    if (open) {
      controlPlaneService.getTenants().then(res => setTenants(res.data.filter(t => t.is_active)))
      setValue('user_password', autoPassword)
    }
  }, [open, autoPassword, setValue])

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      await controlPlaneService.createMaster({ ...data, tenant: parseInt(data.tenant) })
      toast.success(`Master admin created! Password: ${data.user_password}`, { duration: 10000 })
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create master admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <AppDialogTitle>Create Master Admin</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={loading} />
      </AppDialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
      <AppDialogBody className="space-y-4">
        <Input label="Email" type="email" {...register('user_email', { required: 'Email is required' })} error={errors.user_email?.message} autoFocus />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
          <div className="flex gap-2">
            <Input {...register('user_password', { required: 'Password is required' })} type="text" value={autoPassword} onChange={(e) => setAutoPassword(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => { const newPwd = generatePassword(); setAutoPassword(newPwd); setValue('user_password', newPwd) }} title="Generate new password">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Auto-generated secure password</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tenant *</label>
          <select {...register('tenant', { required: 'Tenant is required' })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">Select tenant</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.tenant && <p className="text-red-500 text-xs mt-1">{errors.tenant.message as string}</p>}
        </div>

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? 'Hide' : 'Show'} Additional Details
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" {...register('first_name')} />
              <Input label="Last Name" {...register('last_name')} />
            </div>
            <Input label="Phone" {...register('phone')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Designation" {...register('designation')} placeholder="e.g., IT Manager" />
              <Input label="Department" {...register('department')} placeholder="e.g., IT" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                <select {...register('role')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Timezone</label>
                <select {...register('timezone')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Language</label>
                <select {...register('language')} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea {...register('notes')} rows={3} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
            </div>
          </div>
        )}

      </AppDialogBody>
      <AppDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Master Admin'}</Button>
      </AppDialogFooter>
      </form>
    </AppDialog>
  )
}
