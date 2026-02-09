import { useState, useEffect } from 'react';
import { UserPermissions } from '../types';
import useAuthStore from '../../../common/store/authStore';
import api from '../services/api';

interface UsePermissionsReturn {
  permissions: UserPermissions | null;
  loading: boolean;
  canManageIncidents: boolean;
  canInvestigateIncidents: boolean;
  canManageCapas: boolean;
  canViewFinancialData: boolean;
  canManageRiskAssessment: boolean;
  canAccessAnalytics: boolean;
  canManageWorkflows: boolean;
  canApproveIncidents: boolean;
  canExportData: boolean;
  isMasterAdmin: boolean;
  isProjectAdmin: boolean;
  isAdminUser: boolean;
  userGrade: string | null;
  adminType: string | null;
}

export const usePermissions = (): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get permissions from API
        const userPermissions = await api.incidents.getUserPermissions();
        setPermissions(userPermissions);
      } catch (error) {
        // Fallback to basic permissions based on user type
        setPermissions({
          can_manage_incidents: true,
          can_investigate_incidents: false,
          can_manage_capas: false,
          can_view_financial_data: false,
          can_manage_risk_assessment: false,
          can_access_analytics: false,
          can_manage_workflows: false,
          can_approve_incidents: false,
          can_export_data: false,
        });
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  // Helper functions based on user management system
  const normalizedAdminType = user?.admin_type === 'master' || user?.admin_type === 'MASTER_ADMIN'
    ? 'masteradmin'
    : user?.admin_type;
  const isMasterAdmin = normalizedAdminType === 'masteradmin';
  const isProjectAdmin = normalizedAdminType && ['client', 'epc', 'contractor'].includes(normalizedAdminType);
  const isAdminUser = normalizedAdminType && ['clientuser', 'epcuser', 'contractoruser'].includes(normalizedAdminType);
  const userGrade = user?.grade || null;
  const adminType = normalizedAdminType || null;

  // Enhanced permission checks based on user management hierarchy
  const canManageIncidents = permissions?.can_manage_incidents || isMasterAdmin || isProjectAdmin || isAdminUser;
  
  const canInvestigateIncidents = permissions?.can_investigate_incidents || 
    isMasterAdmin || 
    isProjectAdmin || 
    (isAdminUser && userGrade === 'A'); // Site Incharge can investigate
  
  const canManageCapas = permissions?.can_manage_capas || 
    isMasterAdmin || 
    isProjectAdmin || 
    (isAdminUser && ['A', 'B'].includes(userGrade || '')); // Site Incharge and Team Leaders
  
  const canViewFinancialData = permissions?.can_view_financial_data || 
    isMasterAdmin || 
    isProjectAdmin; // Only project admins and above can view financial data
  
  const canManageRiskAssessment = permissions?.can_manage_risk_assessment || 
    isMasterAdmin || 
    isProjectAdmin || 
    (adminType === 'epcuser') || // EPC users typically handle risk assessments
    (user?.designation && user.designation.toLowerCase().includes('safety'));
  
  const canAccessAnalytics = permissions?.can_access_analytics || 
    isMasterAdmin || 
    isProjectAdmin || 
    (userGrade === 'A'); // Site Incharge can access analytics
  
  const canManageWorkflows = permissions?.can_manage_workflows || 
    isMasterAdmin || 
    isProjectAdmin; // Only project admins can manage workflows
  
  const canApproveIncidents = permissions?.can_approve_incidents || 
    isMasterAdmin || 
    isProjectAdmin || 
    (userGrade === 'A'); // Site Incharge can approve
  
  const canExportData = permissions?.can_export_data || 
    isMasterAdmin || 
    isProjectAdmin || 
    (['A', 'B'].includes(userGrade || '')); // Grade A and B can export

  return {
    permissions,
    loading,
    canManageIncidents,
    canInvestigateIncidents,
    canManageCapas,
    canViewFinancialData,
    canManageRiskAssessment,
    canAccessAnalytics,
    canManageWorkflows,
    canApproveIncidents,
    canExportData,
    isMasterAdmin,
    isProjectAdmin,
    isAdminUser,
    userGrade,
    adminType,
  };
};

export default usePermissions;
