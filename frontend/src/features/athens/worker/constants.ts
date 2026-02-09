// Department and Designation constants for Worker management

export const DEPARTMENTS = [
  { value: 'Production / Manufacturing', label: 'Production / Manufacturing' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Quality Control / Quality Assurance (QC/QA)', label: 'Quality Control / Quality Assurance (QC/QA)' },
  { value: 'EHS (Environment, Health & Safety)', label: 'EHS (Environment, Health & Safety)' },
  { value: 'Utilities & Facility Management', label: 'Utilities & Facility Management' },
  { value: 'Research & Development / Design & Engineering', label: 'Research & Development / Design & Engineering' },
  { value: 'Packaging & Labeling', label: 'Packaging & Labeling' },
  { value: 'Logistics / Stores / Supply Chain', label: 'Logistics / Stores / Supply Chain' },
  { value: 'Fire Safety & Emergency Response', label: 'Fire Safety & Emergency Response' },
  { value: 'HR & Administration', label: 'HR & Administration' },
];

export const DESIGNATIONS_BY_DEPARTMENT = {
  'Production / Manufacturing': [
    { value: 'Production Manager', label: 'Production Manager' },
    { value: 'Production Supervisor / Shift In-charge', label: 'Production Supervisor / Shift In-charge' },
    { value: 'Line Leader / Assembly Line Leader', label: 'Line Leader / Assembly Line Leader' },
    { value: 'Machine Operator', label: 'Machine Operator' },
    { value: 'Assembly Technician / Production Helper', label: 'Assembly Technician / Production Helper' },
    { value: 'Batch Maker / Process Operator', label: 'Batch Maker / Process Operator' },
  ],
  'Maintenance': [
    { value: 'Maintenance Manager', label: 'Maintenance Manager' },
    { value: 'Mechanical Maintenance Engineer / Technician', label: 'Mechanical Maintenance Engineer / Technician' },
    { value: 'Electrical Maintenance Engineer / Technician', label: 'Electrical Maintenance Engineer / Technician' },
    { value: 'Utility Maintenance Technician', label: 'Utility Maintenance Technician' },
    { value: 'Preventive Maintenance Planner', label: 'Preventive Maintenance Planner' },
  ],
  'Quality Control / Quality Assurance (QC/QA)': [
    { value: 'QA/QC Manager', label: 'QA/QC Manager' },
    { value: 'QA/QC Engineer', label: 'QA/QC Engineer' },
    { value: 'Quality Inspector', label: 'Quality Inspector' },
    { value: 'Lab Analyst / QC Chemist / Microbiologist', label: 'Lab Analyst / QC Chemist / Microbiologist' },
    { value: 'Calibration Technician', label: 'Calibration Technician' },
  ],
  'EHS (Environment, Health & Safety)': [
    { value: 'EHS Manager / HSE Lead', label: 'EHS Manager / HSE Lead' },
    { value: 'Safety Officer', label: 'Safety Officer' },
    { value: 'Environmental Engineer / Compliance Officer', label: 'Environmental Engineer / Compliance Officer' },
    { value: 'Fire Safety Officer / Fire & Emergency Coordinator', label: 'Fire Safety Officer / Fire & Emergency Coordinator' },
    { value: 'Chemical Safety Officer / Waste Management Officer', label: 'Chemical Safety Officer / Waste Management Officer' },
    { value: 'PPE Compliance Checker', label: 'PPE Compliance Checker' },
  ],
  'Utilities & Facility Management': [
    { value: 'Utility Manager', label: 'Utility Manager' },
    { value: 'Boiler Operator', label: 'Boiler Operator' },
    { value: 'Chiller / Compressor / HVAC Technician', label: 'Chiller / Compressor / HVAC Technician' },
    { value: 'Water Treatment Plant (WTP/ETP) Operator', label: 'Water Treatment Plant (WTP/ETP) Operator' },
    { value: 'Electrical Technician (Facility)', label: 'Electrical Technician (Facility)' },
  ],
  'Research & Development / Design & Engineering': [
    { value: 'R&D Manager', label: 'R&D Manager' },
    { value: 'Design Engineer / CAD Engineer', label: 'Design Engineer / CAD Engineer' },
    { value: 'Product Development Engineer', label: 'Product Development Engineer' },
    { value: 'Testing / Prototype Engineer', label: 'Testing / Prototype Engineer' },
    { value: 'Firmware / Hardware Engineer (Electronics)', label: 'Firmware / Hardware Engineer (Electronics)' },
  ],
  'Packaging & Labeling': [
    { value: 'Packaging Manager', label: 'Packaging Manager' },
    { value: 'Packing Supervisor', label: 'Packing Supervisor' },
    { value: 'Machine Operator – Packing', label: 'Machine Operator – Packing' },
    { value: 'Labeling & Coding Technician', label: 'Labeling & Coding Technician' },
    { value: 'Artwork Coordinator', label: 'Artwork Coordinator' },
  ],
  'Logistics / Stores / Supply Chain': [
    { value: 'Supply Chain Manager', label: 'Supply Chain Manager' },
    { value: 'Logistics Coordinator', label: 'Logistics Coordinator' },
    { value: 'Store Keeper / Inventory Controller', label: 'Store Keeper / Inventory Controller' },
    { value: 'Warehouse In-charge / Assistant', label: 'Warehouse In-charge / Assistant' },
    { value: 'Material Handler / Forklift Operator', label: 'Material Handler / Forklift Operator' },
  ],
  'Fire Safety & Emergency Response': [
    { value: 'Fire Safety In-charge', label: 'Fire Safety In-charge' },
    { value: 'Emergency Response Technician / Fireman', label: 'Emergency Response Technician / Fireman' },
    { value: 'Fire Drill / Rescue Coordinator', label: 'Fire Drill / Rescue Coordinator' },
    { value: 'First Aider', label: 'First Aider' },
    { value: 'Extinguisher / Alarm Technician', label: 'Extinguisher / Alarm Technician' },
  ],
  'HR & Administration': [
    { value: 'HR Manager / HR Executive', label: 'HR Manager / HR Executive' },
    { value: 'Admin Officer', label: 'Admin Officer' },
    { value: 'Training & Development Coordinator', label: 'Training & Development Coordinator' },
    { value: 'Time Office In-charge / Attendance Clerk', label: 'Time Office In-charge / Attendance Clerk' },
    { value: 'Worker Welfare / Compliance Officer', label: 'Worker Welfare / Compliance Officer' },
  ],
};

// All designations in a flat array for general use
export const ALL_DESIGNATIONS = Object.values(DESIGNATIONS_BY_DEPARTMENT).flat();
