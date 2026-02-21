import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'
import { Checkbox } from '../ui/Checkbox'
import toast from 'react-hot-toast'
import { superadminApi, type Role } from '@/services/superadmin/superadminApi'

interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: {
    id: number
    email: string
    is_active: boolean
    requires_2fa: boolean
    roles?: Role[]
  }
}

interface UserFormData {
  email: string
  password?: string
  is_active: boolean
  requires_2fa: boolean
  role_ids: number[]
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editData
}) => {
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const isEditMode = !!editData

  const form = useForm<UserFormData>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      is_active: true,
      requires_2fa: false,
      role_ids: []
    }
  })

  const { register, formState: { errors }, watch, setValue, reset } = form

  // Load roles
  useEffect(() => {
    if (open) {
      superadminApi.roles.list()
        .then((res: any) => setRoles(res.data))
        .catch(() => toast.error('Failed to load roles'))
      
      // Reset form with edit data or defaults
      if (editData) {
        reset({
          email: editData.email,
          is_active: editData.is_active,
          requires_2fa: editData.requires_2fa,
          role_ids: editData.roles?.map(r => r.id) || []
        })
      } else {
        reset({
          email: '',
          password: '',
          is_active: true,
          requires_2fa: false,
          role_ids: []
        })
      }
    }
  }, [open, editData, reset])

  const onSubmit = async (data: UserFormData) => {
    try {
      setLoading(true)
      
      if (isEditMode) {
        const { password, ...payload } = data
        await superadminApi.users.update(editData.id, payload)
        toast.success('User updated successfully')
      } else {
        await superadminApi.users.create(data)
        toast.success('User created successfully')
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
      title={isEditMode ? 'Edit User' : 'Create New User'}
      description={isEditMode ? 'Update user details and permissions' : 'Add a new user to the platform'}
      form={form}
      onSubmit={onSubmit}
      size="lg"
      loading={loading}
      submitLabel={isEditMode ? 'Update User' : 'Create User'}
    >
      <div className="space-y-4">
        <FormField
          label="Email"
          error={errors.email?.message}
          required
        >
          <Input
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email address'
              }
            })}
            type="email"
            placeholder="user@example.com"
            autoFocus
          />
        </FormField>

        {!isEditMode && (
          <FormField
            label="Password"
            error={errors.password?.message}
            required
          >
            <Input
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
              type="password"
              placeholder="Enter password"
            />
          </FormField>
        )}

        <FormField
          label="Roles"
          error={errors.role_ids?.message}
          required
        >
          <select
            multiple
            className="w-full h-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={watch('role_ids')?.map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(o => Number(o.value))
              setValue('role_ids', selected, { shouldValidate: true })
            }}
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hold Ctrl/Cmd to select multiple roles
          </p>
        </FormField>

        <div className="flex items-center gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('is_active')}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('requires_2fa')}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Require 2FA
            </span>
          </label>
        </div>
      </div>
    </ModalForm>
  )
}
