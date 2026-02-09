import api from '@common/utils/axiosetup';

// Quality Standards
export const getQualityStandards = () => 
  api.get('/api/v1/quality/standards/');

export const createQualityStandard = (data: any) => 
  api.post('/api/v1/quality/standards/', data);

export const updateQualityStandard = (id: string, data: any) => 
  api.put(`/api/v1/quality/standards/${id}/`, data);

export const deleteQualityStandard = (id: string) => 
  api.delete(`/api/v1/quality/standards/${id}/`);

export const getQualityStandard = (id: string) => 
  api.get(`/api/v1/quality/standards/${id}/`);

export const getActiveStandards = () => 
  api.get('/api/v1/quality/standards/active_standards/');

// Quality Templates
export const getQualityTemplates = (params?: {
  industry?: string;
  inspection_type?: string;
  criticality?: string;
  certified_only?: string;
}) => api.get('/api/v1/quality/templates/', { params });

export const createQualityTemplate = (data: any) => 
  api.post('/api/v1/quality/templates/', data);

export const updateQualityTemplate = (id: number, data: any) => 
  api.put(`/api/v1/quality/templates/${id}/`, data);

export const deleteQualityTemplate = (id: number) => 
  api.delete(`/api/v1/quality/templates/${id}/`);

export const getQualityTemplate = (id: number) => 
  api.get(`/api/v1/quality/templates/${id}/`);

export const certifyTemplate = (id: number) => 
  api.post(`/api/v1/quality/templates/${id}/certify_template/`);

export const cloneTemplate = (id: number, data: any) => 
  api.post(`/api/v1/quality/templates/${id}/clone_template/`, data);

export const getTemplateAnalytics = () => 
  api.get('/api/v1/quality/templates/template_analytics/');

// Quality Inspections
export const getQualityInspections = (params?: {
  status?: string;
  result?: string;
  priority?: string;
  inspector?: string;
  date_from?: string;
  date_to?: string;
}) => api.get('/api/v1/quality/inspections/', { params });

export const createQualityInspection = (data: any) => 
  api.post('/api/v1/quality/inspections/', data);

export const startInspection = (id: number) => 
  api.post(`/api/v1/quality/inspections/${id}/start_inspection/`);

export const completeInspection = (id: number, data: any) => 
  api.post(`/api/v1/quality/inspections/${id}/complete_inspection/`, data);

export const addDigitalSignature = (id: number, data: any) => 
  api.post(`/api/v1/quality/inspections/${id}/add_digital_signature/`, data);

export const getInspectionStats = () => 
  api.get('/api/v1/quality/inspections/dashboard_stats/');

export const getQualityTrends = (params?: { days?: number }) => 
  api.get('/api/v1/quality/inspections/quality_trends/', { params });

// Quality Defects
export const getQualityDefects = (params?: {
  inspection?: number;
  severity?: string;
  category?: string;
  status?: string;
  resolved?: boolean;
}) => api.get('/api/v1/quality/defects/', { params });

export const createQualityDefect = (data: any) => 
  api.post('/api/v1/quality/defects/', data);

export const resolveDefect = (id: number, data?: any) => 
  api.post(`/api/v1/quality/defects/${id}/resolve_defect/`, data);

export const getDefectAnalytics = () => 
  api.get('/api/v1/quality/defects/defect_analytics/');

export const updateQualityDefect = (id: number, data: any) => 
  api.put(`/api/v1/quality/defects/${id}/`, data);

export const deleteQualityDefect = (id: number) => 
  api.delete(`/api/v1/quality/defects/${id}/`);

export const getQualityDefect = (id: number) => 
  api.get(`/api/v1/quality/defects/${id}/`);

// Supplier Quality
export const getSuppliers = (params?: {
  industry?: string;
  rating?: string;
  supplier_type?: string;
  approved?: boolean;
  certification_status?: string;
}) => api.get('/api/v1/quality/suppliers/', { params });

export const createSupplier = (data: any) => 
  api.post('/api/v1/quality/suppliers/', data);

export const updateSupplier = (id: number, data: any) => 
  api.put(`/api/v1/quality/suppliers/${id}/`, data);

export const deleteSupplier = (id: number) => 
  api.delete(`/api/v1/quality/suppliers/${id}/`);

export const getSupplier = (id: number) => 
  api.get(`/api/v1/quality/suppliers/${id}/`);

export const conductSupplierAudit = (id: number, data: any) => 
  api.post(`/api/v1/quality/suppliers/${id}/conduct_audit/`, data);

export const getSupplierStats = () => 
  api.get('/api/v1/quality/suppliers/supplier_stats/');

export const getSupplierRankings = () => 
  api.get('/api/v1/quality/suppliers/supplier_rankings/');

// Quality Metrics & KPIs
export const getQualityMetrics = () => 
  api.get('/api/v1/quality/metrics/');

export const getKPIDashboard = (params?: { days?: number }) => 
  api.get('/api/v1/quality/metrics/kpi_dashboard/', { params });

// Quality Alerts
export const getQualityAlerts = (params?: {
  alert_type?: string;
  severity?: string;
  acknowledged?: boolean;
}) => api.get('/api/v1/quality/alerts/', { params });

export const acknowledgeAlert = (id: number) => 
  api.post(`/api/v1/quality/alerts/${id}/acknowledge_alert/`);

export const getAlertSummary = () => 
  api.get('/api/v1/quality/alerts/alert_summary/');