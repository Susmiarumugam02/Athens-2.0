import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'
import {
  AlertCircle, Briefcase, CheckCircle, ChevronLeft, ChevronRight,
  FileText, HeartPulse, IdCard, Image as ImageIcon, Phone, Save,
  ShieldCheck, Upload, User,
} from 'lucide-react'

type FormState = Record<string, string>
type UploadKey = 'profile_photo' | 'id_document' | 'pan_document' | 'employee_photo'
type UserProfileDefaults = {
  name?: string
  phone_number?: string
  employee_id?: string
  department?: string
  designation?: string
}
type ApiError = {
  response?: {
    status?: number
    data?: {
      error?: string
      detail?: string
    }
  }
}

const STORAGE_KEY = 'athens-onboarding-profile-draft'

const sections = [
  { title: 'Personal Details', icon: User, fields: ['name', 'dob', 'gender', 'blood_group', 'nationality', 'marital_status', 'profile_photo'] },
  { title: 'Contact Details', icon: Phone, fields: ['phone', 'alternate_phone', 'personal_email', 'address', 'emergency_contact_name', 'emergency_contact'] },
  { title: 'Employment', icon: Briefcase, fields: ['employee_id', 'department', 'designation', 'reporting_manager', 'joining_date', 'work_location'] },
  { title: 'Government Verification', icon: IdCard, fields: ['aadhaar_number', 'pan_number', 'id_document', 'pan_document', 'employee_photo'] },
  { title: 'Safety and Skills', icon: ShieldCheck, fields: ['years_experience', 'safety_certifications', 'ppe_experience', 'equipment_experience', 'high_risk_experience'] },
  { title: 'Medical Declaration', icon: HeartPulse, fields: ['allergies', 'medical_conditions', 'fitness_declaration'] },
]

const initialForm: FormState = {
  name: '', dob: '', gender: '', blood_group: '', nationality: '', marital_status: '',
  phone: '', alternate_phone: '', personal_email: '', address: '', emergency_contact_name: '', emergency_contact: '',
  employee_id: '', department: '', designation: '', reporting_manager: '', joining_date: '', work_location: '',
  aadhaar_number: '', pan_number: '', passport_number: '',
  years_experience: '', safety_certifications: '', ppe_experience: '', equipment_experience: '', high_risk_experience: '',
  allergies: '', medical_conditions: '', fitness_declaration: '',
}

const requiredLabels: Record<string, string> = {
  name: 'Full Name', dob: 'DOB', gender: 'Gender', blood_group: 'Blood Group', nationality: 'Nationality', marital_status: 'Marital Status',
  phone: 'Mobile Number', personal_email: 'Personal Email', address: 'Address', emergency_contact_name: 'Emergency Contact Name', emergency_contact: 'Emergency Contact Number',
  employee_id: 'Employee ID', department: 'Department', designation: 'Designation', reporting_manager: 'Reporting Manager', joining_date: 'Joining Date', work_location: 'Work Location',
  aadhaar_number: 'Aadhaar Number', pan_number: 'PAN Number',
  years_experience: 'Experience', ppe_experience: 'PPE Knowledge', equipment_experience: 'Equipment Knowledge', high_risk_experience: 'Risk Work Experience',
  fitness_declaration: 'Fitness Declaration',
}

const requiredUploadLabels: Record<UploadKey, string> = {
  profile_photo: 'Employee Photo',
  id_document: 'Aadhaar Upload',
  pan_document: 'PAN Upload',
  employee_photo: 'Employee Photo Upload',
}

// Uploads that are truly required for submission (employee_photo is optional — profile_photo covers it)
const requiredUploadKeys: UploadKey[] = ['profile_photo', 'id_document', 'pan_document']

const fieldStepLookup = sections.reduce<Record<string, number>>((lookup, section, index) => {
  section.fields.forEach(field => { lookup[field] = index })
  return lookup
}, {})

const baseInputCls = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 dark:bg-gray-800 dark:text-white'
const validInputCls = 'border-gray-300 focus:border-blue-500 focus:ring-blue-100 dark:border-gray-600'
const invalidInputCls = 'border-red-500 focus:border-red-500 focus:ring-red-100 dark:border-red-500'
const inputCls = `${baseInputCls} ${validInputCls}`

const phonePattern = /^\+?[0-9][0-9\s-]{8,14}$/
const aadhaarPattern = /^\d{12}$/
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

const submitProfile = async (fd: FormData) => {
  try {
    return await apiClient.post('/api/user/profile/submit', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  } catch (err: unknown) {
    const apiError = err as ApiError
    if (apiError.response?.status === 403) {
      return apiClient.post('/api/auth/projectadmin/profile/complete/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    throw err
  }
}

// ── Field components defined OUTSIDE ProfileSetupPage to prevent remounting on every render ──

interface FieldProps {
  name: string
  label: string
  type?: string
  options?: string[]
  textarea?: boolean
  required?: boolean
  value: string
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}

const Field = React.memo(({ name, label, type = 'text', options, textarea = false, required = true, value, error, onChange }: FieldProps) => {
  const inputClassName = error ? `${baseInputCls} ${invalidInputCls}` : inputCls
  return (
    <label className="block" data-field={name}>
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {options ? (
        <select value={value} onChange={onChange} className={inputClassName} aria-invalid={Boolean(error)}>
          <option value="">Select</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : textarea ? (
        <textarea value={value} onChange={onChange} rows={3} className={inputClassName} aria-invalid={Boolean(error)} />
      ) : (
        <input type={type} value={value} onChange={onChange} className={inputClassName} aria-invalid={Boolean(error)} />
      )}
      {error && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{error}</span>}
    </label>
  )
})

interface UploadFieldProps {
  name: UploadKey
  label: string
  accept: string
  preview?: string
  fileName?: string
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const UploadField = React.memo(({ name, label, accept, preview, fileName, error, onChange }: UploadFieldProps) => (
  <div data-field={name}>
    <label
      tabIndex={0}
      className={`flex min-h-[92px] cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 outline-none hover:border-blue-400 focus:ring-2 ${error ? 'border-red-500 bg-red-50 focus:ring-red-100 dark:border-red-500 dark:bg-red-900/10' : 'border-gray-300 bg-gray-50 focus:ring-blue-100 dark:border-gray-600 dark:bg-gray-800/60'}`}
    >
      {preview ? (
        <img src={preview} alt={label} className="h-14 w-14 rounded-md object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-white dark:bg-gray-900">
          <Upload className="h-5 w-5 text-gray-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{fileName || label}</p>
        <p className="text-xs text-gray-500">PDF, JPG or PNG</p>
      </div>
      <input type="file" accept={accept} onChange={onChange} className="hidden" />
    </label>
    {error && <span className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertCircle className="h-3 w-3" />{error}</span>}
  </div>
))

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [files, setFiles] = useState<Partial<Record<UploadKey, File>>>({})
  const [previews, setPreviews] = useState<Partial<Record<UploadKey, string>>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setForm({ ...initialForm, ...JSON.parse(stored) })
        return
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    const profileUser = user as UserProfileDefaults | null
    setForm(prev => ({
      ...prev,
      name: profileUser?.name || '',
      phone: profileUser?.phone_number || '',
      employee_id: profileUser?.employee_id || '',
      department: profileUser?.department || '',
      designation: profileUser?.designation || '',
      personal_email: user?.email || '',
    }))
  }, [user])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }, 700)
    return () => window.clearTimeout(handle)
  }, [form])

  const progress = Math.round(((step + 1) / sections.length) * 100)
  const current = sections[step]
  const CurrentIcon = current.icon
  const submitButtonText =
    submitState === 'submitting' ? 'Submitting...' :
    submitState === 'success' ? 'Submitted Successfully' :
    submitState === 'error' ? 'Submission Failed. Please try again.' :
    'Submit for Approval'

  const missingRequired = useMemo(
    () => [
      ...Object.keys(requiredLabels).filter(key => !String(form[key] || '').trim()),
      ...requiredUploadKeys.filter(key => !files[key]),
    ],
    [files, form],
  )

  const scrollToError = (fieldName: string) => {
    window.setTimeout(() => {
      const field = document.querySelector<HTMLElement>(`[data-field="${fieldName}"]`)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const focusTarget = field?.matches('input, textarea, select, button')
        ? field
        : field?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]')
      focusTarget?.focus({ preventScroll: true })
    }, 80)
  }

  const buildValidationErrors = () => {
    const next: Record<string, string> = {}

    Object.entries(requiredLabels).forEach(([key, label]) => {
      if (!String(form[key] || '').trim()) {
        next[key] = `${label} is required`
      }
    })

    requiredUploadKeys.forEach(key => {
      if (!files[key]) {
        next[key] = `${requiredUploadLabels[key]} is required`
      }
    })

    const aadhaar = form.aadhaar_number.replace(/\s/g, '')
    const pan = form.pan_number.trim().toUpperCase()

    if (form.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personal_email)) {
      next.personal_email = 'Personal Email is invalid'
    }
    if (form.phone && !phonePattern.test(form.phone)) {
      next.phone = 'Mobile Number is invalid'
    }
    if (form.emergency_contact && !phonePattern.test(form.emergency_contact)) {
      next.emergency_contact = 'Emergency Contact Number is invalid'
    }
    if (form.aadhaar_number && !aadhaarPattern.test(aadhaar)) {
      next.aadhaar_number = 'Aadhaar Number must be 12 digits'
    }
    if (form.pan_number && !panPattern.test(pan)) {
      next.pan_number = 'PAN Number is invalid'
    }

    return next
  }

  const setValue = React.useCallback((key: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = key === 'pan_number' ? event.target.value.toUpperCase() : event.target.value
    setForm(prev => ({ ...prev, [key]: value }))
    setSubmitState('idle')
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const validate = () => {
    const next = buildValidationErrors()
    setErrors(next)
    const firstInvalid = Object.keys(next)[0]
    if (firstInvalid) {
      setStep(fieldStepLookup[firstInvalid] ?? 0)
      scrollToError(firstInvalid)
      toast.error(next[firstInvalid])
      return false
    }
    return true
  }

  const handleFile = React.useCallback((key: UploadKey) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFiles(prev => ({ ...prev, [key]: file }))
    setSubmitState('idle')
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    if (file.type.startsWith('image/')) {
      setPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))
    }
  }, [])

  const submit = async (draft = false) => {
    if (!draft && !validate()) {
      return
    }
    setLoading(true)
    if (!draft) setSubmitState('submitting')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([key, value]) => fd.append(key, value))
      fd.append('draft', draft ? 'true' : 'false')
      fd.append('profile_completed', draft ? 'false' : 'true')
      fd.append('approval_status', draft ? 'pending' : 'waiting_admin_approval')
      fd.append('training_status', 'not_started')
      fd.append('access_level', 'restricted')
      if (files.profile_photo) fd.append('profile_photo', files.profile_photo)
      if (files.id_document) fd.append('id_document', files.id_document)
      if (files.pan_document) fd.append('pan_document', files.pan_document)
      if (files.employee_photo) fd.append('employee_photo', files.employee_photo)

      const res = await submitProfile(fd)

      if (draft) {
        toast.success('Draft saved')
        return
      }

      localStorage.removeItem(STORAGE_KEY)
      updateUser({
        is_first_login: false,
        profile_completed: true,
        approval_status: 'waiting_admin_approval',
        status: 'pending_approval',
        profile_status: 'submitted',
        workflow_approval_status: 'waiting_admin_approval',
        training_status: 'not_started',
        access_level: 'restricted',
      } as Parameters<typeof updateUser>[0])
      setSubmitState('success')
      toast.success(res.data?.message || 'Profile Submitted Successfully. Your profile is waiting for EPC Admin approval.')
      navigate('/user/approval-pending', { replace: true })
    } catch (err: unknown) {
      const apiError = err as ApiError
      const errMsg = apiError.response?.data?.error || apiError.response?.data?.detail || ''
      console.error('[ProfileSetup] submit failed', apiError.response?.status, errMsg, apiError)
      // Already submitted — treat as success and redirect
      if (apiError.response?.status === 400 && errMsg.includes('already submitted')) {
        localStorage.removeItem(STORAGE_KEY)
        navigate('/user/approval-pending', { replace: true })
        return
      }
      setSubmitState('error')
      toast.error(errMsg || 'Submission Failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Profile Verification</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your access remains restricted until EPC Admin approval and induction completion.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Save className="h-4 w-4" />
              {lastSavedAt ? `Autosaved ${lastSavedAt}` : 'Autosave ready'}
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            {sections.map((item, index) => {
              const Icon = item.icon
              const done = item.fields.every(field => {
                if (requiredLabels[field]) return Boolean(form[field])
                if (requiredUploadLabels[field as UploadKey]) return Boolean(files[field as UploadKey])
                return true
              })
              return (
                <button
                  key={item.title}
                  onClick={() => setStep(index)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === step ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {done && <CheckCircle className="h-4 w-4 text-green-600" />}
                </button>
              )
            })}
          </aside>

          <main className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 p-5 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                  <CurrentIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{current.title}</h2>
                  <p className="text-sm text-gray-500">Step {step + 1} of {sections.length}</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="name" label="Full Name" value={form.name} error={errors.name} onChange={setValue('name')} />
                  <Field name="dob" label="DOB" type="date" value={form.dob} error={errors.dob} onChange={setValue('dob')} />
                  <Field name="gender" label="Gender" options={['Male', 'Female', 'Other']} value={form.gender} error={errors.gender} onChange={setValue('gender')} />
                  <Field name="blood_group" label="Blood Group" options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} value={form.blood_group} error={errors.blood_group} onChange={setValue('blood_group')} />
                  <Field name="nationality" label="Nationality" value={form.nationality} error={errors.nationality} onChange={setValue('nationality')} />
                  <Field name="marital_status" label="Marital Status" options={['Single', 'Married', 'Separated', 'Widowed']} value={form.marital_status} error={errors.marital_status} onChange={setValue('marital_status')} />
                  <div className="md:col-span-2"><UploadField name="profile_photo" label="Passport Size Photo" accept="image/*" preview={previews.profile_photo} fileName={files.profile_photo?.name} error={errors.profile_photo} onChange={handleFile('profile_photo')} /></div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="phone" label="Mobile Number" type="tel" value={form.phone} error={errors.phone} onChange={setValue('phone')} />
                  <Field name="alternate_phone" label="Alternate Number" type="tel" required={false} value={form.alternate_phone} error={errors.alternate_phone} onChange={setValue('alternate_phone')} />
                  <Field name="personal_email" label="Personal Email" type="email" value={form.personal_email} error={errors.personal_email} onChange={setValue('personal_email')} />
                  <Field name="emergency_contact_name" label="Emergency Contact Name" value={form.emergency_contact_name} error={errors.emergency_contact_name} onChange={setValue('emergency_contact_name')} />
                  <Field name="emergency_contact" label="Emergency Contact Number" type="tel" value={form.emergency_contact} error={errors.emergency_contact} onChange={setValue('emergency_contact')} />
                  <div className="md:col-span-2"><Field name="address" label="Address" textarea value={form.address} error={errors.address} onChange={setValue('address')} /></div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="employee_id" label="Employee ID" value={form.employee_id} error={errors.employee_id} onChange={setValue('employee_id')} />
                  <Field name="department" label="Department" value={form.department} error={errors.department} onChange={setValue('department')} />
                  <Field name="designation" label="Designation" value={form.designation} error={errors.designation} onChange={setValue('designation')} />
                  <Field name="reporting_manager" label="Reporting Manager" value={form.reporting_manager} error={errors.reporting_manager} onChange={setValue('reporting_manager')} />
                  <Field name="joining_date" label="Joining Date" type="date" value={form.joining_date} error={errors.joining_date} onChange={setValue('joining_date')} />
                  <Field name="work_location" label="Work Location" value={form.work_location} error={errors.work_location} onChange={setValue('work_location')} />
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="aadhaar_number" label="Aadhaar Number" value={form.aadhaar_number} error={errors.aadhaar_number} onChange={setValue('aadhaar_number')} />
                  <Field name="pan_number" label="PAN Number" value={form.pan_number} error={errors.pan_number} onChange={setValue('pan_number')} />
                  <Field name="passport_number" label="Passport Number" required={false} value={form.passport_number} error={errors.passport_number} onChange={setValue('passport_number')} />
                  <UploadField name="id_document" label="Upload Aadhaar" accept=".pdf,.jpg,.jpeg,.png" preview={previews.id_document} fileName={files.id_document?.name} error={errors.id_document} onChange={handleFile('id_document')} />
                  <UploadField name="pan_document" label="Upload PAN" accept=".pdf,.jpg,.jpeg,.png" preview={previews.pan_document} fileName={files.pan_document?.name} error={errors.pan_document} onChange={handleFile('pan_document')} />
                  <UploadField name="employee_photo" label="Upload Employee Photo" accept="image/*" preview={previews.employee_photo} fileName={files.employee_photo?.name} error={errors.employee_photo} onChange={handleFile('employee_photo')} />
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="years_experience" label="Experience" value={form.years_experience} error={errors.years_experience} onChange={setValue('years_experience')} />
                  <Field name="safety_certifications" label="Certifications" textarea required={false} value={form.safety_certifications} error={errors.safety_certifications} onChange={setValue('safety_certifications')} />
                  <Field name="ppe_experience" label="PPE Knowledge" textarea value={form.ppe_experience} error={errors.ppe_experience} onChange={setValue('ppe_experience')} />
                  <Field name="equipment_experience" label="Equipment Knowledge" textarea value={form.equipment_experience} error={errors.equipment_experience} onChange={setValue('equipment_experience')} />
                  <div className="md:col-span-2"><Field name="high_risk_experience" label="Risk Work Experience" textarea value={form.high_risk_experience} error={errors.high_risk_experience} onChange={setValue('high_risk_experience')} /></div>
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field name="allergies" label="Allergies" textarea required={false} value={form.allergies} error={errors.allergies} onChange={setValue('allergies')} />
                  <Field name="medical_conditions" label="Medical Conditions" textarea required={false} value={form.medical_conditions} error={errors.medical_conditions} onChange={setValue('medical_conditions')} />
                  <Field name="fitness_declaration" label="Fitness Declaration" options={['Fit for duty', 'Fit with restrictions', 'Requires medical review']} value={form.fitness_declaration} error={errors.fitness_declaration} onChange={setValue('fitness_declaration')} />
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
                    <FileText className="mb-2 h-5 w-5" />
                    {missingRequired.length === 0 ? (
                      'All required fields are complete.'
                    ) : (
                      <div>
                        <p className="font-medium">
                          {missingRequired.length} required field{missingRequired.length === 1 ? '' : 's'} still need{missingRequired.length === 1 ? 's' : ''} attention.
                        </p>
                        <p className="mt-1">{missingRequired.map(key => requiredLabels[key] || requiredUploadLabels[key as UploadKey] || key).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 p-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep(prev => Math.max(prev - 1, 0))}
                disabled={step === 0 || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => submit(true)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 disabled:opacity-50 dark:border-blue-800 dark:text-blue-200"
                >
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                {step < sections.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(prev => Math.min(prev + 1, sections.length - 1))}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => submit(false)}
                    disabled={loading}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${submitState === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
                  >
                    {submitButtonText} <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <ImageIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Dashboard, PTW, attendance, and operational modules remain locked until profile approval, induction completion, and attendance verification are complete.</p>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetupPage
