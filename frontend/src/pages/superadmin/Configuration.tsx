import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Database, 
  Shield, 
  Settings, 
  Bell, 
  Key, 
  Activity,
  Server,
  HardDrive,
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

const ConfigurationMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['configuration-dashboard'],
    queryFn: async () => {
      // Mock data for now since backend endpoint doesn't exist
      return {
        data: {
          system_info: {
            database_engine: 'django.db.backends.postgresql',
            database_name: 'athens_db',
            python_version: '3.11.0',
            django_version: '5.0.0'
          },
          config_stats: {
            total_configurations: 24,
            categories: 6
          },
          backup_stats: {
            total_backups: 15,
            total_size_mb: 2450
          },
          active_schedules: 3,
          pending_maintenance: 2
        }
      }
    },
    refetchInterval: 30000,
    retry: false,
  })

  const dashboard = dashboardData?.data || {}

  const configTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API Keys', icon: Key },
  ]

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="bg-card rounded-lg p-4 border border-border">
        <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" />
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Database</p>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              {dashboard.system_info?.database_engine?.split('.')?.pop() || 'PostgreSQL'}
            </p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">Database Name</p>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              {dashboard.system_info?.database_name || 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Python</p>
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              {dashboard.system_info?.python_version || 'N/A'}
            </p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Django</p>
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
              {dashboard.system_info?.django_version || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-blue-700 dark:text-blue-300">Configurations</h3>
            <Settings className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {dashboard.config_stats?.total_configurations || 0}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {dashboard.config_stats?.categories || 0} categories
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-green-700 dark:text-green-300">Backups</h3>
            <Database className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {dashboard.backup_stats?.total_backups || 0}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            {dashboard.backup_stats?.total_size_mb || 0} MB
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-purple-700 dark:text-purple-300">Schedules</h3>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {dashboard.active_schedules || 0}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">Active</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-orange-700 dark:text-orange-300">Tasks</h3>
            <Clock className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {dashboard.pending_maintenance || 0}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400">Pending</p>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-base font-medium text-foreground mb-2">Error Loading Configuration</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Unable to load configuration data.
          </p>
          <button onClick={() => refetch()} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
            <RefreshCw className="h-3 w-3 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">System configuration and management</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-2">
        <nav className="flex space-x-2">
          {configTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'database' && (
          <div className="bg-card rounded-lg p-6 border border-border text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Database backup coming soon</p>
          </div>
        )}
        {activeTab === 'system' && (
          <div className="bg-card rounded-lg p-6 border border-border text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">System settings coming soon</p>
          </div>
        )}
        {activeTab === 'security' && (
          <div className="bg-card rounded-lg p-6 border border-border text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Security config coming soon</p>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="bg-card rounded-lg p-6 border border-border text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Notification settings coming soon</p>
          </div>
        )}
        {activeTab === 'api' && (
          <div className="bg-card rounded-lg p-6 border border-border text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">API key management coming soon</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfigurationMain
