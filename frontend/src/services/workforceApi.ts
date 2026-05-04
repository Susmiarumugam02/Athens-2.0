import { apiClient } from '../lib/api'

export const workforceApi = {
  getProjects: () => apiClient.get('/api/workforce/projects/'),
  createProject: (data: any) => apiClient.post('/api/workforce/projects/', data),
  updateProject: (id: string, data: any) => apiClient.put(`/api/workforce/projects/${id}/`, data),
  deleteProject: (id: string) => apiClient.delete(`/api/workforce/projects/${id}/`),
  getProjectMembers: (id: string) => apiClient.get(`/api/workforce/projects/${id}/members/`),
  addProjectMember: (id: string, data: any) => apiClient.post(`/api/workforce/projects/${id}/members/`, data),
  
  getTasks: (projectId?: string) => apiClient.get('/api/workforce/tasks/', { params: { project_id: projectId } }),
  createTask: (data: any) => apiClient.post('/api/workforce/tasks/', data),
  updateTask: (id: string, data: any) => apiClient.put(`/api/workforce/tasks/${id}/`, data),
  moveTask: (id: string, data: any) => apiClient.patch(`/api/workforce/tasks/${id}/move/`, data),
  getTaskComments: (id: string) => apiClient.get(`/api/workforce/tasks/${id}/comments/`),
  addTaskComment: (id: string, data: any) => apiClient.post(`/api/workforce/tasks/${id}/comments/`, data),
  
  getCustomers: () => apiClient.get('/api/workforce/customers/'),
  createCustomer: (data: any) => apiClient.post('/api/workforce/customers/', data),
  
  // Attendance (self)
  getTodayAttendance: () => apiClient.get('/api/workforce/attendance/today/'),
  checkIn: (data: { date: string; check_in_time: string; latitude: number; longitude: number; status: string }) =>
    apiClient.post('/api/workforce/attendance/', data),
  checkOut: (id: number, data: { check_out_time: string; latitude: number; longitude: number }) =>
    apiClient.patch(`/api/workforce/attendance/${id}/checkout/`, data),

  getInvoices: () => apiClient.get('/api/workforce/invoices/'),
  createInvoice: (data: any) => apiClient.post('/api/workforce/invoices/', data),
  getPayments: (invoiceId: string) => apiClient.get(`/api/workforce/invoices/${invoiceId}/payments/`),
  createPayment: (invoiceId: string, data: any) => apiClient.post(`/api/workforce/invoices/${invoiceId}/payments/`, data),
}
