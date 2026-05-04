import React from 'react'
import { useAuthStore } from '../../store/authStore'

const COMPANY_TYPE_META: Record<string, { label: string; color: string; emoji: string }> = {
  client:     { label: 'Client',     color: 'text-blue-600',   emoji: '🏢' },
  epc:        { label: 'EPC',        color: 'text-green-600',  emoji: '⚙️' },
  contractor: { label: 'Contractor', color: 'text-orange-600', emoji: '🔧' },
}

const UserDashboard: React.FC = () => {
  const { user } = useAuthStore()

  const companyType = (user as any)?.company_type || 'client'
  const meta = COMPANY_TYPE_META[companyType] || COMPANY_TYPE_META.client
  const username = (user as any)?.username || user?.email?.split('@')[0] || 'User'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-5">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-md shrink-0">
          {username[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Welcome back, {username}!
          </h1>
          <p className={`text-sm font-medium mt-0.5 ${meta.color}`}>
            {meta.emoji} {meta.label} User
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Role',         value: `${meta.label} User`,                  icon: '👤' },
          { label: 'Status',       value: 'Active',                               icon: '✅' },
          { label: 'Access Level', value: 'Standard',                             icon: '🔑' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
            <span className="text-2xl">{card.icon}</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          👈 Use the sidebar to navigate to your modules — PTW, Safety Observation, Training, ERGON, and more.
        </p>
      </div>
    </div>
  )
}

export default UserDashboard
