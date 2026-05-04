// Define the UserMinimal interface
export interface UserMinimal {
  id: number;
  username: string;
  full_name: string;
  email?: string;
}

// Define the PermitType interface
export interface PermitType {
  id: number;
  name: string;
  category?: string;
  description?: string;
  color_code?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  validity_hours?: number;
  requires_approval_levels?: number;
  active?: boolean;
  escalation_time_hours?: number;
  min_personnel_required?: number;
  requires_gas_testing?: boolean;
  requires_fire_watch?: boolean;
  requires_isolation?: boolean;
  requires_structured_isolation?: boolean;
  requires_deisolation_on_closeout?: boolean;
  requires_medical_surveillance?: boolean;
  requires_training_verification?: boolean;
  mandatory_ppe?: string[];
  safety_checklist?: any[];
  control_measures?: string[];
  risk_factors?: string[];
  emergency_procedures?: string[];
  form_template?: Record<string, any>;
  project_overrides_enabled?: boolean;
}

export type TemplateCategory = 'required' | 'recommended' | 'optional';

export interface TemplateFieldOption {
  label?: string;
  value: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: string;
  default?: any;
  required?: boolean;
  help?: string;
  options?: Array<string | TemplateFieldOption>;
}

export interface TemplateSection {
  id: string;
  title: string;
  category?: TemplateCategory;
  fields: TemplateField[];
}

export interface TemplateReference {
  type: string;
  code: string;
  title: string;
  url?: string | null;
}

export interface ResolvedPermitTypeTemplateResponse {
  permit_type_id: number;
  resolved_template: {
    version: number;
    sections: TemplateSection[];
    references?: TemplateReference[];
  };
  resolved_prefill: {
    ppe_requirements?: string[];
    safety_checklist?: any;
    control_measures?: string[] | string;
    risk_factors?: string[];
    emergency_procedures?: string[];
  };
  resolved_flags: {
    requires_gas_testing?: boolean;
    requires_fire_watch?: boolean;
    requires_isolation?: boolean;
    requires_structured_isolation?: boolean;
    requires_deisolation_on_closeout?: boolean;
    requires_medical_surveillance?: boolean;
    requires_training_verification?: boolean;
    validity_hours?: number;
    escalation_time_hours?: number;
    min_personnel_required?: number;
    requires_approval_levels?: number;
  };
}

export interface DigitalSignature {
  id: number;
  signature_type: string;
  signatory: number;
  signatory_details?: UserMinimal;
  signature_data: string;
  signed_at: string;
  ip_address?: string;
  device_info?: Record<string, any>;
  signature_render_mode?: 'raw' | 'card';
  signature_template_url?: string | null;
}

export interface PermitToolboxTalk {
  id: number;
  permit: number;
  title?: string;
  conducted_at?: string | null;
  conducted_by?: number | null;
  conducted_by_details?: UserMinimal;
  document?: string | null;
  url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PermitToolboxTalkAttendance {
  id: number | null;
  tbt?: number | null;
  permit_worker: number;
  permit_worker_details?: any;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  ack_signature?: string;
}

export interface PermitToolboxTalkResponse {
  tbt: PermitToolboxTalk | null;
  attendance: PermitToolboxTalkAttendance[];
}

export interface PermitSignatureMap {
  requestor?: DigitalSignature | null;
  verifier?: DigitalSignature | null;
  approver?: DigitalSignature | null;
}

// Permit interface - authorization is handled by workflow system
export interface Permit {
  id: number;
  permit_number: string;
  title: string;
  permit_type: number;
  permit_type_details?: PermitType;
  location: string;
  description: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  created_by: number;
  created_by_details?: UserMinimal;
  status: PermitStatus;
  current_approval_level?: number;
  created_at: string;
  updated_at: string;
  hazards?: string;
  control_measures?: string;
  ppe_requirements?: string[];
  special_instructions?: string;
  // Workflow-managed fields (read-only)
  verifier?: number;
  verifier_details?: UserMinimal;
  verified_at?: string;
  verification_comments?: string;
  approved_by?: number;
  approved_by_details?: UserMinimal;
  approved_at?: string;
  approval_comments?: string;
  // Additional fields from errors
  assigned_workers?: any[];
  gps_coordinates?: any;
  risk_assessment_completed?: boolean;
  probability?: number;
  severity?: number;
  safety_checklist?: any;
  requires_isolation?: boolean;
  mobile_created?: boolean;
  offline_id?: string;
  project?: any;
  emergency_procedures?: string;
  audit_trail?: any[];
  isolation_details?: string;
  permit_parameters?: Record<string, any>;
  extensions?: any[];
  signatures?: DigitalSignature[];
  signatures_by_type?: PermitSignatureMap;
  toolbox_talk?: PermitToolboxTalk | null;
  toolbox_talk_attendance?: PermitToolboxTalkAttendance[];
}

// Update the PermitStatus type to include verification statuses
export type PermitStatus = 
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'suspended'
  | 'cancelled';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  usertype: string;
  grade?: string;
}

export interface WorkflowStep {
  id: number;
  name: string;
  order: number;
  required_role?: string;
  is_active: boolean;
  step_type?: 'verification' | 'approval';
  assignee?: string;
  status?: 'pending' | 'approved' | 'rejected';
  completed_at?: string;
  comments?: string;
}

// Closeout Checklist Types
export interface CloseoutChecklistItem {
  key: string;
  label: string;
  required: boolean;
}

export interface CloseoutChecklistTemplate {
  id: number;
  name: string;
  permit_type: number;
  risk_level?: string;
  items: CloseoutChecklistItem[];
}

export interface CloseoutChecklistItemStatus {
  done: boolean;
  comments?: string;
  at?: string;
  by?: number;
}

export interface PermitCloseout {
  id: number;
  permit: number;
  template?: CloseoutChecklistTemplate;
  template_details?: CloseoutChecklistTemplate;
  checklist: Record<string, CloseoutChecklistItemStatus>;
  completed: boolean;
  completed_at?: string;
  completed_by?: number;
  completed_by_details?: UserMinimal;
  remarks: string;
  missing_items: string[];
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

// Isolation Points Types
export interface IsolationPointLibrary {
  id: number;
  project?: number;
  site?: string;
  asset_tag?: string;
  point_code: string;
  point_type: 'valve' | 'breaker' | 'switch' | 'disconnect' | 'line_blind' | 'fuse_pull' | 'other';
  energy_type: 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic' | 'chemical' | 'thermal' | 'gravity' | 'radiation' | 'other';
  location?: string;
  description?: string;
  isolation_method?: string;
  verification_method?: string;
  requires_lock: boolean;
  default_lock_count: number;
  ppe_required?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermitIsolationPoint {
  id: number;
  permit: number;
  point?: number;
  point_details?: IsolationPointLibrary;
  custom_point_name?: string;
  custom_point_details?: string;
  status: 'assigned' | 'isolated' | 'verified' | 'deisolated' | 'cancelled';
  required: boolean;
  lock_applied: boolean;
  lock_count: number;
  lock_ids: string[];
  isolated_by?: number;
  isolated_by_details?: UserMinimal;
  isolated_at?: string;
  verified_by?: number;
  verified_by_details?: UserMinimal;
  verified_at?: string;
  verification_notes?: string;
  deisolated_by?: number;
  deisolated_by_details?: UserMinimal;
  deisolated_at?: string;
  deisolated_notes?: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface PermitIsolationResponse {
  points: PermitIsolationPoint[];
  summary: {
    total: number;
    required: number;
    verified: number;
    deisolated: number;
    pending_verification: number;
  };
}

// Readiness Types
export interface SignatureDetails {
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
}

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
      latest?: {
        tested_at?: string;
        tested_by?: string;
      };
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
      is_complete?: boolean;
      missing_items: string[];
    };
    signatures: SignatureDetails;
  };
}



