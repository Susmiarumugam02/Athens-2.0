import React, { useState } from 'react'
import { Building2, BarChart3, Briefcase, Users, CheckCircle, Settings } from 'lucide-react'
import AthensSustainabilityDashboard from '../AthensSustainabilityDashboard'
import AthensProjects from '../AthensProjects'
import AthensAdminManagement from '../AthensAdminManagement'
import AthensApprovals from '../AthensApprovals'
import AthensSettings from '../AthensSettings'

type AthensTabId = 'dashboard' | 'projects' | 'admins' | 'approvals' | 'settings'

const AthensSustainabilityModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AthensTabId>('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'admins', label: 'Admin Management', icon: Users },
    { id: 'approvals', label: 'Pending Approvals', icon: CheckCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Athens Sustainability
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Company-level management for Athens Sustainability
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap gap-6">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <AthensSustainabilityDashboard />
      )}

      {activeTab === 'projects' && (
        <AthensProjects />
      )}

      {activeTab === 'admins' && (
        <AthensAdminManagement />
      )}

      {activeTab === 'approvals' && (
        <AthensApprovals />
      )}

      {activeTab === 'settings' && (
        <AthensSettings />
      )}
    </div>
  )
}

export default AthensSustainabilityModule
