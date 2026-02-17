import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ModalForm, FormField } from '../../../../components/ui/ModalForm'
import { Input } from '../../../../components/ui/Input'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

interface ContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: any
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  mobile: string
  job_title: string
  department: string
  address_line1: string
  city: string
  state: string
  postal_code: string
  country: string
  notes: string
}

export const ContactModal: React.FC<ContactModalProps> = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  editData 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      department: '',
      address_line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      notes: ''
    }
  })

  const { register, formState: { errors }, reset } = form

  useEffect(() => {
    if (editData) {
      reset(editData)
    } else {
      reset()
    }
  }, [editData, reset, open])

  const onSubmit = async (data: FormData) => {
    if (!sessionKey) return

    try {
      setLoading(true)
      if (editData) {
        await crmApi.updateContact(sessionKey, editData.id, data)
        toast.success('Contact updated')
      } else {
        await crmApi.createContact(sessionKey, data)
        toast.success('Contact created')
      }
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={editData ? 'Edit Contact' : 'Create Contact'}
      form={form}
      onSubmit={onSubmit}
      loading={loading}
      size="lg"
      submitLabel={editData ? 'Update' : 'Create'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" error={errors.first_name?.message} required>
            <Input {...register('first_name', { required: 'Required' })} />
          </FormField>
          <FormField label="Last Name" error={errors.last_name?.message} required>
            <Input {...register('last_name', { required: 'Required' })} />
          </FormField>
        </div>
        <FormField label="Email" error={errors.email?.message} required>
          <Input type="email" {...register('email', { required: 'Required' })} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone" error={errors.phone?.message}>
            <Input type="tel" {...register('phone')} />
          </FormField>
          <FormField label="Mobile" error={errors.mobile?.message}>
            <Input type="tel" {...register('mobile')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Job Title" error={errors.job_title?.message}>
            <Input {...register('job_title')} />
          </FormField>
          <FormField label="Department" error={errors.department?.message}>
            <Input {...register('department')} />
          </FormField>
        </div>
        <FormField label="Notes" error={errors.notes?.message}>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </FormField>
      </div>
    </ModalForm>
  )
}
