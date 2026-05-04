import React, { useState } from 'react'
import { Lock, Eye, EyeOff, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'

const AthensFirstLoginPasswordReset: React.FC = () => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.current_password || !formData.new_password || !formData.confirm_password) {
      toast.error('Please fill in all fields')
      return
    }

    setIsLoading(true)
    try {
      await apiClient.post('/api/company/security/password-change/', {
        ...formData,
        force_logout_all: false
      })
      toast.success('Password updated successfully!')
      window.location.href = '/company'
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'Password update failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
            <p className="text-gray-600 text-sm">First login requires a password reset</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.current_password}
                  onChange={(e) => handleInputChange('current_password', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Enter current password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.new_password}
                  onChange={(e) => handleInputChange('new_password', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="h-5 w-5" />
                  <span>Update Password</span>
                </div>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Password must be at least 12 characters and include a number and special character.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AthensFirstLoginPasswordReset
