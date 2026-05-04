import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ModalForm, FormField } from '../../../../components/ui/ModalForm'
import { Input } from '../../../../components/ui/Input'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

interface AccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editData?: any
}

interface FormData {
  name: string
  account_type: string
  industry: string
  website: string
  phone: string
  email: string
  annual_revenue: string
  employee_count: string
  billing_address: string
  shipping_address: string
  description: string
}

const accountTypes = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' }
]

const industries = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'education', label: 'Education' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' }
]

export const AccountModal: React.FC<AccountModalProps> = ({ open, onOpenChange, onSuccess, editData }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)

  const form = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      account_type: 'prospect',
      industry: 'other',
      website: '',
      phone: '',
      email: '',
      annual_revenue: '',
      employee_count: '',
      billing_address: '',
      shipping_address: '',
      description: ''
    }
  })

  const { register, formState: { errors }, reset } = form

  useEffect(() => {
    if (editData) {
      reset({
        name: editData.name || '',
        account_type: editData.account_type || 'prospect',
        industry: editData.industry || 'other',
        website: editData.website || '',
        phone: editData.phone || '',
        email: editData.email || '',
        annual_revenue: editData.annual_revenue?.toString() || '',
        employee_count: editData.employee_count?.toString() || '',
        billing_address: editData.billing_address || '',
        shipping_address: editData.shipping_address || '',
        description: editData.description || ''
      })
    } else {
      reset()
    }
  }, [editData, reset, open])

  const onSubmit = async (data: FormData) => {
    if (!sessionKey) {
      toast.error('Session expired')
      return
    }

    try {
      setLoading(true)
      const payload = {
        ...data,
        session_key: sessionKey,
        annual_revenue: data.annual_revenue ? parseFloat(data.annual_revenue) : null,
        employee_count: data.employee_count ? parseInt(data.employee_count) : null
      }

      if (editData) {
        await crmApi.updateAccount(sessionKey, editData.id, payload)
        toast.success('Account updated')
      } else {
        await crmApi.createAccount(sessionKey, payload)
        toast.success('Account created')
      }
      
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={editData ? 'Edit Account' : 'Create Account'}
      form={form}
      onSubmit={onSubmit}
      loading={loading}
      size="lg"
      submitLabel={editData ? 'Update' : 'Create'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account Name" error={errors.name?.message} required>
            <Input {...register('name', { required: 'Required', maxLength: 200 })} />
          </FormField>
          <FormField label="Account Type">
            <select {...register('account_type')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Industry">
            <select {...register('industry')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {industries.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </FormField>
          <FormField label="Website">
            <Input type="url" {...register('website')} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone">
            <Input type="tel" {...register('phone')} />
          </FormField>
          <FormField label="Email">
            <Input type="email" {...register('email')} />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </FormField>
      </div>
    </ModalForm>
  )
}
