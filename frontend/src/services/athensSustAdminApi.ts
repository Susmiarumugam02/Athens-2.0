import { apiClient } from '../lib/api'

export interface AthensModule {
  id: number
  name: string
  key: string
  icon: string
  description: string
  is_active: boolean
}

export interface ModuleAccess {
  id: number
  tenant: number
  module: number
  is_enabled: boolean
  module_name: string
  module_key: string
  tenant_name: string
}

export interface AthensTenant {
  id: number
  company_name: string
  company_email: string
  company_prefix: string
  approval_status: string
  created_at: string
  athens_status: {
    is_active: boolean
    synced_at: string | null
    master_admin: string | null
  }
  enabled_modules: string[]
  subscription_status: {
    plan: string
    status: string
    seats: number
  }
}

export interface AthensMasterUser {
  id: number
  company: number
  company_name: string
  user_email: string
  user_first_name: string
  user_last_name: string
  created_at: string
  first_login_completed: boolean
  last_login_at: string | null
}

export interface AthensSubscription {
  id: number
  company: number
  company_name: string
  plan: string
  status: string
  seats: number
  start_date: string
  end_date: string | null
  payment_provider: string
  created_at: string
  updated_at: string
}

export interface AthensAuditLog {
  id: number
  actor: number | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string
  before_data: any
  after_data: any
  ip_address: string | null
  user_agent: string
  created_at: string
}

export interface AthensPlatformSettings {
  platform_name: string
  platform_url: string
  support_email: string
  session_timeout_minutes: number
  require_mfa: boolean
  max_login_attempts: number
  password_expiry_days: number
  updated_at: string
}

export interface AthensMetricsOverview {
  total_tenants: number
  active_tenants: number
  total_subscriptions: number
  active_subscriptions: number
  total_modules_enabled: number
  recent_activity_count: number
}

class AthensSustAdminApi {
  // Tenants Management
  async fetchTenants(): Promise<{ results: AthensTenant[] }> {
    const response = await apiClient.get('/api/athens-sust-admin/tenants/')
    return response.data
  }

  async createTenant(data: {
    name: string
    company_prefix: string
    email: string
    phone?: string
    address?: string
  }): Promise<AthensTenant> {
    const response = await apiClient.post('/api/athens-sust-admin/tenants/', data)
    return response.data
  }

  async updateTenant(id: number, data: {
    name?: string
    email?: string
    phone?: string
    address?: string
  }): Promise<AthensTenant> {
    const response = await apiClient.patch(`/api/athens-sust-admin/tenants/${id}/`, data)
    return response.data
  }

  async deleteTenant(id: number): Promise<void> {
    await apiClient.delete(`/api/athens-sust-admin/tenants/${id}/`)
  }

  async suspendTenant(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust-admin/tenants/${id}/suspend/`)
    return response.data
  }

  async reactivateTenant(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust-admin/tenants/${id}/reactivate/`)
    return response.data
  }

  async syncTenant(id: number): Promise<{ status: string; created: boolean; enabled_modules: string[] }> {
    const response = await apiClient.post(`/api/athens-sust-admin/tenants/${id}/sync/`)
    return response.data
  }

  // Modules Management
  async fetchModules(): Promise<{ results: AthensModule[] }> {
    const response = await apiClient.get('/api/athens-sust-admin/modules/')
    return response.data
  }

  async fetchModuleAccess(tenantId: number): Promise<ModuleAccess[]> {
    const response = await apiClient.get(`/api/athens-sust-admin/module-access/tenant/${tenantId}/`)
    return response.data
  }

  async saveModuleAccess(data: { 
    tenant_id: number
    modules: Array<{ module_id: number; is_enabled: boolean }> 
  }): Promise<{ status: string }> {
    const response = await apiClient.post('/api/athens-sust-admin/module-access/save/', data)
    return response.data
  }

  // Tenant Modules Management
  async fetchTenantModules(id: number): Promise<{
    enabled_modules: string[]
    available_modules: string[]
  }> {
    const response = await apiClient.get(`/api/athens-sust-admin/tenants/${id}/modules/`)
    return response.data
  }

  async updateTenantModules(id: number, enabled_modules: string[]): Promise<{
    enabled_modules: string[]
    status: string
  }> {
    const response = await apiClient.patch(`/api/athens-sust-admin/tenants/${id}/modules/`, {
      enabled_modules
    })
    return response.data
  }

  // Masters Management
  async fetchMasters(): Promise<{ results: AthensMasterUser[] }> {
    const response = await apiClient.get('/api/athens-sust-admin/masters/')
    return response.data
  }

  async createMaster(data: {
    company_id: number
    email: string
    first_name: string
    last_name: string
    force_password_reset?: boolean
  }): Promise<AthensMasterUser> {
    const response = await apiClient.post('/api/athens-sust-admin/masters/', data)
    return response.data
  }

  async updateMaster(id: number, data: {
    first_name?: string
    last_name?: string
  }): Promise<AthensMasterUser> {
    const response = await apiClient.patch(`/api/athens-sust-admin/masters/${id}/`, data)
    return response.data
  }

  async deleteMaster(id: number): Promise<void> {
    await apiClient.delete(`/api/athens-sust-admin/masters/${id}/`)
  }

  async resetMasterPassword(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust-admin/masters/${id}/reset-password/`)
    return response.data
  }

  // Subscriptions Management
  async fetchSubscriptions(): Promise<{ results: AthensSubscription[] }> {
    const response = await apiClient.get('/api/athens-sust-admin/subscriptions/')
    return response.data
  }

  async fetchTenantSubscription(tenantId: number): Promise<AthensSubscription> {
    const response = await apiClient.get(`/api/athens-sust-admin/subscriptions/?company=${tenantId}`)
    return response.data.results[0]
  }

  async updateTenantSubscription(id: number, data: {
    plan?: string
    status?: string
    seats?: number
    end_date?: string
  }): Promise<AthensSubscription> {
    const response = await apiClient.patch(`/api/athens-sust-admin/subscriptions/${id}/`, data)
    return response.data
  }

  // Audit Logs
  async fetchAuditLogs(filters?: {
    tenant_id?: number
    actor_id?: number
    action?: string
    from?: string
    to?: string
  }): Promise<{ results: AthensAuditLog[] }> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString())
        }
      })
    }
    const response = await apiClient.get(`/api/athens-sust-admin/audit-logs/?${params}`)
    return response.data
  }

  // Settings Management
  async fetchSettings(): Promise<AthensPlatformSettings> {
    const response = await apiClient.get('/api/athens-sust-admin/settings/1/')
    return response.data
  }

  async updateSettings(data: Partial<AthensPlatformSettings>): Promise<AthensPlatformSettings> {
    const response = await apiClient.patch('/api/athens-sust-admin/settings/1/', data)
    return response.data
  }

  // Metrics
  async fetchMetricsOverview(range: '7d' | '30d' | '90d' = '30d'): Promise<AthensMetricsOverview> {
    const response = await apiClient.get(`/api/athens-sust-admin/metrics/overview/?range=${range}`)
    return response.data
  }
}

export const athensSustAdminApi = new AthensSustAdminApi()