import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ModalForm, FormField } from '../ui/ModalForm'
import { apiClient } from '../../lib/api'

interface PasswordChangeFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface PasswordChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  isForced?: boolean
  title?: string
  message?: string
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  isForced = false,
  title,
  message
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<PasswordChangeFormData>({
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const { register, formState: { errors }, watch } = form
  const newPassword = watch('newPassword')

  const onSubmit = async (data: PasswordChangeFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    if (data.newPassword.length < 12) {
      toast.error('Password must be at least 12 characters')
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(data.newPassword)) {
      toast.error('Password must contain uppercase, lowercase, number and special character')
      return
    }

    try {
      setLoading(true)
      await apiClient.changeCompanyUserPassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
        force_logout_all: true
      })
      toast.success('Password changed successfully!')
      form.reset()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      const errorData = error.response?.data
      const message = errorData?.error || errorData?.message || 'Failed to change password'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[@$!%*?&]/.test(password)) strength++

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
    
    return {
      strength,
      label: labels[strength - 1] || 'Very Weak',
      color: colors[strength - 1] || 'bg-red-500'
    }
  }

  const passwordStrength = getPasswordStrength(newPassword || '')

  return (
    <ModalForm
      open={open}
      onOpenChange={onOpenChange}
      title={title || (isForced ? 'Password Change Required' : 'Change Password')}
      description={message || (isForced ? 'You must change your password to continue' : 'Update your account password')}
      form={form}
      onSubmit={onSubmit}
      size="md"
      loading={loading}
      submitLabel="Change Password"
      preventCloseOnLoading={isForced}
    >
      <div className="space-y-4">
        {isForced && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                  Password Reset Required
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {message || 'Your password has been reset by an administrator. Please create a new secure password to continue using the system.'}
                </p>
              </div>
            </div>
          </div>
        )}
        <FormField label="Current Password" error={errors.currentPassword?.message} required>
          <div className="relative">
            <input
              {...register('currentPassword', { required: 'Current password is required' })}
              type={showCurrentPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <FormField label="New Password" error={errors.newPassword?.message} required>
          <div className="relative">
            <input
              {...register('newPassword', { required: 'New password is required', minLength: { value: 12, message: 'Minimum 12 characters' } })}
              type={showNewPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {newPassword && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                <span className={`text-xs font-medium ${
                  passwordStrength.strength >= 4 ? 'text-green-600' : 
                  passwordStrength.strength >= 3 ? 'text-blue-600' :
                  passwordStrength.strength >= 2 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </FormField>

        <FormField label="Confirm New Password" error={errors.confirmPassword?.message} required>
          <div className="relative">
            <input
              {...register('confirmPassword', { required: 'Please confirm your password' })}
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </FormField>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Password Requirements:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li className="flex items-center space-x-2">
              <CheckCircle className={`h-3 w-3 ${newPassword?.length >= 12 ? 'text-green-500' : 'text-gray-400'}`} />
              <span>At least 12 characters</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
              <span>One uppercase letter</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className={`h-3 w-3 ${/[a-z]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
              <span>One lowercase letter</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className={`h-3 w-3 ${/\d/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
              <span>One number</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className={`h-3 w-3 ${/[@$!%*?&]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
              <span>One special character (@$!%*?&)</span>
            </li>
          </ul>
        </div>
      </div>
    </ModalForm>
  )
}

export default PasswordChangeModal
