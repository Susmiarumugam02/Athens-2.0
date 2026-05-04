import React from 'react'
import { Shield, Settings } from 'lucide-react'

interface CaptchaSettingsProps {
  captchaAfterFailedAttempts: number
  maxFailedAttempts: number
  lockoutDurationMinutes: number
  onUpdateSettings: (settings: { captchaAfterFailedAttempts: number; maxFailedAttempts: number; lockoutDurationMinutes: number }) => Promise<void>
  isLoading?: boolean
}

const CaptchaSettings: React.FC<CaptchaSettingsProps> = ({ captchaAfterFailedAttempts, maxFailedAttempts, lockoutDurationMinutes, onUpdateSettings, isLoading = false }) => {
  const [settings, setSettings] = React.useState({ captchaAfterFailedAttempts, maxFailedAttempts, lockoutDurationMinutes })

  const handleSave = async () => {
    await onUpdateSettings(settings)
  }

  const hasChanges = settings.captchaAfterFailedAttempts !== captchaAfterFailedAttempts || settings.maxFailedAttempts !== maxFailedAttempts || settings.lockoutDurationMinutes !== lockoutDurationMinutes

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Security & Captcha</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Captcha After</label>
          <select value={settings.captchaAfterFailedAttempts} onChange={(e) => setSettings(prev => ({ ...prev, captchaAfterFailedAttempts: parseInt(e.target.value) }))} disabled={isLoading} className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all disabled:opacity-50">
            <option value={1}>1 attempt</option>
            <option value={2}>2 attempts</option>
            <option value={3}>3 attempts</option>
            <option value={5}>5 attempts</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Max Attempts</label>
          <select value={settings.maxFailedAttempts} onChange={(e) => setSettings(prev => ({ ...prev, maxFailedAttempts: parseInt(e.target.value) }))} disabled={isLoading} className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all disabled:opacity-50">
            <option value={3}>3 attempts</option>
            <option value={5}>5 attempts</option>
            <option value={10}>10 attempts</option>
            <option value={15}>15 attempts</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lockout (min)</label>
          <select value={settings.lockoutDurationMinutes} onChange={(e) => setSettings(prev => ({ ...prev, lockoutDurationMinutes: parseInt(e.target.value) }))} disabled={isLoading} className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all disabled:opacity-50">
            <option value={5}>5 min</option>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-700/50 rounded-lg mb-3">
        <p className="text-xs text-orange-700 dark:text-orange-300">
          Captcha after {settings.captchaAfterFailedAttempts} attempts • Lock after {settings.maxFailedAttempts} attempts • Lockout: {settings.lockoutDurationMinutes} min
        </p>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2">
          <button onClick={() => setSettings({ captchaAfterFailedAttempts, maxFailedAttempts, lockoutDurationMinutes })} disabled={isLoading} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 text-xs">Reset</button>
          <button onClick={handleSave} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 text-xs">
            <Settings className="h-3 w-3" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

export default CaptchaSettings