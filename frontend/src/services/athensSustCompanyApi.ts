import { apiClient } from '../lib/api'

export interface AthensSustProject {
  id: number
  name: string
  category: string
  capacity?: string
  capacity_size?: string
  location?: string
  city: string
  state: string
  latitude?: number
  longitude?: number
  nearest_police_station?: string
  nearest_police_contact?: string
  nearest_hospital?: string
  nearest_hospital_contact?: string
  police_station_name?: string
  police_station_contact?: string
  hospital_name?: string
  hospital_contact?: string
  commencement_date: string
  deadline_date: string
  is_active: boolean
  is_deleted?: boolean
  status?: string
  company_name?: string
  created_by_name?: string
  members_count?: number
  created_at?: string
  updated_at?: string
}

export interface AthensOrgMapping {
  id: number
  project: number
  project_name?: string
  org_type: string
  org_name: string
  parent_org?: number | null
  created_at?: string
}

export interface AthensAdminUser {
  id: number
  project: number
  role_type: string
  is_active: boolean
  must_reset_password: boolean
  invited_at: string
  activated_at?: string | null
  last_password_reset_at?: string | null
  username: string
  full_name: string
  email: string
  last_login?: string | null
  org_type?: string
  org_name?: string
  assigned_modules_count?: number
}

export interface AthensEmployeeUser {
  id: number
  full_name: string
  email: string
  username: string
  department?: string
  designation?: string
  grade?: string
  phone_number?: string
  profile_status?: string
  created_at?: string
  updated_at?: string
}

export interface AthensAccessState {
  stage: string
  profile_status: string
  has_completed_induction: boolean
  allowed_menu_keys: string[]
}

export interface AthensUserProfile {
  id: number
  user: number
  company: number
  project: number | null
  project_name?: string
  full_name?: string
  email?: string
  phone?: string
  position?: string
  gender?: string
  father_or_spouse_name?: string
  date_of_birth?: string
  nationality?: string
  employee_id?: string
  education_level?: string
  date_of_joining?: string
  mobile?: string
  mark_of_identification?: string
  uan?: string
  pan?: string
  aadhaar?: string
  photo?: string
  pan_attachment?: string
  aadhaar_attachment?: string
  approval_status?: string
  approved_by?: number | null
  approved_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProjectModuleConfig {
  id: number
  project: number
  module_key: string
  enabled: boolean
  allowed_roles: string[]
  feature_flags: Record<string, any>
  updated_at?: string
}

export interface AuditLogEntry {
  id: number
  action: string
  actor_email?: string
  target_email?: string
  project_name?: string
  payload?: Record<string, any>
  created_at: string
}

export interface AnalyticsOverview {
  total_permits: number
  safety_observations: number
  active_workers: number
  compliance_rate: number
  open_actions?: number
  trainings_completed?: number
}

export interface AnalyticsSeriesResponse {
  labels: string[]
  series: Record<string, number[]>
}

export interface AnalyticsDepartmentDistribution {
  data: Array<{ department: string; percent: number }>
}

export interface PerformanceMetrics {
  safety_score: number
  permit_efficiency: number
  training_completion: number
  incident_resolution: number
}

class AthensSustCompanyApi {
  async listProjects(params?: Record<string, any>): Promise<{ results: AthensSustProject[] } | AthensSustProject[]> {
    const response = await apiClient.get('/api/athens-sust/projects/', { params })
    return response.data
  }

  async getAccessState(): Promise<AthensAccessState> {
    const response = await apiClient.get('/api/athens-sust/me/access-state/')
    return response.data
  }

  async listEmployees(params?: Record<string, any>): Promise<AthensEmployeeUser[]> {
    const response = await apiClient.get('/api/athens-sust/users/', { params })
    return response.data
  }

  async createEmployee(payload: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/api/athens-sust/users/', payload)
    return response.data
  }

  async getUserProfile(): Promise<AthensUserProfile> {
    const response = await apiClient.get('/api/athens-sust/user-profiles/me/')
    return response.data
  }

  async updateUserProfile(payload: Record<string, any> | FormData): Promise<AthensUserProfile> {
    const response = await apiClient.patch('/api/athens-sust/user-profiles/me/', payload)
    return response.data
  }

  async submitUserProfile(): Promise<any> {
    const response = await apiClient.post('/api/athens-sust/user-profiles/submit/')
    return response.data
  }

  async listUserApprovals(params?: Record<string, any>): Promise<AthensUserProfile[]> {
    const response = await apiClient.get('/api/athens-sust/approvals/user-details/', { params })
    return response.data
  }

  async approveUserProfile(id: number): Promise<any> {
    const response = await apiClient.post(`/api/athens-sust/approvals/user-details/${id}/approve/`)
    return response.data
  }

  async rejectUserProfile(id: number, reason?: string): Promise<any> {
    const response = await apiClient.post(`/api/athens-sust/approvals/user-details/${id}/reject/`, { reason })
    return response.data
  }

  async requestUserProfileChanges(id: number, reason?: string): Promise<any> {
    const response = await apiClient.post(`/api/athens-sust/approvals/user-details/${id}/request-changes/`, { reason })
    return response.data
  }

  async getInductionStatus(): Promise<{ has_completed_induction: boolean }> {
    const response = await apiClient.get('/api/athens-sust/induction/')
    return response.data
  }

  async completeInduction(): Promise<any> {
    const response = await apiClient.post('/api/athens-sust/induction/complete/')
    return response.data
  }

  async createProject(payload: Partial<AthensSustProject>): Promise<AthensSustProject> {
    const response = await apiClient.post('/api/athens-sust/projects/', payload)
    return response.data
  }

  async updateProject(id: number, payload: Partial<AthensSustProject>): Promise<AthensSustProject> {
    const response = await apiClient.patch(`/api/athens-sust/projects/${id}/`, payload)
    return response.data
  }

  async deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/api/athens-sust/projects/${id}/`)
  }

  async listOrgMappings(params?: Record<string, any>): Promise<AthensOrgMapping[]> {
    const response = await apiClient.get('/api/athens-sust/org-mappings/', { params })
    return response.data
  }

  async listAdminUsers(params?: Record<string, any>): Promise<AthensAdminUser[]> {
    const response = await apiClient.get('/api/athens-sust/admin-users/', { params })
    return response.data
  }

  async inviteAdminUser(payload: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/api/athens-sust/admin-users/invite/', payload)
    return response.data
  }

  async resetAdminPassword(id: number): Promise<any> {
    const response = await apiClient.post(`/api/athens-sust/admin-users/${id}/reset-password/`)
    return response.data
  }

  async toggleAdminActive(id: number, active: boolean): Promise<any> {
    const endpoint = active ? 'activate' : 'deactivate'
    const response = await apiClient.post(`/api/athens-sust/admin-users/${id}/${endpoint}/`)
    return response.data
  }

  async getProjectModules(projectId?: number): Promise<ProjectModuleConfig[]> {
    const params = projectId ? { project: projectId } : {}
    const response = await apiClient.get('/api/athens-sust/project-modules/', { params })
    return response.data
  }

  async bulkUpdateProjectModules(projectId: number, updates: Array<Record<string, any>>): Promise<ProjectModuleConfig[]> {
    const response = await apiClient.post('/api/athens-sust/project-modules/bulk-update/', {
      project: projectId,
      updates
    })
    return response.data
  }

  async fetchAuditLogs(): Promise<AuditLogEntry[]> {
    const response = await apiClient.get('/api/athens-sust/audit-logs/')
    return response.data
  }

  async analyticsOverview(params?: Record<string, any>): Promise<AnalyticsOverview> {
    const response = await apiClient.get('/api/athens-sust/analytics/overview/', { params })
    return response.data
  }

  async analyticsPermitTrends(params?: Record<string, any>): Promise<AnalyticsSeriesResponse> {
    const response = await apiClient.get('/api/athens-sust/analytics/permit-trends/', { params })
    return response.data
  }

  async analyticsSafetyPerformance(params?: Record<string, any>): Promise<AnalyticsSeriesResponse> {
    const response = await apiClient.get('/api/athens-sust/analytics/safety-performance/', { params })
    return response.data
  }

  async analyticsDepartmentDistribution(params?: Record<string, any>): Promise<AnalyticsDepartmentDistribution> {
    const response = await apiClient.get('/api/athens-sust/analytics/department-distribution/', { params })
    return response.data
  }

  async analyticsPerformanceMetrics(params?: Record<string, any>): Promise<PerformanceMetrics> {
    const response = await apiClient.get('/api/athens-sust/analytics/performance-metrics/', { params })
    return response.data
  }

  async getParentOrgs(projectId: number): Promise<Array<{ id: number; org_name: string }>> {
    const response = await apiClient.get('/api/athens-sust/admin-users/parent-orgs/', {
      params: { project: projectId }
    })
    return response.data
  }
}

export const athensSustCompanyApi = new AthensSustCompanyApi()
