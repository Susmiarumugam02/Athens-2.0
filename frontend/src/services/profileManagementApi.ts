import { apiClient } from '../lib/api'

export interface ManagedUser {
  id: number
  username: string
  email: string
  name: string
  surname: string
  phone: string
  department: string
  designation: string
  company_type: string
  approval_status: 'pending' | 'approved' | 'rejected'
  is_first_login: boolean
  is_active: boolean
  created_at: string
}

const BASE = '/api/auth/projectadmin'

export const profileManagementApi = {
  createUser: (data: { username: string; email?: string; name?: string; password?: string }) =>
    apiClient.post(`${BASE}/users/`, data),

  listUsers: () =>
    apiClient.get<ManagedUser[]>(`${BASE}/users/`),

  listPendingApprovals: () =>
    apiClient.get<ManagedUser[]>(`${BASE}/approvals/`),

  approveUser: (userId: number) =>
    apiClient.post(`${BASE}/approvals/${userId}/approve/`, {}),

  rejectUser: (userId: number) =>
    apiClient.post(`${BASE}/approvals/${userId}/reject/`, {}),

  deleteUser: (userId: number) =>
    apiClient.delete(`${BASE}/users/${userId}/delete/`),

  resetUserPassword: (userId: number) =>
    apiClient.post(`${BASE}/users/${userId}/reset-password/`, {}),

  completeProfile: (data: {
    name: string
    surname?: string
    phone: string
    department: string
    designation: string
  }) => apiClient.post(`${BASE}/profile/complete/`, data),

  getMyStatus: () =>
    apiClient.get(`${BASE}/status/`),
}
