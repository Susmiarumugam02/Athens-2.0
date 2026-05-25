import { apiClient } from '../lib/api'

export const ergonApi = {
  // Daily Planner
  getDailyTasks: (date: string) => apiClient.get('/api/ergon/daily-planner/', { params: { date } }),
  createDailyTask: (data: any) => apiClient.post('/api/ergon/daily-planner/', data),
  updateDailyTask: (id: number, data: any) => apiClient.patch(`/api/ergon/daily-planner/${id}/`, data),
  deleteDailyTask: (id: number) => apiClient.delete(`/api/ergon/daily-planner/${id}/`),
  startTask: (id: number) => apiClient.post(`/api/ergon/daily-planner/${id}/start_task/`),
  pauseTask: (id: number) => apiClient.post(`/api/ergon/daily-planner/${id}/pause_task/`),
  resumeTask: (id: number) => apiClient.post(`/api/ergon/daily-planner/${id}/resume_task/`),
  completeTask: (id: number, data: any) => apiClient.post(`/api/ergon/daily-planner/${id}/complete_task/`, data),
  postponeTask: (id: number, data: any) => apiClient.post(`/api/ergon/daily-planner/${id}/postpone_task/`, data),
  rolloverTasks: () => apiClient.post('/api/ergon/daily-planner/rollover/'),
  getDailyTaskHistory: (id: number) => apiClient.get(`/api/ergon/daily-planner/${id}/history/`),
  getSLAHistory: (id: number) => apiClient.get(`/api/ergon/daily-planner/${id}/sla_history/`),

  // Tasks
  getTasks: (params?: any) => apiClient.get('/api/ergon/tasks/', { params }),
  createTask: (data: any) => apiClient.post('/api/ergon/tasks/', data),
  updateTask: (id: string | number, data: any) => apiClient.put(`/api/ergon/tasks/${id}/`, data),
  patchTask: (id: string | number, data: any) => apiClient.patch(`/api/ergon/tasks/${id}/`, data),
  deleteTask: (id: string | number) => apiClient.delete(`/api/ergon/tasks/${id}/`),
  updateProgress: (id: string, data: any) => apiClient.post(`/api/ergon/tasks/${id}/update_progress/`, data),
  getTaskHistory: (id: string) => apiClient.get(`/api/ergon/tasks/${id}/history/`),

  // Follow-ups
  getFollowups: (params?: any) => apiClient.get('/api/ergon/followups/', { params }),
  createFollowup: (data: any) => apiClient.post('/api/ergon/followups/', data),
  updateFollowup: (id: number, data: any) => apiClient.patch(`/api/ergon/followups/${id}/`, data),
  deleteFollowup: (id: number) => apiClient.delete(`/api/ergon/followups/${id}/`),
  completeFollowup: (id: string, data?: any) => apiClient.post(`/api/ergon/followups/${id}/complete/`, data || {}),
  cancelFollowup: (id: string, data: any) => apiClient.post(`/api/ergon/followups/${id}/cancel/`, data),
  rescheduleFollowup: (id: string, data: any) => apiClient.post(`/api/ergon/followups/${id}/reschedule/`, data),
  getFollowupReminders: () => apiClient.get('/api/ergon/followups/reminders/'),
  getFollowupHistory: (id: string) => apiClient.get(`/api/ergon/followups/${id}/history/`),

  // Projects
  getProjects: () => apiClient.get('/api/ergon/projects/'),
  createProject: (data: any) => apiClient.post('/api/ergon/projects/', data),

  // Departments & Categories
  getDepartments: (projectId?: string) => apiClient.get('/api/ergon/departments/', { params: { project_id: projectId } }),
  getTaskCategories: (departmentId?: string) => apiClient.get('/api/ergon/task-categories/', { params: { department_id: departmentId } }),

  // Contacts
  getContacts: () => apiClient.get('/api/ergon/contacts/'),
  createContact: (data: any) => apiClient.post('/api/ergon/contacts/', data),

  // Manpower & Machinery
  getManpower: (params?: any) => apiClient.get('/api/ergon/manpower/', { params }),
  createManpower: (data: any) => apiClient.post('/api/ergon/manpower/', data),
  updateManpower: (id: number, data: any) => apiClient.patch(`/api/ergon/manpower/${id}/`, data),
  deleteManpower: (id: number) => apiClient.delete(`/api/ergon/manpower/${id}/`),
  getMachinery: (params?: any) => apiClient.get('/api/ergon/machinery/', { params }),
  createMachinery: (data: any) => apiClient.post('/api/ergon/machinery/', data),
  updateMachinery: (id: number, data: any) => apiClient.patch(`/api/ergon/machinery/${id}/`, data),
  deleteMachinery: (id: number) => apiClient.delete(`/api/ergon/machinery/${id}/`),
  getResourceAllocations: (params?: any) => apiClient.get('/api/ergon/resource-allocations/', { params }),
  createResourceAllocation: (data: any) => apiClient.post('/api/ergon/resource-allocations/', data),
  updateResourceAllocation: (id: number, data: any) => apiClient.patch(`/api/ergon/resource-allocations/${id}/`, data),

  // Advances & Expenses
  getAdvances: (params?: any) => apiClient.get('/api/ergon/advances/', { params }),
  createAdvance: (data: any) => apiClient.post('/api/ergon/advances/', data),
  updateAdvance: (id: number, data: any) => apiClient.patch(`/api/ergon/advances/${id}/`, data),
  approveAdvance: (id: number) => apiClient.post(`/api/ergon/advances/${id}/approve/`),
  rejectAdvance: (id: number, reason: string) => apiClient.post(`/api/ergon/advances/${id}/reject/`, { reason }),
  payAdvance: (id: number, data?: any) => apiClient.post(`/api/ergon/advances/${id}/mark_paid/`, data || {}),
  escalateAdvance: (id: number, comments: string) => apiClient.post(`/api/ergon/advances/${id}/escalate/`, { comments }),
  deleteAdvance: (id: number) => apiClient.delete(`/api/ergon/advances/${id}/`),
  getExpenses: (params?: any) => apiClient.get('/api/ergon/expenses/', { params }),
  createExpense: (data: any) => apiClient.post('/api/ergon/expenses/', data),
  updateExpense: (id: number, data: any) => apiClient.patch(`/api/ergon/expenses/${id}/`, data),
  approveExpense: (id: number) => apiClient.post(`/api/ergon/expenses/${id}/approve/`),
  rejectExpense: (id: number, reason: string) => apiClient.post(`/api/ergon/expenses/${id}/reject/`, { reason }),
  reimburseExpense: (id: number, data?: any) => apiClient.post(`/api/ergon/expenses/${id}/reimburse/`, data || {}),
  escalateExpense: (id: number, comments: string) => apiClient.post(`/api/ergon/expenses/${id}/escalate/`, { comments }),
  deleteExpense: (id: number) => apiClient.delete(`/api/ergon/expenses/${id}/`),

  // Ledger
  getLedgerEntries: (params?: any) => apiClient.get('/api/ergon/ledger/', { params }),
  createLedgerEntry: (data: any) => apiClient.post('/api/ergon/ledger/', data),
  deleteLedgerEntry: (id: number) => apiClient.delete(`/api/ergon/ledger/${id}/`),

  // Customers & Invoices
  getCustomers: () => apiClient.get('/api/ergon/customers/'),
  getInvoices: () => apiClient.get('/api/ergon/invoices/'),
}
