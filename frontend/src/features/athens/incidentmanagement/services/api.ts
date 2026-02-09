import api from '../../../common/utils/axiosetup';
import {
  Incident,
  IncidentListItem,
  IncidentAttachment,
  
  IncidentAuditLog,
  IncidentNotification,
  IncidentFormData,
  
 
  IncidentFilters,
 

  PaginatedResponse,
  IncidentDashboardStats,
  // Commercial grade imports
  IncidentCategory,
  RiskAssessmentTemplate,
  IncidentMetrics,
  IncidentWorkflow,
  IncidentCostCenter,
  IncidentLearning,
  IncidentAnalytics,
  RiskMatrixData,
  EnhancedIncidentDashboardStats,
  UserPermissions,
  // 8D Methodology imports
  EightDProcess,
  EightDDiscipline,
  EightDTeam,
  EightDContainmentAction,
  EightDRootCause,
  EightDCorrectiveAction,
  EightDPreventionAction,
} from '../types';

// Use the shared API client with proper authentication and interceptors
const apiClient = api;
const API_BASE_PATH = '/api/v1/incidentmanagement';

// Incident Management API
export const incidentApi = {
  // Get all incidents with filtering and pagination
  getIncidents: async (filters?: IncidentFilters, page = 1, pageSize = 20): Promise<PaginatedResponse<IncidentListItem>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    const response = await apiClient.get(`${API_BASE_PATH}/incidents/?${params.toString()}`);
    return response.data;
  },

  // Get single incident by ID
  getIncident: async (id: string): Promise<Incident> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/${id}/`);
    return response.data;
  },

  // Create new incident
  createIncident: async (data: IncidentFormData): Promise<Incident> => {
    const formData = new FormData();
    
    // Add text fields
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'attachments' && value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Add file attachments with proper naming
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }
    
    const response = await apiClient.post(`${API_BASE_PATH}/incidents/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update incident
  updateIncident: async (id: string, data: Partial<IncidentFormData>): Promise<Incident> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/incidents/${id}/`, data);
    return response.data;
  },

  // Delete incident
  deleteIncident: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/incidents/${id}/`);
  },



  // Close incident
  closeIncident: async (id: string, closureNotes?: string): Promise<Incident> => {
    const response = await apiClient.post(`${API_BASE_PATH}/incidents/${id}/close_incident/`, {
      closure_notes: closureNotes || '',
    });
    return response.data;
  },

  // Update incident status
  updateStatus: async (incidentId: string, status: string, notes?: string): Promise<{
    message: string;
    incident_id: string;
    old_status: string;
    new_status: string;
  }> => {
    const response = await apiClient.post(`${API_BASE_PATH}/incidents/${incidentId}/update_status/`, {
      status,
      notes: notes || ''
    });
    return response.data;
  },

  // Get dashboard statistics
  getDashboardStats: async (): Promise<IncidentDashboardStats> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/dashboard_stats/`);
    return response.data;
  },

  // === COMMERCIAL GRADE ENHANCEMENTS ===

  // Get enhanced analytics dashboard
  getAnalytics: async (): Promise<IncidentAnalytics> => {
    const response = await apiClient.get(`${API_BASE_PATH}/analytics/dashboard/`);
    return response.data;
  },

  // Get risk matrix data
  getRiskMatrix: async (): Promise<RiskMatrixData> => {
    const response = await apiClient.get(`${API_BASE_PATH}/analytics/risk-matrix/`);
    return response.data;
  },

  // Get enhanced dashboard with commercial metrics
  getEnhancedDashboard: async (): Promise<EnhancedIncidentDashboardStats> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/enhanced_dashboard/`);
    return response.data;
  },

  // Get user permissions
  getUserPermissions: async (): Promise<UserPermissions> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/user_permissions/`);
    return response.data;
  },

  // Export incidents with enhanced data
  exportIncidentsEnhanced: async (format: 'pdf' | 'excel' | 'csv', filters?: IncidentFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('format', format);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`${API_BASE_PATH}/export/incidents/?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Get nearby incidents for mobile
  getNearbyIncidents: async (latitude: number, longitude: number, radiusKm: number = 5): Promise<IncidentListItem[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/mobile/incidents/nearby/`, {
      params: { latitude, longitude, radius_km: radiusKm }
    });
    return response.data.incidents;
  },

  // Quick mobile incident report
  quickMobileReport: async (data: {
    title: string;
    incident_type: string;
    severity_level: string;
    location_gps?: { lat: number; lng: number };
    photos?: string[];
    voice_note?: string;
    offline_timestamp?: string;
  }): Promise<Incident> => {
    const response = await apiClient.post(`${API_BASE_PATH}/mobile/incidents/quick-report/`, data);
    return response.data;
  },
};

// Incident Attachments API
export const attachmentApi = {
  // Get attachments for an incident
  getAttachments: async (incidentId: string): Promise<IncidentAttachment[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/attachments/?incident=${incidentId}`);
    return response.data.results || response.data;
  },

  // Upload attachment
  uploadAttachment: async (incidentId: string, file: File, description?: string): Promise<IncidentAttachment> => {
    const formData = new FormData();
    formData.append('incident', incidentId);
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    const response = await apiClient.post(`${API_BASE_PATH}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete attachment
  deleteAttachment: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/attachments/${id}/`);
  },
};

// Investigation API removed - using 8D methodology only

// CAPA API removed - using 8D methodology only

// Export utilities
export const exportApi = {
  // Export incidents to PDF/Excel
  exportIncidents: async (format: 'pdf' | 'excel', filters?: IncidentFilters): Promise<Blob> => {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// === COMMERCIAL GRADE API SERVICES ===

// Risk Assessment API
export const riskAssessmentApi = {
  // Get risk assessment templates
  getTemplates: async (): Promise<RiskAssessmentTemplate[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/risk-templates/`);
    return response.data.results || response.data;
  },

  // Create risk assessment template
  createTemplate: async (data: Omit<RiskAssessmentTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<RiskAssessmentTemplate> => {
    const response = await apiClient.post(`${API_BASE_PATH}/risk-templates/`, data);
    return response.data;
  },

  // Update risk assessment template
  updateTemplate: async (id: string, data: Partial<RiskAssessmentTemplate>): Promise<RiskAssessmentTemplate> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/risk-templates/${id}/`, data);
    return response.data;
  },

  // Delete risk assessment template
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/risk-templates/${id}/`);
  },
};

// Incident Categories API
export const categoryApi = {
  // Get incident categories
  getCategories: async (): Promise<IncidentCategory[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/categories/`);
    return response.data.results || response.data;
  },

  // Create incident category
  createCategory: async (data: Omit<IncidentCategory, 'id' | 'created_at' | 'updated_at'>): Promise<IncidentCategory> => {
    const response = await apiClient.post(`${API_BASE_PATH}/categories/`, data);
    return response.data;
  },

  // Update incident category
  updateCategory: async (id: string, data: Partial<IncidentCategory>): Promise<IncidentCategory> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/categories/${id}/`, data);
    return response.data;
  },

  // Delete incident category
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/categories/${id}/`);
  },
};

// Incident Metrics API
export const metricsApi = {
  // Get incident metrics
  getMetrics: async (incidentId: string): Promise<IncidentMetrics> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/${incidentId}/metrics/`);
    return response.data;
  },

  // Update incident metrics
  updateMetrics: async (incidentId: string, data: Partial<IncidentMetrics>): Promise<IncidentMetrics> => {
    const response = await apiClient.patch(`/incidents/${incidentId}/metrics/`, data);
    return response.data;
  },

  // Calculate metrics for incident
  calculateMetrics: async (incidentId: string): Promise<IncidentMetrics> => {
    const response = await apiClient.post(`${API_BASE_PATH}/incidents/${incidentId}/calculate_metrics/`);
    return response.data;
  },
};

// Workflow Management API
export const workflowApi = {
  // Get workflows
  getWorkflows: async (): Promise<IncidentWorkflow[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/workflows/`);
    return response.data.results || response.data;
  },

  // Create workflow
  createWorkflow: async (data: Omit<IncidentWorkflow, 'id' | 'created_by' | 'created_at' | 'updated_at'>): Promise<IncidentWorkflow> => {
    const response = await apiClient.post(`${API_BASE_PATH}/workflows/`, data);
    return response.data;
  },

  // Update workflow
  updateWorkflow: async (id: string, data: Partial<IncidentWorkflow>): Promise<IncidentWorkflow> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/workflows/${id}/`, data);
    return response.data;
  },

  // Delete workflow
  deleteWorkflow: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/workflows/${id}/`);
  },

  // Get industry-specific configuration
  getIndustryConfig: async (industryType: string): Promise<any> => {
    const response = await apiClient.get(`${API_BASE_PATH}/configurations/industry/${industryType}/`);
    return response.data;
  },
};

// Cost Management API
export const costApi = {
  // Get cost centers for incident
  getCostCenters: async (incidentId: string): Promise<IncidentCostCenter[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/${incidentId}/costs/`);
    return response.data;
  },

  // Add cost entry
  addCostEntry: async (incidentId: string, data: any): Promise<IncidentCostCenter> => {
    const costData = {
      incident: incidentId,
      cost_type: data.category,
      description: data.description,
      estimated_amount: data.estimated_amount,
      actual_amount: data.actual_amount,
      budget_code: data.budget_code,
      department_charged: data.department_charged,
      requires_approval: data.requires_approval || false
    };
    const response = await apiClient.post(`${API_BASE_PATH}/incidents/${incidentId}/costs/`, costData);
    return response.data;
  },

  // Update cost entry
  updateCostEntry: async (id: string, data: Partial<IncidentCostCenter>): Promise<IncidentCostCenter> => {
    const response = await apiClient.patch(`/cost-centers/${id}/`, data);
    return response.data;
  },

  // Approve cost entry
  approveCostEntry: async (id: string): Promise<IncidentCostCenter> => {
    const response = await apiClient.post(`${API_BASE_PATH}/cost-centers/${id}/approve/`);
    return response.data;
  },

  // Delete cost entry
  deleteCostEntry: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/cost-centers/${id}/`);
  },

  // Get cost breakdown for incident
  getCostBreakdown: async (incidentId: string): Promise<{
    total_estimated: number;
    total_actual: number;
    cost_breakdown: Array<{
      cost_type: string;
      estimated_amount: number;
      actual_amount: number;
      status: string;
    }>;
  }> => {
    const response = await apiClient.get(`${API_BASE_PATH}/incidents/${incidentId}/cost-breakdown/`);
    return response.data;
  },
};

// Knowledge Management API
export const learningApi = {
  // Get lessons learned for incident
  getLearning: async (incidentId: string): Promise<IncidentLearning | null> => {
    try {
      const response = await apiClient.get(`${API_BASE_PATH}/incidents/${incidentId}/learning/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.detail === "No lessons learned found") {
        return null;
      }
      throw error;
    }
  },

  // Create lessons learned
  createLearning: async (incidentId: string, data: any): Promise<IncidentLearning> => {
    const learningData = {
      ...data,
      incident: incidentId
    };
    const response = await apiClient.post(`${API_BASE_PATH}/learnings/`, learningData);
    return response.data;
  },

  // Update lessons learned
  updateLearning: async (id: string, data: Partial<IncidentLearning>): Promise<IncidentLearning> => {
    const response = await apiClient.patch(`/learnings/${id}/`, data);
    return response.data;
  },

  // Delete lessons learned
  deleteLearning: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/learnings/${id}/`);
  },

  // Get all lessons learned
  getAllLearnings: async (filters?: { applicable_to?: string; incident_type?: string }): Promise<IncidentLearning[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const response = await apiClient.get(`${API_BASE_PATH}/learnings/?${params.toString()}`);
    return response.data.results || response.data;
  },
};

// === 8D METHODOLOGY API SERVICES ===

// 8D Process API
export const eightDApi = {
  // Get all 8D processes
  getProcesses: async (filters?: { status?: string; current_discipline?: number }): Promise<EightDProcess[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await apiClient.get(`${API_BASE_PATH}/8d-processes/?${params.toString()}`);
    return response.data.results || response.data;
  },

  // Get single 8D process
  getProcess: async (id: string): Promise<EightDProcess> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-processes/${id}/`);
    return response.data;
  },

  // Get 8D process by incident ID
  getProcessByIncident: async (incidentId: string): Promise<EightDProcess | null> => {
    try {
      const response = await apiClient.get(`${API_BASE_PATH}/8d-processes/?incident=${incidentId}`);
      const processes = response.data.results || response.data;
      return processes.length > 0 ? processes[0] : null;
    } catch (error) {
      return null;
    }
  },

  // Create 8D process
  createProcess: async (data: {
    incident: string;
    problem_statement: string;
    champion: string;
    target_completion_date?: string;
  }): Promise<EightDProcess> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-processes/`, data);
    return response.data;
  },



  // Update 8D process
  updateProcess: async (id: string, data: Partial<EightDProcess>): Promise<EightDProcess> => {
    const response = await apiClient.patch(`/8d-processes/${id}/`, data);
    return response.data;
  },

  // Start discipline
  startDiscipline: async (processId: string, disciplineNumber: number): Promise<EightDDiscipline> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-processes/${processId}/start_discipline/`, {
      discipline_number: disciplineNumber
    });
    return response.data;
  },

  // Complete discipline
  completeDiscipline: async (processId: string, disciplineNumber: number): Promise<EightDDiscipline> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-processes/${processId}/complete_discipline/`, {
      discipline_number: disciplineNumber
    });
    return response.data;
  },

  // Get overdue processes
  getOverdueProcesses: async (): Promise<EightDProcess[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-processes/overdue/`);
    return response.data;
  },

  // Get analytics
  getAnalytics: async (): Promise<any> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-processes/analytics/`);
    return response.data;
  },
};

// 8D Team API
export const eightDTeamApi = {
  // Get team members for a process
  getTeamMembers: async (processId: string): Promise<EightDTeam[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-teams/?eight_d_process=${processId}`);
    return response.data.results || response.data;
  },

  // Add team member
  addTeamMember: async (data: {
    eight_d_process: string;
    user: string;
    role: string;
    expertise_area?: string;
    responsibilities?: string;
  }): Promise<EightDTeam> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-teams/`, data);
    return response.data;
  },

  // Update team member
  updateTeamMember: async (id: string, data: Partial<EightDTeam>): Promise<EightDTeam> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/8d-teams/${id}/`, data);
    return response.data;
  },

  // Remove team member
  removeTeamMember: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/8d-teams/${id}/`);
  },

  // Recognize team member (D8)
  recognizeTeamMember: async (id: string, recognitionNotes: string): Promise<EightDTeam> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-teams/${id}/recognize/`, {
      recognition_notes: recognitionNotes
    });
    return response.data;
  },
};

// 8D Containment Actions API
export const eightDContainmentApi = {
  // Get containment actions for a process
  getContainmentActions: async (processId: string): Promise<EightDContainmentAction[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-containment-actions/?eight_d_process=${processId}`);
    return response.data.results || response.data;
  },

  // Create containment action
  createContainmentAction: async (data: {
    eight_d_process: string;
    action_description: string;
    rationale: string;
    responsible_person: string;
  }): Promise<EightDContainmentAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-containment-actions/`, data);
    return response.data;
  },

  // Update containment action
  updateContainmentAction: async (id: string, data: Partial<EightDContainmentAction>): Promise<EightDContainmentAction> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/8d-containment-actions/${id}/`, data);
    return response.data;
  },

  // Verify effectiveness
  verifyEffectiveness: async (id: string, effectivenessRating: number, verificationNotes?: string): Promise<EightDContainmentAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-containment-actions/${id}/verify-effectiveness/`, {
      effectiveness_rating: effectivenessRating,
      verification_notes: verificationNotes || ''
    });
    return response.data;
  },

  // Delete containment action
  deleteContainmentAction: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/8d-containment-actions/${id}/`);
  },
};

// 8D Root Cause API
export const eightDRootCauseApi = {
  // Get root causes for a process
  getRootCauses: async (processId: string): Promise<EightDRootCause[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-root-causes/?eight_d_process=${processId}`);
    return response.data.results || response.data;
  },

  // Create root cause
  createRootCause: async (data: {
    eight_d_process: string;
    cause_description: string;
    cause_type: string;
    analysis_method: string;
    supporting_evidence: string;
    verification_method: string;
    identified_by: string;
    likelihood_score?: number;
  }): Promise<EightDRootCause> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-root-causes/`, data);
    return response.data;
  },

  // Update root cause
  updateRootCause: async (id: string, data: Partial<EightDRootCause>): Promise<EightDRootCause> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/8d-root-causes/${id}/`, data);
    return response.data;
  },

  // Verify root cause
  verifyRootCause: async (id: string, verificationMethod: string): Promise<EightDRootCause> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-root-causes/${id}/verify/`, {
      verification_method: verificationMethod
    });
    return response.data;
  },

  // Delete root cause
  deleteRootCause: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/8d-root-causes/${id}/`);
  },
};

// 8D Corrective Actions API
export const eightDCorrectiveApi = {
  // Get corrective actions for a process
  getCorrectiveActions: async (processId: string): Promise<EightDCorrectiveAction[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-corrective-actions/?eight_d_process=${processId}`);
    return response.data.results || response.data;
  },

  // Create corrective action
  createCorrectiveAction: async (data: {
    eight_d_process: string;
    root_cause: string;
    action_description: string;
    action_type: string;
    rationale: string;
    responsible_person: string;
    target_date: string;
    estimated_cost?: number;
  }): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/`, data);
    return response.data;
  },

  // Update corrective action
  updateCorrectiveAction: async (id: string, data: Partial<EightDCorrectiveAction>): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/8d-corrective-actions/${id}/`, data);
    return response.data;
  },

  // Implement corrective action
  implementAction: async (id: string, implementationNotes?: string): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/implement/`, {
      implementation_notes: implementationNotes || ''
    });
    return response.data;
  },

  // Verify effectiveness
  verifyEffectiveness: async (id: string, effectivenessRating: number, verificationNotes?: string): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/verify_effectiveness/`, {
      effectiveness_rating: effectivenessRating,
      verification_notes: verificationNotes || ''
    });
    return response.data;
  },

  // Validate corrective action
  validateAction: async (id: string, validationResults: string, effectivenessRating: number): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/validate/`, {
      validation_results: validationResults,
      effectiveness_rating: effectivenessRating
    });
    return response.data;
  },

  // Start implementation
  startImplementation: async (id: string, implementationPlan: string, startDate: string, resourcesRequired?: string): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/start_implementation/`, {
      implementation_plan: implementationPlan,
      start_date: startDate,
      resources_required: resourcesRequired || ''
    });
    return response.data;
  },

  // Update progress
  updateProgress: async (id: string, progressPercentage: number, progressNotes: string, completionEvidence?: string): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/update_progress/`, {
      progress_percentage: progressPercentage,
      progress_notes: progressNotes,
      completion_evidence: completionEvidence || ''
    });
    return response.data;
  },

  // Complete implementation
  completeImplementation: async (id: string): Promise<EightDCorrectiveAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-corrective-actions/${id}/complete_implementation/`);
    return response.data;
  },

  // Delete corrective action
  deleteCorrectiveAction: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/8d-corrective-actions/${id}/`);
  },
};

// 8D Prevention Actions API
export const eightDPreventionApi = {
  // Get prevention actions for a process
  getPreventionActions: async (processId: string): Promise<EightDPreventionAction[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-prevention-actions/?eight_d_process=${processId}`);
    return response.data.results || response.data;
  },

  // Create prevention action
  createPreventionAction: async (data: {
    eight_d_process: string;
    prevention_description: string;
    prevention_type: string;
    scope_of_application: string;
    responsible_person: string;
    target_date: string;
    verification_method: string;
    similar_processes?: string;
    rollout_plan?: string;
  }): Promise<EightDPreventionAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-prevention-actions/`, data);
    return response.data;
  },

  // Update prevention action
  updatePreventionAction: async (id: string, data: Partial<EightDPreventionAction>): Promise<EightDPreventionAction> => {
    const response = await apiClient.patch(`${API_BASE_PATH}/8d-prevention-actions/${id}/`, data);
    return response.data;
  },

  // Implement prevention action
  implementAction: async (id: string): Promise<EightDPreventionAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-prevention-actions/${id}/implement/`);
    return response.data;
  },

  // Verify effectiveness
  verifyEffectiveness: async (id: string, effectivenessNotes: string): Promise<EightDPreventionAction> => {
    const response = await apiClient.post(`${API_BASE_PATH}/8d-prevention-actions/${id}/verify_effectiveness/`, {
      effectiveness_notes: effectivenessNotes
    });
    return response.data;
  },

  // Get rollout candidates
  getRolloutCandidates: async (): Promise<EightDPreventionAction[]> => {
    const response = await apiClient.get(`${API_BASE_PATH}/8d-prevention-actions/rollout_candidates/`);
    return response.data;
  },

  // Delete prevention action
  deletePreventionAction: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_BASE_PATH}/8d-prevention-actions/${id}/`);
  },
};

// Default export with commercial APIs
export default {
  incidents: incidentApi,
  attachments: attachmentApi,
  exports: exportApi,
  // Commercial APIs
  riskAssessment: riskAssessmentApi,
  categories: categoryApi,
  metrics: metricsApi,
  workflows: workflowApi,
  costs: costApi,
  learning: learningApi,
  // 8D Methodology APIs
  eightD: eightDApi,
  eightDTeam: eightDTeamApi,
  eightDContainment: eightDContainmentApi,
  eightDRootCause: eightDRootCauseApi,
  eightDCorrective: eightDCorrectiveApi,
  eightDPrevention: eightDPreventionApi,
};
