import { apiClient } from '../lib/api'

export interface Tenant {
  id: number
  name: string
  domain: string
  is_active: boolean
  created_at: string
  created_by: number
}

export interface Subscription {
  id: number
  tenant: number
  tenant_name?: string
  plan_name: string
  status: 'active' | 'inactive' | 'suspended'
  start_date: string
  end_date?: string
  created_at: string
}

export interface AuditLog {
  id: number
  user_id?: number
  user_email?: string
  company_id?: number
  event_type: string
  severity: string
  ip_address: string
  user_agent: string
  metadata: Record<string, any>
  created_at: string
}

export const controlPlaneService = {
  // Tenants
  getTenants: () => apiClient.get<Tenant[]>('/api/control-plane/tenants/'),
  createTenant: (data: { name: string; domain: string }) => 
    apiClient.post<Tenant>('/api/control-plane/tenants/', data),
  disableTenant: (id: number) => 
    apiClient.post(`/api/control-plane/tenants/${id}/disable/`),
  enableTenant: (id: number) => 
    apiClient.post(`/api/control-plane/tenants/${id}/enable/`),

  // Subscriptions
  getSubscriptions: () => apiClient.get<Subscription[]>('/api/control-plane/subscriptions/'),
  createSubscription: (data: { tenant: number; plan_name: string; status: string; start_date: string; end_date?: string }) =>
    apiClient.post<Subscription>('/api/control-plane/subscriptions/', data),

  // Audit Logs
  getAuditLogs: (params?: { start_date?: string; end_date?: string; company_id?: number; user_id?: number; event_type?: string }) =>
    apiClient.get<AuditLog[]>('/api/control-plane/audit-logs/', { params }),
}
