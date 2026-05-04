import apiClient from '../lib/api'

export interface Project {
  id: number
  company: number
  company_name: string
  name: string
  code: string
  status: 'active' | 'inactive' | 'archived'
  start_date: string | null
  end_date: string | null
  members_count: number
  created_by: number | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: number
  project: number
  project_name: string
  user: number
  user_email: string
  user_type: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProjectData {
  name: string
  code?: string
  status?: string
  start_date?: string | null
  end_date?: string | null
}

export interface AddMemberData {
  user_id: number
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

class ProjectsService {
  async listProjects(params?: { status?: string; search?: string }) {
    const response = await apiClient.get<Project[]>('/projects/projects/', { params })
    return response.data
  }

  async createProject(data: CreateProjectData) {
    const response = await apiClient.post<Project>('/projects/projects/', data)
    return response.data
  }

  async updateProject(id: number, data: Partial<CreateProjectData>) {
    const response = await apiClient.patch<Project>(`/projects/projects/${id}/`, data)
    return response.data
  }

  async getProject(id: number) {
    const response = await apiClient.get<Project>(`/projects/projects/${id}/`)
    return response.data
  }

  async activateProject(id: number) {
    const response = await apiClient.post(`/projects/projects/${id}/activate/`)
    return response.data
  }

  async deactivateProject(id: number) {
    const response = await apiClient.post(`/projects/projects/${id}/deactivate/`)
    return response.data
  }

  async archiveProject(id: number) {
    const response = await apiClient.post(`/projects/projects/${id}/archive/`)
    return response.data
  }

  async listMembers(projectId: number) {
    const response = await apiClient.get<ProjectMember[]>(`/projects/projects/${projectId}/members/`)
    return response.data
  }

  async addMember(projectId: number, data: AddMemberData) {
    const response = await apiClient.post<ProjectMember>(`/projects/projects/${projectId}/members/`, data)
    return response.data
  }

  async updateMember(memberId: number, data: Partial<ProjectMember>) {
    const response = await apiClient.patch<ProjectMember>(`/projects/memberships/${memberId}/`, data)
    return response.data
  }

  async removeMember(memberId: number) {
    await apiClient.delete(`/projects/memberships/${memberId}/`)
  }
}

export const projectsService = new ProjectsService()
