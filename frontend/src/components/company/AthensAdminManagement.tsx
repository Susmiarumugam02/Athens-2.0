import React, { useState } from 'react'
import { Users, AlertCircle, FolderOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import AdminDirectory from './athens-sustainability/AdminDirectory'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { LoadingSpinner } from '../ui/LoadingSpinner'

type AdminTabId = 'directory' | 'management'

interface AthensAdminManagementProps {
  onNavigateToTab?: (tab: string) => void
}

const AthensAdminManagement: React.FC<AthensAdminManagementProps> = () => {
  const { isEnabled, isLoading: serviceLoading } = useAthensSustainabilityEnabled()
  const [activeTab, setActiveTab] = useState<AdminTabId>('directory')

  const tabs = [
    { id: 'directory', label: 'Admin Directory', icon: FolderOpen },
    { id: 'management', label: 'Admin Management', icon: Users },
  ] as const

  if (serviceLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading admin management..." />
      </div>
    )
  }

  if (!isEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-medium text-orange-900 dark:text-orange-100">
                Athens Sustainability Service Not Available
              </h3>
              <p className="text-orange-700 dark:text-orange-300 mt-1">
                Your company does not have access to Athens Sustainability service.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
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

      {/* Tab Content */}
      {activeTab === 'directory' && <AdminDirectory />}
      {activeTab === 'management' && <LegacyAdminManagement />}
    </div>
  )
}

// Legacy admin management component (existing functionality)
const LegacyAdminManagement: React.FC = () => {
  // ... existing admin management code would go here
  // This is a placeholder for the existing functionality
  return (
    <Card>
      <CardHeader>
        <CardTitle>Legacy Admin Management</CardTitle>
        <CardDescription>
          This section contains the existing admin management functionality.
          It will be integrated with the new Admin Directory.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">
          The existing admin management functionality will be preserved here
          while the new Admin Directory provides enhanced filtering and editing capabilities.
        </p>
      </CardContent>
    </Card>
  )
}

export default AthensAdminManagement