export type WorkflowUser = {
  id?: number | string;
  username?: string;
  full_name?: string;
  name?: string;
  surname?: string;
  user?: { full_name?: string };
  admin_type?: string;
  admin_user_type?: string;
  usertype?: string;
  user_type?: string;
  grade?: string;
};

export const normalizeAdminType = (value?: string | null): string | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === 'client') return 'clientuser';
  if (normalized === 'epc') return 'epcuser';
  if (normalized === 'contractor') return 'contractoruser';
  return normalized;
};

export const normalizeGrade = (value?: string | null): string | null => {
  if (!value) return null;
  return value.toUpperCase();
};

export const getUserAdminType = (user: WorkflowUser): string | null => {
  return normalizeAdminType(
    user.admin_type || user.admin_user_type || user.usertype || user.user_type || null
  );
};

export const getUserGrade = (user: WorkflowUser): string | null => {
  return normalizeGrade(user.grade || null);
};

export const getUserDisplayName = (user: WorkflowUser): string => {
  if (user.user?.full_name) return user.user.full_name;
  if (user.full_name) return user.full_name;
  if (user.name || user.surname) {
    return `${user.name || ''} ${user.surname || ''}`.trim();
  }
  if (user.username) return user.username;
  return 'Unknown';
};

export const buildWorkflowParams = (userType?: string | null, grade?: string | null): string => {
  const params = new URLSearchParams();
  if (userType) params.set('user_type', userType);
  if (grade) params.set('grade', grade);
  return params.toString();
};

export const isAllowedVerifier = (
  requestorType?: string | null,
  requestorGrade?: string | null,
  verifier?: WorkflowUser
): boolean => {
  if (!verifier) return false;
  const verifierType = getUserAdminType(verifier);
  const verifierGrade = getUserGrade(verifier);

  if (!requestorType || !verifierType || !verifierGrade) {
    return true;
  }

  switch (requestorType) {
    case 'contractoruser':
      return verifierType === 'epcuser' && ['B', 'C'].includes(verifierGrade);
    case 'epcuser':
      if (requestorGrade === 'C') {
        return verifierType === 'epcuser' && ['A', 'B'].includes(verifierGrade);
      }
      if (requestorGrade === 'B') {
        if (verifierType === 'epcuser') return verifierGrade === 'A';
        return verifierType === 'clientuser' && ['B', 'C'].includes(verifierGrade);
      }
      return verifierType === 'epcuser' || verifierType === 'clientuser';
    case 'clientuser':
      return verifierType === 'clientuser' && verifierGrade === 'B';
    default:
      return true;
  }
};

export const isAllowedApprover = (
  verifierType?: string | null,
  verifierGrade?: string | null,
  approver?: WorkflowUser
): boolean => {
  if (!approver) return false;
  const approverType = getUserAdminType(approver);
  const approverGrade = getUserGrade(approver);

  if (!verifierType || !verifierGrade || !approverType || !approverGrade) {
    return true;
  }

  if (!['A', 'B'].includes(approverGrade)) {
    return false;
  }

  if (verifierType === 'epcuser') {
    if (verifierGrade === 'B') {
      if (approverType === 'epcuser') return approverGrade === 'A';
      return approverType === 'clientuser' && ['A', 'B'].includes(approverGrade);
    }
    if (verifierGrade === 'C') {
      return (approverType === 'epcuser' || approverType === 'clientuser') &&
        ['A', 'B'].includes(approverGrade);
    }
  }

  if (verifierType === 'clientuser') {
    return approverType === 'clientuser' && approverGrade === 'A';
  }

  return true;
};
