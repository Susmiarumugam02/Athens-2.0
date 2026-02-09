import { apiClient } from '@/lib/api';

export interface SuperAdminUser {
  id: number;
  email: string;
  user_type: string;
  is_active: boolean;
  requires_2fa: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  codename: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user: number | null;
  user_email: string;
  action: string;
  module: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  request_data: any;
  response_data: any;
  status: 'success' | 'failure';
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  target_audience: 'all' | 'roles';
  target_roles: number[];
  created_by: number;
  created_by_email: string;
  scheduled_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  active_sessions: number;
  recent_activity_count: number;
  failed_logins: number;
  system_health: string;
}

export const superadminApi = {
  // Dashboard
  dashboard: {
    getStats: () => apiClient.get<DashboardStats>('/api/superadmin/dashboard/stats/'),
    getActivity: (limit = 20) => apiClient.get('/api/superadmin/dashboard/activity/', { params: { limit } }),
  },

  // Users
  users: {
    list: (params?: any) => apiClient.get<{ results: SuperAdminUser[]; count: number }>('/api/superadmin/users/', { params }),
    get: (id: number) => apiClient.get<SuperAdminUser>(`/api/superadmin/users/${id}/`),
    create: (data: any) => apiClient.post<SuperAdminUser>('/api/superadmin/users/', data),
    update: (id: number, data: any) => apiClient.put<SuperAdminUser>(`/api/superadmin/users/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/api/superadmin/users/${id}/`),
    resetPassword: (id: number) => apiClient.post(`/api/superadmin/users/${id}/reset_password/`),
    getSessions: (id: number) => apiClient.get(`/api/superadmin/users/${id}/sessions/`),
    revokeSession: (userId: number, sessionId: number) => 
      apiClient.post(`/api/superadmin/users/${userId}/sessions/${sessionId}/revoke/`),
    toggleStatus: (id: number) => apiClient.post(`/api/superadmin/users/${id}/toggle_status/`),
  },

  // Roles
  roles: {
    list: () => apiClient.get<Role[]>('/api/superadmin/roles/'),
    get: (id: number) => apiClient.get<Role>(`/api/superadmin/roles/${id}/`),
    create: (data: any) => apiClient.post<Role>('/api/superadmin/roles/', data),
    update: (id: number, data: any) => apiClient.put<Role>(`/api/superadmin/roles/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/api/superadmin/roles/${id}/`),
    assignPermissions: (id: number, permission_ids: number[]) => 
      apiClient.post(`/api/superadmin/roles/${id}/assign_permissions/`, { permission_ids }),
  },

  // Permissions
  permissions: {
    list: (params?: any) => apiClient.get<Permission[]>('/api/superadmin/permissions/', { params }),
    getModules: () => apiClient.get<string[]>('/api/superadmin/permissions/modules/'),
  },

  // Security
  security: {
    getPasswordPolicy: () => apiClient.get('/api/superadmin/security/password-policy/'),
    updatePasswordPolicy: (data: any) => apiClient.put('/api/superadmin/security/password-policy/', data),
    get2FASettings: () => apiClient.get('/api/superadmin/security/2fa-settings/'),
    update2FASettings: (data: any) => apiClient.put('/api/superadmin/security/2fa-settings/', data),
    getSessionSettings: () => apiClient.get('/api/superadmin/security/session-settings/'),
    updateSessionSettings: (data: any) => apiClient.put('/api/superadmin/security/session-settings/', data),
    getActiveSessions: () => apiClient.get('/api/superadmin/security/active-sessions/'),
    revokeSessions: (session_ids?: number[]) => 
      apiClient.post('/api/superadmin/security/active-sessions/', { session_ids }),
    listIPRestrictions: () => apiClient.get('/api/superadmin/security/ip-restrictions/'),
    createIPRestriction: (data: any) => apiClient.post('/api/superadmin/security/ip-restrictions/', data),
    deleteIPRestriction: (id: number) => apiClient.delete(`/api/superadmin/security/ip-restrictions/${id}/`),
  },

  // Audit Logs
  auditLogs: {
    list: (params?: any) => apiClient.get<{ results: AuditLog[]; count: number }>('/api/superadmin/audit-logs/', { params }),
    get: (id: number) => apiClient.get<AuditLog>(`/api/superadmin/audit-logs/${id}/`),
    export: (params?: any) => apiClient.get('/api/superadmin/audit-logs/export/', { 
      params, 
      responseType: 'blob' 
    }),
    getStats: (params?: any) => apiClient.get('/api/superadmin/audit-logs/stats/', { params }),
  },

  // Notifications
  announcements: {
    list: (params?: any) => apiClient.get<{ results: Announcement[]; count: number }>('/api/superadmin/announcements/', { params }),
    get: (id: number) => apiClient.get<Announcement>(`/api/superadmin/announcements/${id}/`),
    create: (data: any) => apiClient.post<Announcement>('/api/superadmin/announcements/', data),
    update: (id: number, data: any) => apiClient.put<Announcement>(`/api/superadmin/announcements/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/api/superadmin/announcements/${id}/`),
    getDeliveryStatus: (id: number) => apiClient.get(`/api/superadmin/announcements/${id}/delivery_status/`),
    toggleStatus: (id: number) => apiClient.post(`/api/superadmin/announcements/${id}/toggle_status/`),
  },

  // Settings
  settings: {
    getSystem: () => apiClient.get('/api/superadmin/settings/system/'),
    updateSystem: (data: any) => apiClient.put('/api/superadmin/settings/system/', data),
    toggleMaintenance: () => apiClient.post('/api/superadmin/settings/maintenance/'),
  },

  // Backups
  backups: {
    list: () => apiClient.get('/api/superadmin/backups/'),
    create: () => apiClient.post('/api/superadmin/backups/create_backup/'),
    download: (id: number) => apiClient.get(`/api/superadmin/backups/${id}/download/`, { responseType: 'blob' }),
    restore: (id: number) => apiClient.post(`/api/superadmin/backups/${id}/restore/`),
  },

  // Analytics
  analytics: {
    get: (days = 30) => apiClient.get('/api/superadmin/analytics/', { params: { days } }),
  },
};
