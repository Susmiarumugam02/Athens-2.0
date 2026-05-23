import { apiClient } from '../lib/api'

export interface Project {
  id: number
  projectName: string
  projectCategory: string
  capacity: string
  location: string
  latitude?: number
  longitude?: number
  nearestPoliceStation: string
  nearestPoliceStationContact: string
  nearestHospital: string
  nearestHospitalContact: string
  commencementDate: string
  deadlineDate: string
  athens_tenant_id?: string
  client_company_id?: string
  epc_company_id?: string
  contractor_company_ids?: string[]
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  total_users: number
  pending_approvals: number
}

export interface TenantUser {
  id: number
  email: string
  name?: string
  surname?: string
  department?: string
  designation?: string
  is_active: boolean
  created_at: string
}

export interface AdminUser {
  id: number
  username: string
  name?: string
  email: string
  admin_type?: 'client' | 'epc' | 'contractor'
  company_name?: string
  registered_address?: string
  project?: number
  project_name?: string
  is_active: boolean
  created_at: string
  users_created_count?: number
}

export interface CreatedUser {
  id: number
  username: string
  name?: string
  email?: string
  company_type?: string
  role_type?: string
  role?: string
  status?: string
  is_active: boolean
  approval_status?: string
  induction_attended?: boolean
  induction_status?: string
  module_access_enabled?: boolean
  attendance_percentage?: number
  attendance_percent?: number
  attendance?: number
  ptw_count?: number
  permit_count?: number
  safety_score?: number
  last_login?: string | null
  created_at?: string
  project_name?: string
}

export interface ProjectWithAnalytics {
  id: number
  projectName: string
  projectCategory: string
  location: string
  subscriber_role: string | null
  commencementDate: string | null
  deadlineDate: string | null
  admin_count: number
  user_count: number
  active_user_count: number
  admin_type_counts: Record<string, number>
}

export interface AdminCreatedUsersResponse {
  admin_id: number
  admin_username: string
  admin_name: string
  admin_type: string
  company_name: string
  project_name: string
  users: CreatedUser[]
  total: number
}

export interface ProjectAdminCreateRequest {
  project_id: number
  admin_type: 'client' | 'epc' | 'contractor'
  username: string
  company_name: string
  registered_address: string
}

export interface ProjectAdminCreateResponse {
  username: string
  password: string
  admin_type: string
  company_name: string
  registered_address: string
}

export const masterAdminService = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/api/auth/masteradmin/dashboard/stats/')
    return response.data
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get('/api/auth/masteradmin/projects/')
    return response.data
  },

  async createProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    const response = await apiClient.post('/api/auth/masteradmin/projects/', projectData)
    return response.data
  },

  async getProject(projectId: number): Promise<Project> {
    const response = await apiClient.get(`/api/auth/masteradmin/projects/${projectId}/`)
    return response.data
  },

  async updateProject(projectId: number, projectData: Partial<Project>): Promise<Project> {
    const response = await apiClient.put(`/api/auth/masteradmin/projects/${projectId}/`, projectData)
    return response.data
  },

  async deleteProject(projectId: number): Promise<void> {
    await apiClient.delete(`/api/auth/masteradmin/projects/${projectId}/`)
  },

  // Project Admins (Original Athens Parity)
  async createProjectAdmin(data: ProjectAdminCreateRequest): Promise<ProjectAdminCreateResponse> {
    const response = await apiClient.post('/api/auth/masteradmin/admin-users/create-project-admin/', data)
    return response.data
  },

  async getProjectAdmins(projectId: number): Promise<{
    project_id: number
    project_name: string
    grouped: Record<string, AdminUser[]>
    all: AdminUser[]
  }> {
    const response = await apiClient.get(`/api/auth/masteradmin/projects/${projectId}/admins/`)
    return response.data
  },

  async getAdminCreatedUsers(adminId: number): Promise<AdminCreatedUsersResponse> {
    const response = await apiClient.get(`/api/auth/masteradmin/admin-users/${adminId}/users/`)
    return response.data
  },

  async getProjectsWithAnalytics(): Promise<ProjectWithAnalytics[]> {
    const response = await apiClient.get('/api/auth/masteradmin/projects/analytics/')
    return response.data
  },

  // Admin Users
  async getAdminUsers(adminId?: number): Promise<AdminUser[] | AdminCreatedUsersResponse> {
    const response = adminId
      ? await apiClient.get(`/api/auth/masteradmin/admin-users/${adminId}/users/`)
      : await apiClient.get('/api/auth/masteradmin/admin-users/')
    return response.data
  },

  async deleteAdminUser(userId: number): Promise<void> {
    await apiClient.delete(`/api/auth/masteradmin/admin-users/${userId}/`)
  },

  async createAdminUser(userData: { name: string; username: string }): Promise<{ id: number; name: string; username: string; password: string }> {
    const response = await apiClient.post('/api/auth/masteradmin/admin-users/', userData)
    return response.data
  },

  async resetAdminPassword(userId: number): Promise<void> {
    await apiClient.post(`/api/auth/masteradmin/users/${userId}/reset-password/`)
  },

  async toggleAdminActive(userId: number, isActive: boolean): Promise<void> {
    await apiClient.post(`/api/auth/masteradmin/users/${userId}/toggle-status/`)
  },

  // Project Modules (Menu Management)
  async getProjectModules(projectId: number): Promise<Array<{
    id: number
    project_id: number
    module_code: string
    is_enabled: boolean
  }>> {
    const response = await apiClient.get(`/api/control-plane/project-modules/?project_id=${projectId}`)
    // Safely unwrap: DRF may return array directly or paginated { results: [] }
    const data = response.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  async saveProjectModules(projectId: number, modules: Array<{
    module_code: string
    is_enabled: boolean
  }>): Promise<Array<{ module_code: string; is_enabled: boolean }>> {
    // Single atomic bulk-save — one request, one DB transaction, no race conditions
    const response = await apiClient.post('/api/control-plane/project-modules/bulk-save/', {
      project_id: projectId,
      modules,
    })
    const data = response.data
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  // Users
  async getTenantUsers(): Promise<TenantUser[]> {
    const response = await apiClient.get('/api/auth/masteradmin/users/')
    return response.data
  },

  async approveUser(userId: number): Promise<void> {
    await apiClient.post(`/api/auth/masteradmin/users/${userId}/approve/`)
  },
}
