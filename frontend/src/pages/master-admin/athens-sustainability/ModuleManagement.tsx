import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Settings, Save, RefreshCw, Building2, Menu,
  BarChart3, Package, Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { athensSustAdminApi, AthensModule, ModuleAccess } from '../../../services/athensSustAdminApi'

const ModuleManagement: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null)
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([])
  const [saving, setSaving] = useState(false)

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['athens-tenants'],
    queryFn: () => athensSustAdminApi.fetchTenants(),
  })

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['athens-modules'],
    queryFn: () => athensSustAdminApi.fetchModules(),
  })

  const { data: moduleAccessData, isLoading: accessLoading } = useQuery({
    queryKey: ['module-access', selectedTenant],
    queryFn: () => selectedTenant ? athensSustAdminApi.fetchModuleAccess(selectedTenant) : Promise.resolve([]),
    enabled: !!selectedTenant
  })

  const saveModulesMutation = useMutation({
    mutationFn: athensSustAdminApi.saveModuleAccess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-access', selectedTenant] })
      toast.success('Module configuration saved successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save module configuration')
    }
  })

  const tenantsData = tenants?.results || []
  const modulesData: AthensModule[] = modules?.results || []

  useEffect(() => {
    if (moduleAccessData) {
      setModuleAccess(moduleAccessData)
    }
  }, [moduleAccessData])

  const handleTenantChange = (tenantId: number) => {
    setSelectedTenant(tenantId)
  }

  const handleModuleToggle = (moduleId: number, enabled: boolean) => {
    setModuleAccess(prev => {
      const existing = prev.find(access => access.module === moduleId)
      if (existing) {
        return prev.map(access =>
          access.module === moduleId
            ? { ...access, is_enabled: enabled }
            : access
        )
      }
      
      const module = modulesData.find(m => m.id === moduleId)
      const tenant = tenantsData.find(t => t.id === selectedTenant)
      if (module && tenant) {
        return [
          ...prev,
          {
            id: 0,
            tenant: selectedTenant!,
            module: moduleId,
            is_enabled: enabled,
            module_name: module.name,
            module_key: module.key,
            tenant_name: tenant.company_name
          }
        ]
      }
      return prev
    })
  }

  const handleSaveConfiguration = async () => {
    if (!selectedTenant) {
      toast.error('Please select a tenant')
      return
    }

    setSaving(true)
    try {
      const moduleData = modulesData.map(module => {
        const access = moduleAccess.find(a => a.module === module.id)
        return {
          module_id: module.id,
          is_enabled: access ? access.is_enabled : false
        }
      })

      await saveModulesMutation.mutateAsync({
        tenant_id: selectedTenant,
        modules: moduleData
      })
    } finally {
      setSaving(false)
    }
  }

  const getModuleStatus = (moduleId: number): boolean => {
    const access = moduleAccess.find(a => a.module === moduleId)
    return access ? access.is_enabled : false
  }

  const selectedTenantData = tenantsData.find(t => t.id === selectedTenant)
  const enabledModulesCount = moduleAccess.filter(access => access.is_enabled).length
  const totalModulesCount = modulesData.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Module Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure tenant-wise access to sustainability modules</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenantsData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalModulesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enabled Modules</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{enabledModulesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Coverage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalModulesCount > 0 ? Math.round((enabledModulesCount / totalModulesCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-blue-500" />
            <span>Tenant Module Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Tenant:
              </label>
              <select
                value={selectedTenant || ''}
                onChange={(e) => handleTenantChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={tenantsLoading}
              >
                <option value="">Choose a tenant to configure</option>
                {tenantsData.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.company_name} ({tenant.company_prefix})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSaveConfiguration}
                disabled={!selectedTenant || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedTenant && queryClient.invalidateQueries({ queryKey: ['module-access', selectedTenant] })}
                disabled={!selectedTenant}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {selectedTenant && selectedTenantData && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Configuring modules for: {selectedTenantData.company_name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-blue-700 dark:text-blue-300">
                <span>Prefix: {selectedTenantData.company_prefix}</span>
                <span>Email: {selectedTenantData.company_email}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedTenantData.athens_status.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {selectedTenantData.athens_status.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {selectedTenant && (
            <Card>
              <CardContent className="p-0">
                {accessLoading || modulesLoading ? (
                  <div className="p-8 text-center">
                    <LoadingSpinner />
                  </div>
                ) : modulesData.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No modules available</h3>
                    <p className="text-gray-600 dark:text-gray-400">No sustainability modules found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {modulesData.map((module) => (
                      <div key={module.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                              {module.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{module.name}</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                  {module.key}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  module.is_active 
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                }`}>
                                  {module.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {module.description || 'No description available'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={getModuleStatus(module.id)}
                                onChange={(e) => handleModuleToggle(module.id, e.target.checked)}
                                disabled={!module.is_active}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedTenant && (
            <div className="text-center py-12">
              <Menu className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a tenant</h3>
              <p className="text-gray-600 dark:text-gray-400">Choose a tenant to configure module access</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ModuleManagement