import React, { useState, useEffect } from 'react'
import { Mail, Bell, Save } from 'lucide-react'
import { LoginNotification } from '../../types'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface LoginNotificationSettingsProps {
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  recentNotifications: LoginNotification[]
  isLoading?: boolean
}

const LoginNotificationSettings: React.FC<LoginNotificationSettingsProps> = ({ isEnabled, onToggleEnabled, recentNotifications, isLoading = false }) => {
  const [notificationEmail, setNotificationEmail] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)

  useEffect(() => {
    const fetchEmailData = async () => {
      try {
        const notificationResponse = await apiClient.getNotificationEmail()
        if (notificationResponse.data?.notification_email) {
          setNotificationEmail(notificationResponse.data.notification_email)
          return
        }
        const emailSettingsResponse = await apiClient.getMasterAdminEmailSettings()
        if (emailSettingsResponse?.data?.is_active && emailSettingsResponse?.data?.email_address) {
          setNotificationEmail(emailSettingsResponse.data.email_address)
        }
      } catch (error) {
        console.error('Failed to fetch email data:', error)
      }
    }
    fetchEmailData()
  }, [])

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled) {
      try {
        const emailSettingsResponse = await apiClient.getMasterAdminEmailSettings()
        if (emailSettingsResponse?.data?.is_active && emailSettingsResponse?.data?.email_address) {
          const configuredEmail = emailSettingsResponse.data.email_address
          setNotificationEmail(configuredEmail)
          if (!notificationEmail || notificationEmail !== configuredEmail) {
            await apiClient.setNotificationEmail({ notification_email: configuredEmail })
            toast.success(`Notifications will be sent to: ${configuredEmail}`)
          }
          onToggleEnabled(enabled)
          return
        } else {
          toast.error('Please configure email settings first in the Email Settings tab')
          return
        }
      } catch (error) {
        toast.error('Failed to check email settings')
        return
      }
    }
    onToggleEnabled(enabled)
  }

  const handleSaveEmail = async () => {
    if (!notificationEmail || !notificationEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    setIsLoadingEmail(true)
    try {
      await apiClient.setNotificationEmail({ notification_email: notificationEmail })
      toast.success('Notification email saved!')
      setShowEmailInput(false)
      onToggleEnabled(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save email')
    } finally {
      setIsLoadingEmail(false)
    }
  }

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Login Notifications</h3>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={(e) => handleToggleEnabled(e.target.checked)} disabled={isLoading} className="sr-only" />
          <div className={`w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
          </div>
          <span className="text-xs text-gray-700 dark:text-gray-300">{isEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {isEnabled && notificationEmail && (
        <div className="mb-3 p-2 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <p className="text-xs font-medium text-green-700 dark:text-green-300">Email alerts active</p>
          </div>
          <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-green-200/50 dark:border-green-600/50">
            <span className="text-xs font-mono text-green-700 dark:text-green-300">{notificationEmail}</span>
            <button onClick={() => { const emailTab = document.querySelector('[data-tab="email"]') as HTMLButtonElement; emailTab?.click(); }} className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors">Change</button>
          </div>
        </div>
      )}

      {showEmailInput && (
        <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-700/50 rounded-lg">
          <div className="flex gap-2 mb-2">
            <input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} placeholder="Enter email" className="flex-1 px-2 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all" />
            <button onClick={handleSaveEmail} disabled={isLoadingEmail || !notificationEmail} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs">
              <Save className="h-3 w-3" />
              {isLoadingEmail ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowEmailInput(false)} className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs">Cancel</button>
          </div>
        </div>
      )}

      {isEnabled && notificationEmail && recentNotifications.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {recentNotifications.map((n) => (
            <div key={n.id} className="flex items-center p-2 bg-gray-50/50 dark:bg-gray-700/30 border border-gray-200/50 dark:border-gray-600/50 rounded-lg">
              <div className={`p-1.5 rounded-lg mr-2 ${n.email_sent ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Mail className={`h-3.5 w-3.5 ${n.email_sent ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{n.email_sent ? 'Sent' : 'Failed'}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{n.ip_address} • {new Date(n.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default LoginNotificationSettings