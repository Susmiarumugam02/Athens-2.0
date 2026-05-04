import React, { useEffect, useState } from 'react'
import { athensSustCompanyApi, type AthensUserProfile } from '../../services/athensSustCompanyApi'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AthensProfileCompletion: React.FC = () => {
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['athens-user-profile'],
    queryFn: () => athensSustCompanyApi.getUserProfile(),
    retry: false
  })

  const [form, setForm] = useState<AthensUserProfile | null>(null)
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    photo: null,
    pan_attachment: null,
    aadhaar_attachment: null
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm(profile)
    }
  }, [profile])

  const updateField = (field: keyof AthensUserProfile, value: any) => {
    if (!form) return
    setForm({ ...form, [field]: value })
  }

  const handleFileChange = (field: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [field]: file }))
  }

  const buildPayload = () => {
    if (!form) return null
    const payload = new FormData()

    const fields: Array<keyof AthensUserProfile> = [
      'gender', 'father_or_spouse_name', 'date_of_birth', 'nationality',
      'employee_id', 'education_level', 'date_of_joining', 'mobile',
      'mark_of_identification', 'uan', 'pan', 'aadhaar'
    ]

    fields.forEach((field) => {
      const value = form[field]
      if (value !== undefined && value !== null && value !== '') {
        payload.append(field, String(value))
      }
    })

    if (files.photo) payload.append('photo', files.photo)
    if (files.pan_attachment) payload.append('pan_attachment', files.pan_attachment)
    if (files.aadhaar_attachment) payload.append('aadhaar_attachment', files.aadhaar_attachment)

    return payload
  }

  const handleSave = async () => {
    const payload = buildPayload()
    if (!payload) return
    setIsSaving(true)
    try {
      await athensSustCompanyApi.updateUserProfile(payload)
      toast.success('Profile saved')
      refetch()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    const payload = buildPayload()
    if (!payload) return
    setIsSubmitting(true)
    try {
      await athensSustCompanyApi.updateUserProfile(payload)
      await athensSustCompanyApi.submitUserProfile()
      toast.success('Profile submitted for approval')
      refetch()
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error?.response?.data?.errors || 'Submission failed'
      toast.error(typeof errorMsg === 'string' ? errorMsg : 'Submission failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-sm text-gray-600">Fill all required fields and upload documents to submit for approval.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input value={form.full_name || ''} disabled placeholder="Full name" />
          <Input value={form.email || ''} disabled placeholder="Email" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select value={form.gender || ''} onChange={(value) => updateField('gender', value)}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </Select>
          <Input
            placeholder="Father or spouse name"
            value={form.father_or_spouse_name || ''}
            onChange={(e) => updateField('father_or_spouse_name', e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date of birth"
            value={form.date_of_birth || ''}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
          />
          <Input
            placeholder="Nationality"
            value={form.nationality || ''}
            onChange={(e) => updateField('nationality', e.target.value)}
          />
          <Input
            placeholder="Employee ID"
            value={form.employee_id || ''}
            onChange={(e) => updateField('employee_id', e.target.value)}
          />
          <Input
            placeholder="Education level"
            value={form.education_level || ''}
            onChange={(e) => updateField('education_level', e.target.value)}
          />
          <Input
            type="date"
            placeholder="Date of joining"
            value={form.date_of_joining || ''}
            onChange={(e) => updateField('date_of_joining', e.target.value)}
          />
          <Input
            placeholder="Mobile"
            value={form.mobile || ''}
            onChange={(e) => updateField('mobile', e.target.value)}
          />
          <Input
            placeholder="Mark of identification"
            value={form.mark_of_identification || ''}
            onChange={(e) => updateField('mark_of_identification', e.target.value)}
          />
          <Input
            placeholder="UAN"
            value={form.uan || ''}
            onChange={(e) => updateField('uan', e.target.value)}
          />
          <Input
            placeholder="PAN"
            value={form.pan || ''}
            onChange={(e) => updateField('pan', e.target.value)}
          />
          <Input
            placeholder="Aadhaar"
            value={form.aadhaar || ''}
            onChange={(e) => updateField('aadhaar', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Photo</label>
            <input type="file" onChange={(e) => handleFileChange('photo', e.target.files?.[0] || null)} className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">PAN Attachment</label>
            <input type="file" onChange={(e) => handleFileChange('pan_attachment', e.target.files?.[0] || null)} className="mt-2" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Aadhaar Attachment</label>
            <input type="file" onChange={(e) => handleFileChange('aadhaar_attachment', e.target.files?.[0] || null)} className="mt-2" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AthensProfileCompletion
