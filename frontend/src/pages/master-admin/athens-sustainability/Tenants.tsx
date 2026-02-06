import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building2, Search,
  CheckCircle, XCircle, Activity, Zap
} from 'lucide-react'
import { Card, CardContent } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { athensSustAdminApi, AthensTenant } from '../../../services/athensSustAdminApi'

const AthensTenantsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['athens-tenants'],
    queryFn: () => athensSustAdminApi.fetchTenants(),
  })

  const syncTenantMutation = useMutation({
    mutationFn: athensSustAdminApi.syncTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athens-tenants'] })
      toast.success('Tenant synced successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to sync tenant')
    }
  })

  const tenantsData = tenants?.results || []

  const filteredTenants = tenantsData.filter((tenant) => {
    const matchesSearch = tenant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.company_email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && tenant.athens_status.is_active) ||
                         (statusFilter === 'inactive' && !tenant.athens_status.is_active)
    return matchesSearch && matchesStatus
  })

  const handleSyncTenant = (tenant: AthensTenant) => {
    syncTenantMutation.mutate(tenant.id)
  }

  const getStatusIcon = (tenant: AthensTenant) => {
    if (tenant.athens_status.is_active) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (tenant: AthensTenant) => {
    if (tenant.athens_status.is_active) {
      return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    }
    return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Athens Tenants</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage sustainability platform tenants</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tenants by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <LoadingSpinner />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tenants found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="relative">
                        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                          {tenant.company_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                          tenant.athens_status.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tenant.company_name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant)}`}>
                            {getStatusIcon(tenant)}
                            <span className="ml-1">{tenant.athens_status.is_active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tenant.company_email}</p>
                        <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>Prefix: {tenant.company_prefix}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Zap className="h-3 w-3" />
                            <span>{tenant.enabled_modules.length} Modules</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Activity className="h-3 w-3" />
                            <span>{tenant.subscription_status.plan} Plan</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!tenant.athens_status.synced_at && (
                        <Button
                          size="sm"
                          onClick={() => handleSyncTenant(tenant)}
                          disabled={syncTenantMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          Sync
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AthensTenantsPage