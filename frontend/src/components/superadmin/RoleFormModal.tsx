import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ModalForm, FormField } from '../ui/ModalForm'
import { Input } from '../ui/Input'
import toast from 'react-hot-toast'
import { superadminApi, type Role } from '@/services/superadmin/superadminApi'

interface RoleFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: Role
}

interface RoleFormData {
  name: string
  description: string
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  editData
}) => {
  const [loading, setLoading] = useState(false)
  const isEditMode = !!editData

  const form = useForm<RoleFormData>({
    mode: 'onChange',
    defaultValues: editData || {
      name: '',
      description: ''
    }
  })

  const { register, formState: { errors } } = form

  const onSubmit = async (data: RoleFormData) => {
    try {
      setLoading(true)
      
      const payload = {
        name: data.name.trim(),
        description: data.description.trim()
      }

      if (isEditMode) {
        await superadminApi.roles.update(editData.id, payload)
        toast.success('Role updated successfully')
      } else {
        await superadminApi.roles.create(payload)
        toast.success('Role created successfully')
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
      title={isEditMode ? 'Edit Role' : 'Create New Role'}
      description={isEditMode ? 'Update role details' : 'Add a new role to the platform'}
      form={form}
      onSubmit={onSubmit}
      size="md"
      loading={loading}
      submitLabel={isEditMode ? 'Update Role' : 'Create Role'}
    >
      <div className="space-y-4">
        <FormField
          label="Role Name"
          error={errors.name?.message}
          required
        >
          <Input
            {...register('name', {
              required: 'Role name is required',
              minLength: { value: 3, message: 'Name must be at least 3 characters' },
              maxLength: { value: 50, message: 'Name must be less than 50 characters' }
            })}
            placeholder="e.g., Administrator, Manager"
            autoFocus
          />
        </FormField>

        <FormField
          label="Description"
          error={errors.description?.message}
        >
          <Input
            {...register('description', {
              maxLength: { value: 200, message: 'Description must be less than 200 characters' }
            })}
            placeholder="Brief description of the role (optional)"
          />
        </FormField>

        {editData?.is_system_role && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              This is a system role. Deletion is blocked by backend rules.
            </p>
          </div>
        )}
      </div>
    </ModalForm>
  )
}
