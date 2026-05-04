// ─── HT Pre-Commission Form — Single Source of Truth ─────────────────────────

export type ChecklistStatus = 'ok' | 'not_ok' | 'na' | '';
export type TestResult = 'PASS' | 'FAIL' | '';
export type FinalStatus = 'READY FOR ENERGIZATION' | 'NOT READY' | '';

// ── Section A: General Info ───────────────────────────────────────────────────

export interface GeneralField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

export const GENERAL_FIELDS: GeneralField[] = [
  { name: 'project_name',    label: 'Project Name',     type: 'text',   required: true },
  { name: 'location',        label: 'Location',         type: 'text',   required: true },
  { name: 'cable_id',        label: 'Cable ID',         type: 'text',   required: true },
  { name: 'voltage_level',   label: 'Voltage Level',    type: 'select', required: true, options: ['11kV', '22kV', '33kV'] },
  { name: 'cable_type',      label: 'Cable Type',       type: 'select', required: true, options: ['XLPE', 'PVC'] },
  { name: 'cable_size',      label: 'Cable Size',       type: 'text' },
  { name: 'from_location',   label: 'From Location',    type: 'text' },
  { name: 'to_location',     label: 'To Location',      type: 'text' },
  { name: 'laying_method',   label: 'Laying Method',    type: 'select', options: ['Tray', 'Trench', 'Duct'] },
  { name: 'inspection_date', label: 'Inspection Date',  type: 'date',   required: true },
  { name: 'contractor_name', label: 'Contractor Name',  type: 'text',   required: true },
];

// ── Sections 2–5, 7, 8: Checklists ───────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  label: string;
  isCritical?: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'visual',
    title: '2. Visual Inspection',
    items: [
      { id: 'v1', label: 'Cable route as per drawing' },
      { id: 'v2', label: 'No visible damage to cable sheath',  isCritical: true },
      { id: 'v3', label: 'Proper clamping & dressing' },
      { id: 'v4', label: 'Cable identification tags provided' },
      { id: 'v5', label: 'Bending radius maintained',          isCritical: true },
      { id: 'v6', label: 'Segregation from LT cables',         isCritical: true },
      { id: 'v7', label: 'Cable tray properly earthed' },
      { id: 'v8', label: 'Entry/exit sealing done' },
    ],
  },
  {
    id: 'cable_laying',
    title: '3. Cable Laying & Installation',
    items: [
      { id: 'cl1', label: 'Cable laid as per approved drawing' },
      { id: 'cl2', label: 'Correct cable size and type used',  isCritical: true },
      { id: 'cl3', label: 'Spacing between cables as per standard' },
      { id: 'cl4', label: 'No twists, kinks or knots' },
      { id: 'cl5', label: 'Hume pipes provided at road crossings' },
      { id: 'cl6', label: 'Adequate looping at termination ends' },
      { id: 'cl7', label: 'Cable blocks alignment correct' },
    ],
  },
  {
    id: 'termination',
    title: '4. Termination & Jointing',
    items: [
      { id: 'tj1', label: 'Termination done as per approved drawing', isCritical: true },
      { id: 'tj2', label: 'Correct gland size and type used' },
      { id: 'tj3', label: 'Stress cone properly installed',           isCritical: true },
      { id: 'tj4', label: 'Phase colour coding correct',              isCritical: true },
      { id: 'tj5', label: 'Tightness of termination connections checked' },
      { id: 'tj6', label: 'Joint kit used as per specification' },
    ],
  },
  {
    id: 'earthing',
    title: '5. Earthing & Bonding',
    items: [
      { id: 'e1', label: 'Cable armour earthed at both ends',  isCritical: true },
      { id: 'e2', label: 'Earth continuity verified',          isCritical: true },
      { id: 'e3', label: 'Earth conductor size as per design' },
      { id: 'e4', label: 'Bonding connections tight and secure' },
      { id: 'e5', label: 'Earth pit resistance within limits' },
    ],
  },
  {
    id: 'documentation',
    title: '7. Documentation Verification',
    items: [
      { id: 'd1', label: 'As-built drawings available' },
      { id: 'd2', label: 'Cable test certificates available' },
      { id: 'd3', label: 'Material test certificates available' },
      { id: 'd4', label: 'Calibration certificates for test instruments' },
      { id: 'd5', label: 'Previous inspection reports reviewed' },
    ],
  },
  {
    id: 'safety',
    title: '8. Safety Checks',
    items: [
      { id: 's1', label: 'Work permit issued and valid',        isCritical: true },
      { id: 's2', label: 'Area barricaded and warning signs posted' },
      { id: 's3', label: 'PPE worn by all personnel',           isCritical: true },
      { id: 's4', label: 'Discharge rod available',             isCritical: true },
      { id: 's5', label: 'Emergency procedures communicated' },
    ],
  },
];

// ── Section 6: Electrical Testing (fixed rows) ────────────────────────────────

export interface ElectricalTest {
  id: string;
  test_name: string;
  standard_value: string;
  isCritical: boolean;
}

export const ELECTRICAL_TESTS: ElectricalTest[] = [
  { id: 'ir',            test_name: 'Insulation Resistance Test', standard_value: '> 200 MΩ @ 5kV', isCritical: true  },
  { id: 'continuity',    test_name: 'Continuity Test',            standard_value: '< 1 Ω',          isCritical: true  },
  { id: 'hv_hipot',      test_name: 'HV Test (Hi-Pot)',           standard_value: 'As per IS 7098',  isCritical: true  },
  { id: 'sheath',        test_name: 'Sheath Test',                standard_value: '> 1 MΩ',          isCritical: false },
  { id: 'phase_seq',     test_name: 'Phase Sequence Check',       standard_value: 'R-Y-B Correct',   isCritical: true  },
];

// ── Section 9: Approval Workflow ──────────────────────────────────────────────

export interface ApprovalRole {
  id: string;
  label: string;
  required: boolean;
}

export const APPROVAL_ROLES: ApprovalRole[] = [
  { id: 'site_engineer', label: 'Site Engineer',         required: true },
  { id: 'qa_qc',         label: 'QA/QC Engineer',        required: true },
  { id: 'client_rep',    label: 'Client Representative', required: true },
];
