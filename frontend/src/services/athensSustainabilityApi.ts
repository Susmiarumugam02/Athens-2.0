import { apiClient } from '../lib/api'

export interface AthensSustProject {
  id: number
  name: string
  category: string
  capacity: string
  location: string
  latitude?: number
  longitude?: number
  nearest_police_station: string
  nearest_police_contact: string
  nearest_hospital: string
  nearest_hospital_contact: string
  commencement_date: string
  deadline_date: string
  is_active: boolean
  company_name: string
  created_by_name: string
  members_count: number
  created_at: string
  updated_at: string
}

export interface AthensSustProjectMember {
  id: number
  project: number
  user: number
  role: string
  is_active: boolean
  user_name: string
  user_email: string
  user_username: string
  assigned_by_name: string
  project_name: string
  assigned_at: string
}

export interface AthensSustDashboard {
  total_projects: number
  active_projects: number
  total_members: number
  project_categories: Record<string, number>
  upcoming_deadlines: Array<{
    id: number
    name: string
    deadline_date: string
  }>
  recent_activities: Array<{
    id: number
    name: string
    updated_at: string
    created_at: string
  }>
}

export interface AdminDirectoryAdmin {
  id: number
  user: {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
  }
  project: {
    id: number
    name: string
  }
  org_mapping?: {
    org_type: string
    org_name: string
  }
  role_type: string
  is_active: boolean
  invited_at: string
  activated_at?: string
}

export interface AdminDirectoryResponse {
  results: AdminDirectoryAdmin[]
  projects: Array<{ id: number; name: string }>
  total_count: number
}

export interface BusinessRules {
  project_id: number
  project_name: string
  active_roles: string[]
  rules: {
    client_admin: {
      max_active: number
      current_active: number
      can_create_new: boolean
    }
    epc_admin: {
      max_active: number
      current_active: number
      can_create_new: boolean
    }
    contractor_admin: {
      max_active: number | null
      current_active: number
      can_create_new: boolean
    }
  }
}

export interface ProjectCreateData {
  name: string
  category: string
  capacity: string
  location: string
  latitude?: number
  longitude?: number
  nearest_police_station: string
  nearest_police_contact: string
  nearest_hospital: string
  nearest_hospital_contact: string
  commencement_date: string
  deadline_date: string
}

class AthensSustainabilityApi {
  // Projects
  async getProjects(): Promise<{ results: AthensSustProject[] }> {
    const response = await apiClient.get('/api/athens-sust/projects/')
    return response.data
  }

  async getProject(id: number): Promise<AthensSustProject> {
    const response = await apiClient.get(`/api/athens-sust/projects/${id}/`)
    return response.data
  }

  async createProject(data: ProjectCreateData): Promise<AthensSustProject> {
    const response = await apiClient.post('/api/athens-sust/projects/', data)
    return response.data
  }

  async updateProject(id: number, data: Partial<ProjectCreateData>): Promise<AthensSustProject> {
    const response = await apiClient.put(`/api/athens-sust/projects/${id}/`, data)
    return response.data
  }

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/api/athens-sust/projects/${id}/`)
  }

  async archiveProject(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust/projects/${id}/archive/`)
    return response.data
  }

  async restoreProject(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust/projects/${id}/restore/`)
    return response.data
  }

  // Project Members
  async getProjectMembers(projectId?: number): Promise<{ results: AthensSustProjectMember[] }> {
    const params = projectId ? { project_id: projectId } : {}
    const response = await apiClient.get('/api/athens-sust/members/', { params })
    return response.data
  }

  async addProjectMember(projectId: number, data: { user: number; role: string }): Promise<AthensSustProjectMember> {
    const response = await apiClient.post('/api/athens-sust/members/', {
      ...data,
      project_id: projectId
    })
    return response.data
  }

  async updateProjectMember(id: number, data: { role: string }): Promise<AthensSustProjectMember> {
    const response = await apiClient.put(`/api/athens-sust/members/${id}/`, data)
    return response.data
  }

  async removeProjectMember(id: number): Promise<void> {
    await apiClient.delete(`/api/athens-sust/members/${id}/`)
  }

  async deactivateProjectMember(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust/members/${id}/deactivate/`)
    return response.data
  }

  async activateProjectMember(id: number): Promise<{ status: string }> {
    const response = await apiClient.post(`/api/athens-sust/members/${id}/activate/`)
    return response.data
  }

  // Dashboard
  async getDashboardOverview(): Promise<AthensSustDashboard> {
    const response = await apiClient.get('/api/athens-sust/dashboard/overview/')
    return response.data
  }

  async selectProject(projectId: number): Promise<{ status: string; project_id: number; project_name: string }> {
    const response = await apiClient.post('/api/athens-sust/dashboard/select_project/', {
      project_id: projectId
    })
    return response.data
  }

  async getCurrentProject(): Promise<{ has_active_project: boolean; project: AthensSustProject | null }> {
    const response = await apiClient.get('/api/athens-sust/dashboard/current_project/')
    return response.data
  }

  async clearProject(): Promise<{ status: string }> {
    const response = await apiClient.post('/api/athens-sust/dashboard/clear_project/')
    return response.data
  }

  // Admin Directory
  async getAdminDirectory(filters?: {
    project?: string
    role_type?: string
    status?: string
    org_type?: string
  }): Promise<AdminDirectoryResponse> {
    const response = await apiClient.get('/api/athens-sust/admin-directory/', { params: filters })
    return response.data
  }

  async editAdmin(id: number, data: {
    role_type?: string
    is_active?: boolean
  }): Promise<{ status: string; updated_fields: string[]; admin: AdminDirectoryAdmin }> {
    const response = await apiClient.put(`/api/athens-sust/admin-directory/${id}/edit/`, data)
    return response.data
  }

  async toggleAdminStatus(id: number): Promise<{ status: string; admin: AdminDirectoryAdmin }> {
    const response = await apiClient.post(`/api/athens-sust/admin-directory/${id}/toggle-status/`)
    return response.data
  }

  async getBusinessRules(projectId: string): Promise<BusinessRules> {
    const response = await apiClient.get('/api/athens-sust/admin-directory/business-rules/', {
      params: { project: projectId }
    })
    return response.data
  }

  // Get parent EPC organizations for contractor admins
  async getParentOrgs(projectId: string): Promise<Array<{ id: number; org_name: string }>> {
    const response = await apiClient.get('/api/athens-sust/admin-users/parent-orgs/', {
      params: { project: projectId }
    })
    return response.data
  }
}

export const athensSustainabilityApi = new AthensSustainabilityApi()