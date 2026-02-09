import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '@/ui/sap/components/AppDialog'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import toast from 'react-hot-toast'
import { controlPlaneService, MasterAdmin } from '../../services/controlPlaneService'

interface EditMasterAdminModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  master: MasterAdmin | null
  onSuccess: () => void
}

const TIMEZONES = ['UTC', 'Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore']
const LANGUAGES = [{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }, { value: 'fr', label: 'French' }, { value: 'de', label: 'German' }, { value: 'hi', label: 'Hindi' }]
const ROLES = [{ value: 'admin', label: 'Administrator' }, { value: 'manager', label: 'Manager' }, { value: 'viewer', label: 'Viewer' }]

export const EditMasterAdminModal: React.FC<EditMasterAdminModalProps> = ({ open, onOpenChange, master, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (master) reset(master)
  }, [master, reset])

  const onSubmit = async (data: any) => {
    if (!master) return
    try {
      setLoading(true)
      await controlPlaneService.updateMaster(master.id, data)
      toast.success('Master admin updated successfully')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update master admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} size="md">
      <AppDialogHeader>
        <AppDialogTitle>Edit Master Admin</AppDialogTitle>
        <AppDialogCloseButton onClose={() => onOpenChange(false)} disabled={loading} />
      </AppDialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
      <AppDialogBody className="space-y-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Email (read-only)</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{master?.email}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" {...register('first_name')} />
          <Input label="Last Name" {...register('last_name')} />
        </div>
        <Input label="Phone" {...register('phone')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Designation" {...register('designation')} />
          <Input label="Department" {...register('department')} />
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
      </AppDialogBody>
      <AppDialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Master Admin'}</Button>
      </AppDialogFooter>
      </form>
    </AppDialog>
  )
}
