// Components - Core (Actively Used)
export { default as IncidentForm } from './components/IncidentForm';
export { default as IncidentList } from './components/IncidentList';
export { default as IncidentDetail } from './components/IncidentDetail';
export { default as IncidentDashboard } from './components/IncidentDashboard';


// Components - Advanced (Actively Used)
export { default as AnalyticsDashboard } from './components/AnalyticsDashboard';
export { default as EightDProcess } from './components/EightDProcess';
export { default as CostTrackingPanel } from './components/CostTrackingPanel';
export { default as LessonsLearnedPanel } from './components/LessonsLearnedPanel';
export { default as RiskAssessmentMatrix } from './components/RiskAssessmentMatrix';

// Pages
export { default as IncidentManagementPage } from './pages/IncidentManagementPage';
export { default as MobileReportPage } from './pages/MobileReportPage';

// Routes
export { default as IncidentManagementRoutes } from './routes';

// Hooks
export { useIncidents, useIncident, useDashboardStats } from './hooks/useIncidents';


// Services
export { default as incidentApi } from './services/api';

// Types
export type { 
  Incident,
  IncidentListItem,
  IncidentAttachment,
  IncidentAuditLog,
  IncidentNotification,
  IncidentFilters,
  IncidentFormData,
  IncidentDashboardStats,
  PaginatedResponse,
  ApiError,
  RiskAssessmentTemplate,
  IncidentCategory,
  IncidentMetrics,
  IncidentWorkflow,
  IncidentCostCenter,
  IncidentLearning,
  IncidentAnalytics,
  RiskMatrixData,
  UserPermissions,
  EnhancedIncidentDashboardStats,
  EightDProcess,
  EightDDiscipline,
  EightDTeam,
  EightDTeamFormData,
  EightDContainmentAction,
  EightDRootCause,
  EightDCorrectiveAction,
  EightDPreventionAction,
} from './types';
export {
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  INCIDENT_STATUSES,
  RISK_LEVELS,
  BUSINESS_IMPACT_LEVELS,
  REGULATORY_FRAMEWORKS,
  COST_CATEGORIES,
  EIGHT_D_DISCIPLINES,
  EIGHT_D_STATUSES,
  TEAM_ROLES,
  ROOT_CAUSE_ANALYSIS_METHODS,
  CAUSE_TYPES,
} from './types';

// Legacy export for backward compatibility - now points to new main page
export { default as IncidentManagement } from './pages/IncidentManagementPage';

