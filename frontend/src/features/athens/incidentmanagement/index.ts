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
export * from './types';

// Legacy export for backward compatibility - now points to new main page
export { default as IncidentManagement } from './pages/IncidentManagementPage';

