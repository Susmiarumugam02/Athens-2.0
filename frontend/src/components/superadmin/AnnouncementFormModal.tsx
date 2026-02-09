import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'
import toast from 'react-hot-toast'
import { superadminApi } from '@/services/superadmin/superadminApi'

interface AnnouncementFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: {
    id: number
    title: string
    message: string
    type: 'info' | 'warning' | 'critical'
    target_audience: 'all' | 'roles'
    target_roles: number[]
    scheduled_at: string | null
    expires_at: string | null
  }
}

interface AnnouncementFormData {
  title: string
  message: string
  type: 'info' | 'warning' | 'critical'
  target_audience: 'all' | 'roles'
  target_roles: number[]
  scheduled_at: string
  expires_at: string
}

interface Role {
  id: number
  name: string
}

export const AnnouncementFormModal: React.FC<AnnouncementFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editData
}) => {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const isEditMode = !!editData

  const form = useForm<AnnouncementFormData>({
    mode: 'onChange',
    defaultValues: editData ? {
      title: editData.title,
      message: editData.message,
      type: editData.type,
      target_audience: editData.target_audience,
      target_roles: editData.target_roles,
      scheduled_at: editData.scheduled_at ? editData.scheduled_at.split('T')[0] : '',
      expires_at: editData.expires_at ? editData.expires_at.split('T')[0] : ''
    } : {
      title: '',
      message: '',
      type: 'info',
      target_audience: 'all',
      target_roles: [],
      scheduled_at: '',
      expires_at: ''
    }
  })

  const { register, formState: { errors }, watch, setValue } = form
  const targetAudience = watch('target_audience')
  const selectedRoles = watch('target_roles')

  // Load roles
  useEffect(() => {
    if (open) {
      superadminApi.roles.list()
        .then((res: any) => setRoles(res.data))
        .catch(() => toast.error('Failed to load roles'))
    }
  }, [open])

  const handleRoleToggle = (roleId: number) => {
    const current = selectedRoles || []
    const updated = current.includes(roleId)
      ? current.filter(id => id !== roleId)
      : [...current, roleId]
    setValue('target_roles', updated, { shouldValidate: true })
  }

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      setLoading(true)
      
      const payload = {
        ...data,
        scheduled_at: data.scheduled_at || null,
        expires_at: data.expires_at || null
      }

      if (isEditMode) {
        await superadminApi.announcements.update(editData.id, payload)
        toast.success('Announcement updated successfully')
      } else {
        await superadminApi.announcements.create(payload)
        toast.success('Announcement created successfully')
      }
      
      form.reset()
      onOpenChange(false)
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
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Announcement' : 'Create New Announcement'}
      description={isEditMode ? 'Update announcement details' : 'Create a new platform announcement'}
      form={form}
      onSubmit={onSubmit}
      size="lg"
      loading={loading}
      submitLabel={isEditMode ? 'Update Announcement' : 'Create Announcement'}
    >
      <div className="space-y-4">
        <FormField
          label="Title"
          error={errors.title?.message}
          required
        >
          <Input
            {...register('title', {
              required: 'Title is required',
              minLength: { value: 3, message: 'Title must be at least 3 characters' }
            })}
            placeholder="Enter announcement title"
            autoFocus
          />
        </FormField>

        <FormField
          label="Message"
          error={errors.message?.message}
          required
        >
          <textarea
            {...register('message', {
              required: 'Message is required',
              minLength: { value: 10, message: 'Message must be at least 10 characters' }
            })}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter announcement message"
          />
        </FormField>

        <FormField
          label="Type"
          error={errors.type?.message}
          required
        >
          <select
            {...register('type')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </FormField>

        <FormField
          label="Target Audience"
          error={errors.target_audience?.message}
          required
        >
          <select
            {...register('target_audience')}
            onChange={(e) => {
              setValue('target_audience', e.target.value as 'all' | 'roles')
              setValue('target_roles', [])
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Users</option>
            <option value="roles">Specific Roles</option>
          </select>
        </FormField>

        {targetAudience === 'roles' && (
          <FormField
            label="Select Roles"
            error={errors.target_roles?.message}
            required
          >
            <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles?.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{role.name}</span>
                </label>
              ))}
            </div>
            {targetAudience === 'roles' && (!selectedRoles || selectedRoles.length === 0) && (
              <p className="text-sm text-red-600 dark:text-red-400">At least one role is required</p>
            )}
          </FormField>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Scheduled At"
            error={errors.scheduled_at?.message}
          >
            <Input
              {...register('scheduled_at')}
              type="date"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional</p>
          </FormField>

          <FormField
            label="Expires At"
            error={errors.expires_at?.message}
          >
            <Input
              {...register('expires_at')}
              type="date"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional</p>
          </FormField>
        </div>
      </div>
    </ModalForm>
  )
}

export default AnnouncementFormModal
