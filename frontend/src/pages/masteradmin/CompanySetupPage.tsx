import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

const INDUSTRY_OPTIONS = [
  'Construction', 'Manufacturing', 'Power & Energy', 'Oil & Gas',
  'Mining', 'Chemical', 'Logistics', 'Aviation', 'Port & Maritime',
  'Government', 'Schools', 'Shopping Mall', 'Other',
]

const COMPANY_TYPE_OPTIONS = [
  'Private Limited', 'Public Limited', 'Partnership', 'Sole Proprietorship',
  'LLP', 'Government', 'NGO', 'Other',
]

const CompanySetupPage: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    phone: '',
    address: '',
    industry_type: '',
    company_type: '',
    contact_name: '',
    designation: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await apiClient.post('/api/control-plane/company-profile/submit/', form)
      toast.success('Company details submitted! Awaiting SuperAdmin approval.')
      navigate('/master-admin/waiting')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const field = (name: keyof typeof form, label: string, type = 'text', required = true) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  )

  const select = (name: keyof typeof form, label: string, options: string[]) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}<span className="text-red-500 ml-1">*</span>
      </label>
      <select
        name={name}
        value={form[name]}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏢</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Setup</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Please fill in your company details to complete registration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {field('company_name', 'Company Name')}
            {field('company_email', 'Company Email', 'email')}
            {field('phone', 'Phone Number', 'tel')}
            {select('industry_type', 'Industry Type', INDUSTRY_OPTIONS)}
            {select('company_type', 'Company Type', COMPANY_TYPE_OPTIONS)}
            {field('contact_name', 'Contact Person Name')}
            {field('designation', 'Designation')}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Registered Address<span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompanySetupPage
