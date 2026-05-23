// v2
import { apiClient } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttendanceDashboard {
  date: string
  total_admins: number
  present: number
  absent: number
  late: number
  half_day: number
  working: number
  checked_out: number
}

export interface AdminAttendanceRecord {
  id: number
  admin: number
  admin_email: string
  admin_name: string
  admin_role: string
  organization: string
  project_name: string
  attendance_date: string
  check_in_time: string | null
  check_out_time: string | null
  total_hours: string
  status: 'present' | 'absent' | 'late' | 'half_day' | 'working' | 'checked_out'
  check_in_location: { lat: number; lng: number } | null
  check_out_location: { lat: number; lng: number } | null
  is_manual: boolean
  correction_note: string
  corrected_by: number | null
  corrected_at: string | null
}

export interface EmployeeUnderAdmin {
  id: number
  employee_code: string
  full_name: string
  department: string
  designation: string
  check_in_time: string | null
  check_out_time: string | null
  status: string
  total_hours: string
}

export interface UserAttendanceRecord {
  id: number
  user_id: number
  user_email: string
  full_name: string
  department: string
  designation: string
  check_in_time: string | null
  check_out_time: string | null
  status: string
  total_hours: string
}

export interface LeaveRequest {
  id: number
  employee_id: number
  employee_name: string
  employee_email: string
  employee_role: string
  leave_type_name: string
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approver_name: string | null
  approved_at: string | null
  rejection_reason: string
  can_approve: boolean
}

export interface PayrollEntry {
  id: number
  employee_id: number
  employee_name: string
  employee_code: string
  department_name: string
  cycle_name: string
  gross_salary: string
  total_deductions: string
  net_salary: string
  payment_status: 'pending' | 'processed' | 'paid'
  payment_date: string | null
  payment_mode: string
}

export interface PendingApprovalsSummary {
  pending_leaves: number
  pending_payroll: number
  pending_attendance: number
  total_pending: number
}

export interface ManualAttendancePayload {
  admin_id: number
  attendance_date: string
  check_in_time?: string
  check_out_time?: string
  status?: string
  correction_note?: string
}

export interface CorrectionPayload {
  check_in_time?: string
  check_out_time?: string
  status?: string
  correction_note?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE = '/api/admin-attendance'

const EMPTY_DASHBOARD: AttendanceDashboard = {
  date: new Date().toISOString().slice(0, 10),
  total_admins: 0,
  present: 0,
  absent: 0,
  late: 0,
  half_day: 0,
  working: 0,
  checked_out: 0,
}

function normalizeArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).results)) {
    return (data as Record<string, unknown>).results as T[]
  }
  return []
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const adminAttendanceApi = {
  // Admin Attendance
  getDashboard: async (date?: string): Promise<AttendanceDashboard> => {
    const r = await apiClient.get(`${BASE}/dashboard/`, { params: date ? { date } : undefined })
    return r.data && typeof r.data === 'object' ? r.data : EMPTY_DASHBOARD
  },

  getList: async (params: {
    date?: string
    status?: string
    admin_type?: string
    search?: string
  }): Promise<AdminAttendanceRecord[]> => {
    const r = await apiClient.get(`${BASE}/`, { params })
    return normalizeArray<AdminAttendanceRecord>(r.data)
  },

  markManual: async (payload: ManualAttendancePayload): Promise<AdminAttendanceRecord> => {
    const r = await apiClient.post(`${BASE}/manual/`, payload)
    return r.data
  },

  correct: async (id: number, payload: CorrectionPayload): Promise<AdminAttendanceRecord> => {
    const r = await apiClient.patch(`${BASE}/${id}/correct/`, payload)
    return r.data
  },

  forceCheckout: async (id: number, note?: string): Promise<AdminAttendanceRecord> => {
    const r = await apiClient.post(`${BASE}/${id}/force-checkout/`, { correction_note: note })
    return r.data
  },

  getExportUrl: (dateFrom: string, dateTo: string): string =>
    `${BASE}/export/?date_from=${dateFrom}&date_to=${dateTo}`,

  // Employees under admin
  getEmployeesUnderAdmin: async (adminId: number, date?: string): Promise<EmployeeUnderAdmin[]> => {
    const r = await apiClient.get(`${BASE}/admins/${adminId}/employees/`, {
      params: date ? { date } : undefined,
    })
    return normalizeArray<EmployeeUnderAdmin>(r.data)
  },

  // User attendance
  getUserAttendance: async (date?: string): Promise<UserAttendanceRecord[]> => {
    const r = await apiClient.get(`${BASE}/user-attendance/`, {
      params: date ? { date } : undefined,
    })
    return (r.data?.records as UserAttendanceRecord[]) || []
  },

  // Leave requests
  getLeaveRequests: async (status?: string): Promise<LeaveRequest[]> => {
    const r = await apiClient.get(`${BASE}/leave-requests/`, {
      params: status ? { status } : undefined,
    })
    const data = r.data?.data || r.data
    return normalizeArray<LeaveRequest>(data)
  },

  approveLeave: async (id: number): Promise<void> => {
    await apiClient.post(`${BASE}/leave-requests/${id}/approve/`)
  },

  rejectLeave: async (id: number, rejection_reason: string): Promise<void> => {
    await apiClient.post(`${BASE}/leave-requests/${id}/reject/`, { rejection_reason })
  },

  // Payroll
  getPayrollEntries: async (payment_status?: string): Promise<PayrollEntry[]> => {
    const r = await apiClient.get(`${BASE}/payroll-entries/`, {
      params: payment_status ? { payment_status } : undefined,
    })
    const data = r.data?.data || r.data
    return normalizeArray<PayrollEntry>(data)
  },

  approvePayroll: async (id: number, payment_mode = 'bank'): Promise<void> => {
    await apiClient.post(`${BASE}/payroll-entries/${id}/approve/`, { payment_mode })
  },

  // Pending approvals summary
  getPendingApprovals: async (): Promise<PendingApprovalsSummary> => {
    const r = await apiClient.get(`${BASE}/pending-approvals/`)
    return r.data
  },
}
