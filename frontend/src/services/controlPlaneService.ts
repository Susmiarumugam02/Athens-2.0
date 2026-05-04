import { apiClient } from '../lib/api'

export interface Tenant {
  id: number
  name: string
  code: string
  admin_email?: string
  contact_phone?: string
  industry?: string
  timezone?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Subscription {
  id: number | null
  tenant: number
  tenant_name?: string
  plan_name: string
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'none'
  display_status?: 'active' | 'expired' | 'not_started' | 'none'
  valid_from: string | null
  valid_until?: string | null
  remaining_days?: number | null
  created_at: string | null
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
  updateTenant: (id: number, data: any) =>
    apiClient.patch(`/api/control-plane/tenants/${id}/`, data),
  disableTenant: (id: number) =>
    apiClient.post(`/api/control-plane/tenants/${id}/disable/`),
  enableTenant: (id: number) =>
    apiClient.post(`/api/control-plane/tenants/${id}/enable/`),
  deleteTenant: (id: number) =>
    apiClient.delete(`/api/control-plane/tenants/${id}/`),

  // Subscriptions
  getSubscriptions: () => apiClient.get<Subscription[]>('/api/control-plane/subscriptions/'),
  createSubscription: (data: { tenant: number; plan_name: string; status: string; start_date: string; end_date?: string }) =>
    apiClient.post<Subscription>('/api/control-plane/subscriptions/', data),
  updateSubscription: (id: number, data: any) =>
    apiClient.patch(`/api/control-plane/subscriptions/${id}/`, data),

  // Audit Logs
  getAuditLogs: (params?: { start_date?: string; end_date?: string; company_id?: number; user_id?: number; event_type?: string }) =>
    apiClient.get<AuditLog[]>('/api/control-plane/audit-logs/', { params }),
}
