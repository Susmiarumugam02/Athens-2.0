import React, { useState } from 'react'
import { 
  Leaf, Building2, Users, Settings, Activity, 
  BarChart3, FileText, Package
} from 'lucide-react'
import AthensSustainabilityDashboard from './Dashboard'
import AthensTenantsPage from './Tenants'
import AthensMastersPage from './Masters'
import ModuleManagement from './ModuleManagement'

type AthensSection = 'dashboard' | 'tenants' | 'masters' | 'modules' | 'subscriptions' | 'audit-logs' | 'settings'

const AthensSustainabilityMain: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AthensSection>('dashboard')

  const sections = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3, description: 'Overview and metrics' },
    { id: 'tenants' as const, label: 'Tenants', icon: Building2, description: 'Manage tenant companies' },
    { id: 'masters' as const, label: 'Masters', icon: Users, description: 'Tenant administrators' },
    { id: 'modules' as const, label: 'Module Management', icon: Package, description: 'Configure tenant modules' },
    { id: 'subscriptions' as const, label: 'Subscriptions', icon: FileText, description: 'Billing and plans' },
    { id: 'audit-logs' as const, label: 'Audit Logs', icon: Activity, description: 'System activity logs' },
    { id: 'settings' as const, label: 'Settings', icon: Settings, description: 'Platform configuration' }
  ]

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AthensSustainabilityDashboard />
      case 'tenants':
        return <AthensTenantsPage />
      case 'masters':
        return <AthensMastersPage />
      case 'modules':
        return <ModuleManagement />
      case 'subscriptions':
        return (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Subscriptions Management</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Manage billing and subscription plans</p>
          </div>
        )
      case 'audit-logs':
        return (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Audit Logs</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - View system activity and audit trails</p>
          </div>
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Platform Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">Coming soon - Configure platform-wide settings</p>
          </div>
        )
      default:
        return <AthensSustainabilityDashboard />
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/50">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Athens Sustainability Control Plane</h2>
            <p className="text-green-700 dark:text-green-300">Manage ESG, environmental compliance, and sustainability metrics</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div>
        {renderSectionContent()}
      </div>
    </div>
  )
}

export default AthensSustainabilityMain