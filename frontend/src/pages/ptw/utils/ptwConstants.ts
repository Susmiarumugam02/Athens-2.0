// PTW System Constants and Configuration

export const PERMIT_TYPES = {
  HOT_WORK: 'hot_work',
  COLD_WORK: 'cold_work',
  ELECTRICAL: 'electrical',
  CONFINED_SPACE: 'confined_space',
  HEIGHT_WORK: 'height_work',
  EXCAVATION: 'excavation',
  CHEMICAL: 'chemical',
  RADIATION: 'radiation'
} as const;

export const PERMIT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REJECTED: 'rejected'
} as const;

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme'
} as const;

export const APPROVAL_ROLES = {
  SAFETY_OFFICER: 'safety_officer',
  AREA_MANAGER: 'area_manager',
  PLANT_MANAGER: 'plant_manager',
  FIRE_MARSHAL: 'fire_marshal',
  ELECTRICAL_ENGINEER: 'electrical_engineer',
  ENVIRONMENTAL_OFFICER: 'environmental_officer',
  SECURITY_OFFICER: 'security_officer'
} as const;

export const PPE_TYPES = {
  HELMET: 'helmet',
  GLOVES: 'gloves',
  SHOES: 'shoes',
  GOGGLES: 'goggles',
  FACE_SHIELD: 'face_shield',
  RESPIRATOR: 'respirator',
  EAR_PROTECTION: 'ear_protection',
  HI_VIS_VEST: 'hi_vis_vest',
  FALL_PROTECTION: 'fall_protection',
  ARC_FLASH_SUIT: 'arc_flash_suit',
  SCBA: 'scba',
  CHEMICAL_RESISTANT: 'chemical_resistant'
} as const;

export const HAZARD_CATEGORIES = {
  ELECTRICAL: 'electrical',
  MECHANICAL: 'mechanical',
  CHEMICAL: 'chemical',
  BIOLOGICAL: 'biological',
  PHYSICAL: 'physical',
  ERGONOMIC: 'ergonomic',
  PSYCHOSOCIAL: 'psychosocial',
  ENVIRONMENTAL: 'environmental'
} as const;

export const GAS_TYPES = {
  OXYGEN: 'O2',
  CARBON_MONOXIDE: 'CO',
  HYDROGEN_SULFIDE: 'H2S',
  METHANE: 'CH4',
  CARBON_DIOXIDE: 'CO2',
  AMMONIA: 'NH3',
  CHLORINE: 'Cl2',
  SULFUR_DIOXIDE: 'SO2'
} as const;

export const NOTIFICATION_TYPES = {
  PERMIT_CREATED: 'permit_created',
  APPROVAL_REQUIRED: 'approval_required',
  PERMIT_APPROVED: 'permit_approved',
  PERMIT_REJECTED: 'permit_rejected',
  PERMIT_EXPIRED: 'permit_expired',
  PERMIT_SUSPENDED: 'permit_suspended',
  ESCALATION: 'escalation',
  REMINDER: 'reminder',
  INCIDENT_REPORTED: 'incident_reported',
  SAFETY_ALERT: 'safety_alert'
} as const;

export const WORKFLOW_ACTIONS = {
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',
  SUSPEND: 'suspend',
  CANCEL: 'cancel',
  EXTEND: 'extend',
  CLOSE: 'close'
} as const;

export const INTEGRATION_TYPES = {
  ERP: 'erp',
  MAINTENANCE: 'maintenance',
  SAFETY: 'safety',
  HR: 'hr',
  IOT: 'iot',
  NOTIFICATION: 'notification',
  ANALYTICS: 'analytics'
} as const;

export const COMPLIANCE_STANDARDS = {
  OSHA: 'osha',
  ISO_45001: 'iso_45001',
  NFPA: 'nfpa',
  API: 'api',
  ASME: 'asme',
  IEC: 'iec',
  LOCAL_REGULATIONS: 'local_regulations'
} as const;

// Risk Matrix Configuration
export const RISK_MATRIX = {
  PROBABILITY: [
    { value: 1, label: 'Rare', description: 'May occur in exceptional circumstances' },
    { value: 2, label: 'Unlikely', description: 'Could occur at some time' },
    { value: 3, label: 'Possible', description: 'Might occur at some time' },
    { value: 4, label: 'Likely', description: 'Will probably occur' },
    { value: 5, label: 'Almost Certain', description: 'Expected to occur' }
  ],
  SEVERITY: [
    { value: 1, label: 'Insignificant', description: 'No injury, minimal impact' },
    { value: 2, label: 'Minor', description: 'First aid treatment' },
    { value: 3, label: 'Moderate', description: 'Medical treatment required' },
    { value: 4, label: 'Major', description: 'Extensive injuries' },
    { value: 5, label: 'Catastrophic', description: 'Death or permanent disability' }
  ]
} as const;

// Default Escalation Times (in hours)
export const ESCALATION_TIMES = {
  SAFETY_REVIEW: 2,
  AREA_APPROVAL: 4,
  PLANT_APPROVAL: 8,
  FIRE_WATCH: 1,
  ELECTRICAL_REVIEW: 3,
  ENVIRONMENTAL_REVIEW: 6
} as const;

// System Limits
export const SYSTEM_LIMITS = {
  MAX_PERMIT_DURATION: 24, // hours
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_PHOTOS_PER_PERMIT: 20,
  MAX_WORKERS_PER_PERMIT: 50,
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
  SYNC_RETRY_ATTEMPTS: 3,
  OFFLINE_DATA_RETENTION: 7 // days
} as const;

// Color Schemes
export const STATUS_COLORS = {
  [PERMIT_STATUS.DRAFT]: '#d9d9d9',
  [PERMIT_STATUS.SUBMITTED]: '#1890ff',
  [PERMIT_STATUS.UNDER_REVIEW]: '#faad14',
  [PERMIT_STATUS.APPROVED]: '#52c41a',
  [PERMIT_STATUS.ACTIVE]: '#52c41a',
  [PERMIT_STATUS.SUSPENDED]: '#fa8c16',
  [PERMIT_STATUS.COMPLETED]: '#722ed1',
  [PERMIT_STATUS.CANCELLED]: '#8c8c8c',
  [PERMIT_STATUS.EXPIRED]: '#ff4d4f',
  [PERMIT_STATUS.REJECTED]: '#ff4d4f'
} as const;

export const RISK_COLORS = {
  [RISK_LEVELS.LOW]: '#52c41a',
  [RISK_LEVELS.MEDIUM]: '#faad14',
  [RISK_LEVELS.HIGH]: '#fa8c16',
  [RISK_LEVELS.EXTREME]: '#ff4d4f'
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  PERMITS: '/api/v1/ptw/permits',
  PERMIT_TYPES: '/api/v1/ptw/permit-types',
  WORKERS: '/api/v1/ptw/permit-workers',
  USERS: '/api/users',
  APPROVALS: '/api/v1/ptw/permit-approvals',
  NOTIFICATIONS: '/api/notifications',
  INTEGRATIONS: '/api/v1/ptw/system-integrations',
  REPORTS: '/api/v1/ptw/reports',
  ANALYTICS: '/api/v1/ptw/analytics',
  COMPLIANCE: '/api/v1/ptw/compliance-reports'
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PERMIT_NUMBER: {
    pattern: /^PTW-\d{4}-\d{3,6}$/,
    message: 'Permit number must follow format: PTW-YYYY-NNNNNN'
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  PHONE: {
    pattern: /^\+?[\d\s\-\(\)]{10,}$/,
    message: 'Please enter a valid phone number'
  },
  GPS_COORDINATES: {
    pattern: /^-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+$/,
    message: 'Please enter valid GPS coordinates (lat, lng)'
  }
} as const;

// Default Form Values
export const DEFAULT_FORM_VALUES = {
  PERMIT_DURATION: 8, // hours
  RISK_ASSESSMENT_VALIDITY: 30, // days
  PPE_INSPECTION_VALIDITY: 7, // days
  GAS_TESTING_VALIDITY: 4, // hours
  FIRE_WATCH_DURATION: 1, // hour after work completion
  AUTO_GENERATE_PERMIT_NUMBER: true,
  REQUIRES_ISOLATION: false,
  RISK_ASSESSMENT_COMPLETED: false
} as const;

// Mobile App Configuration
export const MOBILE_CONFIG = {
  CAMERA_QUALITY: 0.8,
  MAX_PHOTO_WIDTH: 1920,
  MAX_PHOTO_HEIGHT: 1080,
  QR_SCAN_TIMEOUT: 30000, // 30 seconds
  GPS_TIMEOUT: 10000, // 10 seconds
  GPS_MAX_AGE: 60000, // 1 minute
  OFFLINE_SYNC_INTERVAL: 300000, // 5 minutes
  PUSH_NOTIFICATION_ENABLED: true
} as const;

// Report Templates
export const REPORT_TEMPLATES = {
  DAILY_PERMITS: 'daily_permits',
  WEEKLY_SUMMARY: 'weekly_summary',
  MONTHLY_COMPLIANCE: 'monthly_compliance',
  INCIDENT_ANALYSIS: 'incident_analysis',
  RISK_ASSESSMENT: 'risk_assessment',
  AUDIT_REPORT: 'audit_report',
  PERFORMANCE_METRICS: 'performance_metrics'
} as const;

// Export types for TypeScript
export type PermitType = typeof PERMIT_TYPES[keyof typeof PERMIT_TYPES];
export type PermitStatus = typeof PERMIT_STATUS[keyof typeof PERMIT_STATUS];
export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];
export type ApprovalRole = typeof APPROVAL_ROLES[keyof typeof APPROVAL_ROLES];
export type PPEType = typeof PPE_TYPES[keyof typeof PPE_TYPES];
export type HazardCategory = typeof HAZARD_CATEGORIES[keyof typeof HAZARD_CATEGORIES];
export type GasType = typeof GAS_TYPES[keyof typeof GAS_TYPES];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type WorkflowAction = typeof WORKFLOW_ACTIONS[keyof typeof WORKFLOW_ACTIONS];
export type IntegrationType = typeof INTEGRATION_TYPES[keyof typeof INTEGRATION_TYPES];
export type ComplianceStandard = typeof COMPLIANCE_STANDARDS[keyof typeof COMPLIANCE_STANDARDS];
export type ReportTemplate = typeof REPORT_TEMPLATES[keyof typeof REPORT_TEMPLATES];