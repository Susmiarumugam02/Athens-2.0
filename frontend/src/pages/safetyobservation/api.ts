import { apiClient } from '../../lib/api';

export interface AuditLog {
  id: number;
  user: string;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  details?: string;
  timestamp: string;
}

export const safetyObservationApi = {
  getAll: () => apiClient.get('/api/safety-observation/'),
  getById: (id: string) => apiClient.get(`/api/safety-observation/${id}/`),
  create: (data: any) => apiClient.post('/api/safety-observation/', data),
  update: (id: string, data: any) => apiClient.patch(`/api/safety-observation/${id}/`, data),
  delete: (id: string) => apiClient.delete(`/api/safety-observation/${id}/`),
  getProjectUsers: () => apiClient.get('/api/safety-observation/project-users/'),
  updateCommitment: (id: string, data: any) => apiClient.post(`/api/safety-observation/${id}/update_commitment/`, data),
  uploadFixedPhotos: (id: string, formData: FormData) => apiClient.post(`/api/safety-observation/${id}/upload_fixed_photos/`, formData),
  approveObservation: (id: string, data: any) => apiClient.post(`/api/safety-observation/${id}/approve_observation/`, data),
  
  // Attachments
  uploadAttachment: (observationID: string, file: File, fileType: 'before' | 'after') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    return apiClient.post(`/api/safety-observation/${observationID}/upload-attachment/`, formData);
  },
  listAttachments: (observationID: string) => 
    apiClient.get(`/api/safety-observation/${observationID}/attachments/`),
  deleteAttachment: (observationID: string, attachmentId: number) => 
    apiClient.delete(`/api/safety-observation/${observationID}/attachments/${attachmentId}/`),
  
  // Status workflow
  transition: (observationID: string, toStatus: 'draft' | 'submitted' | 'closed') => 
    apiClient.post(`/api/safety-observation/${observationID}/transition/`, { to_status: toStatus }),
  
  // Audit logs
  getAuditLogs: (observationID: string, limit = 50, offset = 0) => 
    apiClient.get(`/api/safety-observation/${observationID}/audit-logs/?limit=${limit}&offset=${offset}`),
};
