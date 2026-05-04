import { apiClient } from '../../lib/api';
import * as Types from './types';

const API_URL = '/api/ptw';

// Permit Types
export const getPermitTypes = () => 
  apiClient.get<Types.PermitType[]>(`${API_URL}/permit-types/`);

export const getPermitType = (id: number) => 
  apiClient.get<Types.PermitType>(`${API_URL}/permit-types/${id}/`);

export const getPermitTypeResolvedTemplate = (id: number, projectId?: number) => 
  apiClient.get<Types.ResolvedPermitTypeTemplateResponse>(
    `${API_URL}/permit-types/${id}/resolved-template/`,
    projectId ? { params: { project: projectId } } : undefined
  );

// Permits
export const getPermits = (params?: any) => 
  apiClient.get(`${API_URL}/permits/`, { params });

// Paginated response type
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const getPermitsPaginated = (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  project?: number;
  permit_type?: number;
  permit_category?: string;
  risk_level?: string;
  priority?: string;
  created_by?: number;
  date_from?: string;
  date_to?: string;
  planned_start_from?: string;
  planned_start_to?: string;
  planned_end_from?: string;
  planned_end_to?: string;
  ordering?: string;
}) => apiClient.get<PaginatedResponse<Types.Permit>>(`${API_URL}/permits/`, { params });

export const getPermit = (id: number) => 
  apiClient.get<Types.Permit>(`${API_URL}/permits/${id}/`);

export const getPermitTbt = (id: number) =>
  apiClient.get<Types.PermitToolboxTalkResponse>(`${API_URL}/permits/${id}/tbt/`);

export const updatePermitTbt = (id: number, data: FormData | Record<string, any>) => {
  if (data instanceof FormData) {
    return apiClient.post<Types.PermitToolboxTalkResponse>(
      `${API_URL}/permits/${id}/update_tbt/`,
      data,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  }
  return apiClient.post<Types.PermitToolboxTalkResponse>(`${API_URL}/permits/${id}/update_tbt/`, data);
};

export const acknowledgePermitTbt = (id: number, data: { permit_worker_id: number; acknowledged?: boolean }) =>
  apiClient.post<Types.PermitToolboxTalkAttendance>(
    `${API_URL}/permits/${id}/tbt_ack/`,
    data
  );

export const generatePermitQrCode = (id: number) =>
  apiClient.get<{ qr_image: string; qr_data: string; mobile_url: string }>(
    `${API_URL}/permits/${id}/generate_qr_code/`
  );

export const addPermitSignature = (id: number, data: { 
  signature_type: string;
  signature_payload?: {
    type: 'stroke_v1';
    strokes: Array<{
      points: Array<{ x: number; y: number }>;
      color?: string;
      width?: number;
    }>;
    width?: number;
    height?: number;
  };
  payload_version?: number;
}) => {
  // Generate mock stroke data if not provided (for template-based signatures)
  const payload = data.signature_payload || {
    type: 'stroke_v1' as const,
    strokes: [
      {
        points: [
          { x: 10, y: 50 },
          { x: 50, y: 30 },
          { x: 90, y: 50 },
          { x: 130, y: 30 },
          { x: 170, y: 50 }
        ],
        color: '#000000',
        width: 2
      }
    ],
    width: 200,
    height: 80
  };
  
  return apiClient.post(`${API_URL}/permits/${id}/add_signature/`, {
    signature_type: data.signature_type,
    signature_payload: payload,
    payload_version: data.payload_version || 1
  });
};

export const createPermit = (data: Partial<Types.Permit>) =>
  apiClient.post<Types.Permit>(`${API_URL}/permits/`, data);

export const updatePermit = (id: number, data: Partial<Types.Permit>) => 
  apiClient.put<Types.Permit>(`${API_URL}/permits/${id}/`, data);

export const deletePermit = (id: number) => 
  apiClient.delete(`${API_URL}/permits/${id}/`);

// Permit Actions
export const approvePermit = (id: number, comments?: string) => 
  apiClient.post(`${API_URL}/permits/${id}/approve/`, { comments });

export const rejectPermit = (id: number, comments: string) => 
  apiClient.post(`${API_URL}/permits/${id}/reject/`, { comments });

// Work lifecycle actions - use update_status endpoint
export const startWork = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'active' });

export const completeWork = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'completed' });

export const closePermit = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'completed' });

export const suspendPermit = (id: number, reason: string) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'suspended', comments: reason });

// KPI Dashboard
export const getKPIs = (params?: {
  project?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  permit_type?: number;
  risk_level?: string;
}) => apiClient.get(`${API_URL}/permits/kpis/`, { params });

export const resumePermit = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'active' });

export const cancelPermit = (id: number, reason: string) => 
  apiClient.post(`${API_URL}/permits/${id}/update_status/`, { status: 'cancelled', comments: reason });

// Submit actions - use workflow endpoints
export const submitForApproval = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/workflow/initiate/`);

export const submitForVerification = (id: number) => 
  apiClient.post(`${API_URL}/permits/${id}/workflow/initiate/`);

export const verifyPermit = (id: number, comments: string = '') => 
  apiClient.post(`${API_URL}/permits/${id}/verify/`, { comments });

export const rejectVerification = (id: number, comments: string) => 
  apiClient.post(`${API_URL}/permits/${id}/workflow/verify/`, { action: 'reject', comments });

// Permit Extensions
export const requestExtension = (data: {
  permit: number;
  new_end_time: string;
  reason: string;
}) => apiClient.post(`${API_URL}/extensions/`, data);

export const approveExtension = (id: number, comments?: string) => 
  apiClient.post(`${API_URL}/extensions/${id}/approve/`, { comments });

export const rejectExtension = (id: number, comments: string) => 
  apiClient.post(`${API_URL}/extensions/${id}/reject/`, { comments });

// Workers
export const assignWorker = (permitId: number, workerId: number) => 
  apiClient.post(`${API_URL}/permits/${permitId}/workers/`, { worker: workerId });

export const removeWorker = (permitId: number, workerId: number) => 
  apiClient.delete(`${API_URL}/permits/${permitId}/workers/${workerId}/`);

// Permit Notifications
export const sendPermitNotification = (_userId: string | number, _permitId: number, _action: string) => {
  // Use the existing notification context to send notifications
  // This will be implemented in the components
  return true;
};

// Workflow API
export const initiateWorkflow = (permitId: number) => 
  apiClient.post(`${API_URL}/permits/${permitId}/workflow/initiate/`);

export const assignVerifier = (permitId: number, data: { verifier_id: number }) => 
  apiClient.post(`${API_URL}/permits/${permitId}/workflow/assign-verifier/`, data);

export const verifyPermitWorkflow = (permitId: number, data: {
  action: 'approve' | 'reject';
  comments?: string;
  approver_id?: number;
}) => apiClient.post(`${API_URL}/permits/${permitId}/workflow/verify/`, data);

export const assignApprover = (permitId: number, data: { approver_id: number }) => 
  apiClient.post(`${API_URL}/permits/${permitId}/workflow/assign-approver/`, data);

export const approvePermitWorkflow = (permitId: number, data: {
  action: 'approve' | 'reject';
  comments?: string;
}) => apiClient.post(`${API_URL}/permits/${permitId}/workflow/approve/`, data);

// API Functions
export const searchUsers = (params?: {
  q?: string;
  user_type?: string;
  grade?: string;
  project?: number;
}) => apiClient.get(`${API_URL}/team-members/get_users_by_type_and_grade/`, { params });

export const getAvailableVerifiers = (params?: {
  user_type?: string;
  grade?: string;
}) => apiClient.get(`${API_URL}/workflow/verifiers/`, { params });

export const getAvailableApprovers = (params?: {
  user_type?: string;
  grade?: string;
}) => apiClient.get(`${API_URL}/workflow/approvers/`, { params });

export const getWorkflowStatus = (permitId: number) => 
  apiClient.get(`${API_URL}/permits/${permitId}/workflow/status/`);

export const getMyWorkflowTasks = () => 
  apiClient.get(`${API_URL}/workflow/my-tasks/`);

export const resubmitPermit = (permitId: number) => 
  apiClient.post(`${API_URL}/permits/${permitId}/workflow/resubmit/`);

// Reports API
export const getPermitReports = (params: {
  report_type: string;
  start_date?: string;
  end_date?: string;
}) => apiClient.get(`${API_URL}/reports/`, { params });

export const exportPermitReport = (params: {
  report_type: string;
  start_date?: string;
  end_date?: string;
  format: 'pdf' | 'excel';
}) => apiClient.get(`${API_URL}/reports/export/`, {
  params,
  responseType: 'blob' // Important for file downloads
});

// Closeout Checklist API
export const getPermitCloseout = (permitId: number) => 
  apiClient.get(`${API_URL}/permits/${permitId}/closeout/`);

export const updatePermitCloseout = (permitId: number, data: {
  checklist?: Record<string, { done: boolean; comments?: string }>;
  remarks?: string;
}) => apiClient.post(`${API_URL}/permits/${permitId}/update_closeout/`, data);

export const completePermitCloseout = (permitId: number) => 
  apiClient.post(`${API_URL}/permits/${permitId}/complete_closeout/`);

// Isolation Points API
export const listIsolationPoints = (params?: {
  project?: number;
  site?: string;
  asset_tag?: string;
  point_type?: string;
  energy_type?: string;
  search?: string;
}) => apiClient.get(`${API_URL}/isolation-points/`, { params });

export const createIsolationPoint = (data: {
  project?: number;
  point_code: string;
  point_type: string;
  energy_type: string;
  location?: string;
  description?: string;
  isolation_method?: string;
  verification_method?: string;
  requires_lock?: boolean;
  default_lock_count?: number;
  ppe_required?: string[];
}) => apiClient.post(`${API_URL}/isolation-points/`, data);

export const getPermitIsolation = (permitId: number) => 
  apiClient.get(`${API_URL}/permits/${permitId}/isolation/`);

export const assignPermitIsolation = (permitId: number, data: {
  point_id?: number;
  custom_point_name?: string;
  custom_point_details?: string;
  required?: boolean;
  lock_count?: number;
  order?: number;
} | Array<{
  point_id?: number;
  custom_point_name?: string;
  custom_point_details?: string;
  required?: boolean;
  lock_count?: number;
  order?: number;
}>) => apiClient.post(`${API_URL}/permits/${permitId}/assign_isolation/`, data);

export const updatePermitIsolation = (permitId: number, data: {
  point_id: number;
  action: 'isolate' | 'verify' | 'deisolate';
  lock_applied?: boolean;
  lock_count?: number;
  lock_ids?: string[];
  verification_notes?: string;
  deisolated_notes?: string;
}) => apiClient.post(`${API_URL}/permits/${permitId}/update_isolation/`, data);

// Export Functions
export const exportPermitPDF = (permitId: number) => 
  apiClient.get(`${API_URL}/permits/${permitId}/export_pdf/`, { responseType: 'blob' });

export const exportPermitsExcel = (params?: {
  detailed?: boolean;
  search?: string;
  status?: string;
  project?: number;
  date_from?: string;
  date_to?: string;
  [key: string]: any;
}) => apiClient.get(`${API_URL}/permits/export_excel/`, { params, responseType: 'blob' });

export const bulkExportPDF = (data: {
  permit_ids?: number[];
  use_filters?: boolean;
}) => apiClient.post(`${API_URL}/permits/bulk_export_pdf/`, data, { responseType: 'blob' });

export const bulkExportExcel = (data: {
  permit_ids?: number[];
  use_filters?: boolean;
  detailed?: boolean;
}) => apiClient.post(`${API_URL}/permits/bulk_export_excel/`, data, { responseType: 'blob' });

// Readiness API (PR15)
export interface PermitReadiness {
  permit_id: number;
  permit_number: string;
  status: string;
  requires: {
    gas_testing: boolean;
    structured_isolation: boolean;
    closeout: boolean;
    deisolation: boolean;
    signatures: boolean;
  };
  readiness: {
    can_verify: boolean;
    can_approve: boolean;
    can_activate: boolean;
    can_complete: boolean;
  };
  missing: {
    approve: string[];
    activate: string[];
    complete: string[];
  };
  details: {
    gas: {
      required: boolean;
      safe?: boolean;
      latest?: any;
    };
    isolation: {
      required: boolean;
      required_points?: number;
      verified_required?: number;
      pending_required?: number;
    };
    ppe: {
      required_items: string[];
      missing_items: string[];
    };
    checklist: {
      required: string[];
      missing: string[];
    };
    closeout: {
      template_exists: boolean;
      is_complete: boolean | null;
      missing_items: string[];
    };
    signatures: {
      requestor: {
        required: boolean;
        present: boolean;
        signed_by?: string;
        signed_at?: string;
        required_user?: string;
      };
      verifier: {
        required: boolean;
        present: boolean;
        signed_by?: string;
        signed_at?: string;
        required_user?: string;
      };
      approver: {
        required: boolean;
        present: boolean;
        signed_by?: string;
        signed_at?: string;
        required_user?: string;
      };
    };
  };
}

export const getPermitReadiness = (permitId: number) => 
  apiClient.get<PermitReadiness>(`${API_URL}/permits/${permitId}/readiness/`);

// Reports API (PR16)
export const getReportsSummary = (params?: {
  project?: number;
  date_from?: string;
  date_to?: string;
  permit_type?: number;
}) => apiClient.get(`${API_URL}/permits/reports_summary/`, { params });

export const getReportsExceptions = (params?: {
  project?: number;
  date_from?: string;
  date_to?: string;
  permit_type?: number;
}) => apiClient.get(`${API_URL}/permits/reports_exceptions/`, { params });


