import React from 'react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const MastersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Admins</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage tenant administrators</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            MasterAdmin Module Unavailable
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The MasterAdmin module is being rebuilt. This functionality will be restored soon.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Status:</strong> Under Development
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default MastersPage
