import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { profileManagementApi } from '../../services/profileManagementApi'
import toast from 'react-hot-toast'

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', surname: '', phone: '', department: '', designation: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.department || !form.designation) {
      toast.error('Please fill all required fields')
      return
    }
    setLoading(true)
    try {
      await profileManagementApi.completeProfile(form)
      updateUser({ is_first_login: false, approval_status: 'pending' } as any)
      toast.success('Profile submitted! Waiting for admin approval.')
      navigate('/user/waiting-approval', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form, label: string, required = true) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Fill in your details. Your profile will be reviewed by your admin.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('name', 'First Name')}
            {field('surname', 'Last Name', false)}
          </div>
          {field('phone', 'Phone Number')}
          {field('department', 'Department')}
          {field('designation', 'Designation')}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetupPage
