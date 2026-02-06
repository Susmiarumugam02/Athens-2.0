import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Leaf, Building2, Activity, TrendingUp, 
  Calendar, BarChart3, AlertCircle, CheckCircle,
  Zap, Target, ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { athensSustAdminApi } from '../../../services/athensSustAdminApi'

const AthensSustainabilityDashboard: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d'>('30d')

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['athens-metrics-overview', selectedRange],
    queryFn: () => athensSustAdminApi.fetchMetricsOverview(selectedRange),
  })

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['athens-tenants'],
    queryFn: () => athensSustAdminApi.fetchTenants(),
  })

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['athens-audit-logs'],
    queryFn: () => athensSustAdminApi.fetchAuditLogs(),
  })

  const tenantsData = tenants?.results || []
  const auditData = auditLogs?.results || []

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              Athens Sustainability Control Plane
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Platform Online
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-blue-700 dark:text-blue-300 text-sm font-medium mb-1">Total Tenants</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {metrics?.total_tenants || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500 rounded-xl">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm font-medium mb-1">Active Tenants</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metrics?.active_tenants || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 rounded-xl">
                <Target className="h-5 w-5 text-white" />
              </div>
              <BarChart3 className="h-4 w-4 text-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-purple-700 dark:text-purple-300 text-sm font-medium mb-1">Subscriptions</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {metrics?.total_subscriptions || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500 rounded-xl">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <TrendingUp className="h-4 w-4 text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-1">Active Subs</p>
              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {metrics?.active_subscriptions || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500 rounded-xl">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-orange-700 dark:text-orange-300 text-sm font-medium mb-1">Modules</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {metrics?.total_modules_enabled || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500 rounded-xl">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-1">Activity</p>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                {metrics?.recent_activity_count || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Recent Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : tenantsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No tenants found
              </div>
            ) : (
              <div className="space-y-4">
                {tenantsData.slice(0, 5).map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {tenant.company_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{tenant.company_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{tenant.company_email}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.athens_status.is_active
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                      {tenant.athens_status.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : auditData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {auditData.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                      <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {log.actor_email || 'System'} • {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AthensSustainabilityDashboard