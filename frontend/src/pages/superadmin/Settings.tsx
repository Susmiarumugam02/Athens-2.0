import React from 'react'
import SuperadminLayout from '../../../layouts/SuperadminLayout'
import { Card } from '../../../components/ui/Card'
import { Settings as SettingsIcon } from 'lucide-react'

const SettingsPage: React.FC = () => {
  return (
    <SuperadminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure platform-wide settings</p>
        </div>

        <Card className="p-12">
          <div className="text-center">
            <SettingsIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Settings Coming Soon
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Platform configuration settings will be available here
            </p>
          </div>
        </Card>
      </div>
    </SuperadminLayout>
  )
}

export default SettingsPage
