import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Package, Power, PowerOff, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

interface Service {
  id: number
  name: string
  code: string
  description: string
  service_type: string
  is_active: boolean
}

interface Tenant {
  id: number
  name: string
  code: string
  is_active: boolean
}

interface TenantService {
  service: Service
  tier: string
  is_enabled: boolean
}

const SERVICE_TYPES: Record<string, string> = {
  hr_workforce: 'HR & Workforce',
  project: 'Project Management',
  sustainability: 'Sustainability',
  finance: 'Finance',
  crm: 'CRM',
  inventory: 'Inventory',
  other: 'Other'
}

export default function ServicesPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantServices, setTenantServices] = useState<Map<string, TenantService>>(new Map())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [servicesRes, tenantsRes] = await Promise.all([
        apiClient.get('/api/system/services/'),
        apiClient.get('/api/control-plane/tenants/')
      ])
      
      setServices(servicesRes.data)
      setTenants(tenantsRes.data)
      
      const tsMap = new Map<string, TenantService>()
      await Promise.all(
        tenantsRes.data.map(async (tenant: Tenant) => {
          try {
            const res = await apiClient.get(`/api/system/tenant-services/?tenant_id=${tenant.id}`)
            res.data.forEach((ts: TenantService) => {
              tsMap.set(`${tenant.id}-${ts.service.code}`, ts)
            })
          } catch (e) {
            // Tenant has no services
          }
        })
      )
      setTenantServices(tsMap)
    } catch (error) {
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const toggleService = async (tenant: Tenant, service: Service) => {
    const key = `${tenant.id}-${service.code}`
    const ts = tenantServices.get(key)
    const isEnabled = ts?.is_enabled || false
    
    try {
      setToggling(key)
      
      if (isEnabled) {
        await apiClient.post(`/api/system/tenant-services/${service.code}/disable/`, {
          tenant_id: tenant.id
        })
        toast.success(`${service.name} disabled`)
      } else {
        await apiClient.post(`/api/system/tenant-services/${service.code}/enable/`, {
          tenant_id: tenant.id
        })
        toast.success(`${service.name} enabled`)
      }
      
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle service')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Enable/disable services for tenants</p>
          </div>
        </div>
        <Button onClick={() => navigate('/superadmin/subscriptions')} variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Subscriptions
        </Button>
      </div>

      {/* Service Types */}
      <div className="flex gap-2 flex-wrap">
        {services.reduce((types, s) => {
          types[s.service_type] = (types[s.service_type] || 0) + 1
          return types
        }, {} as Record<string, number>).constructor === Object && 
          Object.entries(
            services.reduce((types, s) => {
              types[s.service_type] = (types[s.service_type] || 0) + 1
              return types
            }, {} as Record<string, number>)
          ).map(([type, count]) => (
            <Badge key={type} variant="secondary">
              {SERVICE_TYPES[type] || type} ({count})
            </Badge>
          ))
        }
      </div>

      {/* Services Matrix */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10">
                  Tenant
                </th>
                {services.map(service => (
                  <th key={service.code} className="text-center py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{service.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {SERVICE_TYPES[service.service_type]}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4 sticky left-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.code}</div>
                      <Badge variant={tenant.is_active ? 'success' : 'secondary'} className="text-xs mt-1">
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </td>
                  {services.map(service => {
                    const key = `${tenant.id}-${service.code}`
                    const ts = tenantServices.get(key)
                    const isEnabled = ts?.is_enabled || false
                    const tier = ts?.tier || 'basic'
                    const isToggling = toggling === key
                    
                    return (
                      <td key={service.code} className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <button
                            onClick={() => toggleService(tenant, service)}
                            disabled={isToggling || !tenant.is_active}
                            className={`p-2 rounded-lg transition-colors ${
                              isEnabled
                                ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            } ${isToggling || !tenant.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isEnabled ? 'Disable' : 'Enable'}
                          >
                            {isToggling ? (
                              <LoadingSpinner size="sm" />
                            ) : isEnabled ? (
                              <Power className="w-5 h-5" />
                            ) : (
                              <PowerOff className="w-5 h-5" />
                            )}
                          </button>
                          {isEnabled && (
                            <Badge variant="secondary" className="text-xs">
                              {tier}
                            </Badge>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No tenants found</p>
          )}
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Power className="w-4 h-4 text-green-600" />
            <span className="text-gray-600 dark:text-gray-400">Enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <PowerOff className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Disabled</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">Service Tiers:</span>
            <Badge variant="secondary" className="text-xs">starter</Badge>
            <Badge variant="secondary" className="text-xs">professional</Badge>
            <Badge variant="secondary" className="text-xs">enterprise</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
