import React, { useMemo } from 'react';
import useAuthStore from '@common/store/authStore';

export interface IncidentPermissions {
  // Basic permissions
  canViewIncidents: boolean;
  canCreateIncidents: boolean;
  canEditIncidents: boolean;
  canDeleteIncidents: boolean;
  
  // Investigation permissions
  canManageInvestigations: boolean;
  canAssignInvestigators: boolean;
  canApproveInvestigations: boolean;
  
  // CAPA permissions
  canManageCAPAs: boolean;
  canApproveCAPAs: boolean;
  canCloseCAPAs: boolean;
  
  // 8D permissions
  canManage8D: boolean;
  canChampion8D: boolean;
  canRecognizeTeam: boolean;
  
  // Commercial features
  canViewFinancials: boolean;
  canManageCosts: boolean;
  canAccessAnalytics: boolean;
  canManageRiskAssessment: boolean;
  canAccessLessonsLearned: boolean;
  
  // Administrative permissions
  canManageCategories: boolean;
  canManageWorkflows: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  
  // Project-level permissions
  canViewAllProjects: boolean;
  canManageProjectSettings: boolean;
}

export const useIncidentPermissions = (): IncidentPermissions => {
  const { usertype, django_user_type, grade, user } = useAuthStore();

  return useMemo(() => {
    // Master Admin has all permissions
    const isMasterAdmin = usertype === 'masteradmin';
    
    // Project Admins (client, epc, contractor)
    const isProjectAdmin = ['client', 'epc', 'contractor'].includes(usertype || '');
    
    // Admin Users (clientuser, epcuser, contractoruser)
    const isAdminUser = ['clientuser', 'epcuser', 'contractoruser'].includes(usertype || '');
    
    // Grade-based permissions (A, B, C)
    const isGradeA = grade === 'A';
    const isGradeB = grade === 'B';
    const isGradeC = grade === 'C';
    
    // Regular users
    const isRegularUser = !isMasterAdmin && !isProjectAdmin && !isAdminUser;

    const permissions: IncidentPermissions = {
      // Basic permissions
      canViewIncidents: true, // All users can view incidents
      canCreateIncidents: !isRegularUser || isGradeA || isGradeB,
      canEditIncidents: isMasterAdmin || isProjectAdmin || (isAdminUser && (isGradeA || isGradeB)),
      canDeleteIncidents: isMasterAdmin || isProjectAdmin,
      
      // Investigation permissions
      canManageInvestigations: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canAssignInvestigators: isMasterAdmin || isProjectAdmin,
      canApproveInvestigations: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      
      // CAPA permissions
      canManageCAPAs: isMasterAdmin || isProjectAdmin || (isAdminUser && (isGradeA || isGradeB)),
      canApproveCAPAs: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canCloseCAPAs: isMasterAdmin || isProjectAdmin,
      
      // 8D permissions
      canManage8D: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canChampion8D: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canRecognizeTeam: isMasterAdmin || isProjectAdmin,
      
      // Commercial features
      canViewFinancials: isMasterAdmin || isProjectAdmin,
      canManageCosts: isMasterAdmin || isProjectAdmin,
      canAccessAnalytics: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canManageRiskAssessment: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canAccessLessonsLearned: isMasterAdmin || isProjectAdmin || (isAdminUser && (isGradeA || isGradeB)),
      
      // Administrative permissions
      canManageCategories: isMasterAdmin || isProjectAdmin,
      canManageWorkflows: isMasterAdmin || isProjectAdmin,
      canExportData: isMasterAdmin || isProjectAdmin || (isAdminUser && isGradeA),
      canManageUsers: isMasterAdmin,
      
      // Project-level permissions
      canViewAllProjects: isMasterAdmin,
      canManageProjectSettings: isMasterAdmin || isProjectAdmin,
    };

    return permissions;
  }, [usertype, django_user_type, grade, user]);
};

// Helper hook for specific permission checks
export const useCanManageIncidents = (): boolean => {
  const permissions = useIncidentPermissions();
  return permissions.canEditIncidents || permissions.canManageInvestigations;
};

export const useCanManage8D = (): boolean => {
  const permissions = useIncidentPermissions();
  return permissions.canManage8D;
};

export const useCanViewFinancials = (): boolean => {
  const permissions = useIncidentPermissions();
  return permissions.canViewFinancials;
};

export const useCanAccessAnalytics = (): boolean => {
  const permissions = useIncidentPermissions();
  return permissions.canAccessAnalytics;
};

// Permission-based component wrapper
export const withIncidentPermissions = <T extends object>(
  Component: React.ComponentType<T>,
  requiredPermissions: (keyof IncidentPermissions)[]
): React.FC<T> => {
  return (props: T) => {
    const permissions = useIncidentPermissions();

    const hasPermission = requiredPermissions.some(permission =>
      permissions[permission]
    );

    if (!hasPermission) {
      return React.createElement('div', {
        className: 'dashboard-content-wrapper',
        style: {
          textAlign: 'center' as const,
          color: 'var(--color-text-muted)',
          backgroundColor: 'var(--color-ui-base)',
          borderRadius: '6px',
          border: '1px solid var(--color-border)',
          minHeight: '200px',
          display: 'flex',
          flexDirection: 'column' as const,
          justifyContent: 'center' as const,
          alignItems: 'center' as const
        }
      }, [
        React.createElement('h3', {
          key: 'title',
          style: { color: 'var(--color-text-base)', marginBottom: '8px' }
        }, 'Access Denied'),
        React.createElement('p', {
          key: 'message',
          style: { color: 'var(--color-text-muted)', margin: 0 }
        }, "You don't have permission to access this feature.")
      ]);
    }

    return React.createElement(Component, props);
  };
};

// Permission constants for easy reference
export const PERMISSION_LEVELS = {
  MASTER_ADMIN: ['masteradmin'],
  PROJECT_ADMIN: ['client', 'epc', 'contractor'],
  ADMIN_USER: ['clientuser', 'epcuser', 'contractoruser'],
  GRADE_A: ['A'],
  GRADE_B: ['B'],
  GRADE_C: ['C'],
} as const;

export default useIncidentPermissions;
