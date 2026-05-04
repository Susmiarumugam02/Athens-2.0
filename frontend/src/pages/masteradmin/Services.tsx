import React, { useEffect, useState } from 'react'
import { apiClient } from '../../lib/api'
import { toast } from '../../lib/toast'
import { useAuthStore } from '../../store/authStore'
import { Card } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ExternalLink } from 'lucide-react'

interface Service {
  id: number
  name: string
  code: string
  description: string
  service_type: string
  base_url: string
  icon: string
  is_active: boolean
}

interface TenantService {
  id: number
  service: Service
  tier: string
  is_enabled: boolean
  enabled_at: string
}

export default function ServicesPage() {
  const { user } = useAuthStore()
  const [services, setServices] = useState<Service[]>([])
  const [tenantServices, setTenantServices] = useState<TenantService[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const isOwnerOrAdmin = user?.user_type === 'masteradmin' || user?.admin_type

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [servicesRes, tenantServicesRes] = await Promise.all([
        apiClient.get('/api/system/services/'),
        apiClient.get('/api/system/tenant-services/')
      ])
      setServices(servicesRes.data)
      setTenantServices(tenantServicesRes.data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const isServiceEnabled = (serviceCode: string) => {
    return tenantServices.some(ts => ts.service.code === serviceCode && ts.is_enabled)
  }

  const handleToggle = async (serviceCode: string, currentlyEnabled: boolean) => {
    if (!isOwnerOrAdmin) {
      toast.error('Only Owner/Admin can manage services')
      return
    }

    try {
      setToggling(serviceCode)
      const endpoint = currentlyEnabled
        ? `/api/system/tenant-services/${serviceCode}/disable/`
        : `/api/system/tenant-services/${serviceCode}/enable/`
      
      await apiClient.post(endpoint)
      toast.success(`Service ${currentlyEnabled ? 'disabled' : 'enabled'} successfully`)
      await fetchData()
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

  if (!isOwnerOrAdmin) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Owner/Admin users can manage services.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Enable or disable external services for your organization
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map(service => {
          const enabled = isServiceEnabled(service.code)
          const isToggling = toggling === service.code

          return (
            <Card key={service.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {service.description}
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => handleToggle(service.code, enabled)}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      enabled ? 'bg-blue-600' : 'bg-gray-300'
                    } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>

                {enabled && service.base_url && (
                  service.base_url.startsWith('http://') || service.base_url.startsWith('https://') ? (
                    <a
                      href={service.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Open {service.name} <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-not-allowed" title="Service URL not configured">
                      Not Configured
                    </span>
                  )
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {services.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">No services available</p>
        </Card>
      )}
    </div>
  )
}
