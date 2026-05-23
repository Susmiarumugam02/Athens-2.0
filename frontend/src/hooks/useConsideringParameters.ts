/**
 * useConsideringParameters
 * Central state for the "Considering Parameters" system.
 * Replaces the old "Project" concept with intelligent, dependency-aware parameters.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../lib/api';

export interface ConsideringParameters {
  department?: string;
  work_area?: string;
  site?: string;
  zone?: string;
  contractor?: string;
  process_type?: string;
  risk_category?: string;
  shift?: string;
  asset?: string;
  work_type?: string;
  inspection_type?: string;
  incident_type?: string;
  user_role?: string;
  activity_category?: string;
  training_type?: string;
}

export interface ParameterOptions {
  departments: string[];
  work_areas: string[];
  sites: string[];
  zones: string[];
  contractors: string[];
  process_types: string[];
  risk_categories: string[];
  shifts: string[];
  assets: string[];
  work_types: string[];
  inspection_types: string[];
  incident_types: string[];
  activity_categories: string[];
  training_types: string[];
}

export interface AutoFillResult {
  supervisor?: string;
  safety_rules?: string[];
  risk_level?: string;
  inspection_template?: string;
  ppe_requirements?: string[];
  corrective_action?: string;
  training_type?: string;
  asset_category?: string;
  severity?: string;
  category?: string;
  department?: string;
  risk_score?: number;
  checklist?: string[];
  hazards?: string[];
  [key: string]: any;
}

const MEMORY_KEY = 'athens-considering-parameters-memory';
const DEFAULTS_KEY = 'athens-considering-parameters-defaults';

function loadMemory(): ConsideringParameters {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMemory(params: ConsideringParameters) {
  try {
    localStorage.setItem(MEMORY_KEY, JSON.stringify(params));
  } catch {}
}

function loadDefaults(): ConsideringParameters {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function useConsideringParameters(module: string) {
  const [parameters, setParametersState] = useState<ConsideringParameters>(() => ({
    ...loadDefaults(),
    ...loadMemory(),
  }));
  const [options, setOptions] = useState<ParameterOptions>({
    departments: [],
    work_areas: [],
    sites: [],
    zones: [],
    contractors: [],
    process_types: [],
    risk_categories: [],
    shifts: [],
    assets: [],
    work_types: [],
    inspection_types: [],
    incident_types: [],
    activity_categories: [],
    training_types: [],
  });
  const [autoFillResult, setAutoFillResult] = useState<AutoFillResult>({});
  const [loading, setLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load parameter options from backend (with fallback)
  useEffect(() => {
    apiClient
      .get('/api/system/considering-parameters/', { params: { module } })
      .then((res) => {
        if (res.data?.options) setOptions(res.data.options);
      })
      .catch(() => {
        // Use static fallback options
        setOptions(STATIC_OPTIONS);
      });
  }, [module]);

  // Narrow available options based on current parameter selections
  const narrowedOptions = useCallback((): Partial<ParameterOptions> => {
    const narrowed: Partial<ParameterOptions> = { ...options };
    const { site, department } = parameters;

    // Site → narrows zones, contractors, assets
    if (site) {
      const siteMap = SITE_NARROWING[site];
      if (siteMap) {
        if (siteMap.zones) narrowed.zones = siteMap.zones;
        if (siteMap.contractors) narrowed.contractors = siteMap.contractors;
        if (siteMap.assets) narrowed.assets = siteMap.assets;
      }
    }

    // Department → narrows supervisors, inspection forms, training modules
    if (department) {
      const deptMap = DEPARTMENT_NARROWING[department];
      if (deptMap) {
        if (deptMap.inspection_types) narrowed.inspection_types = deptMap.inspection_types;
        if (deptMap.training_types) narrowed.training_types = deptMap.training_types;
        if (deptMap.work_types) narrowed.work_types = deptMap.work_types;
      }
    }

    return narrowed;
  }, [options, parameters]);

  const setParameters = useCallback((updates: Partial<ConsideringParameters>) => {
    setParametersState((prev) => {
      const next = { ...prev, ...updates };
      saveMemory(next);
      return next;
    });
  }, []);

  const resetParameters = useCallback(() => {
    setParametersState({});
    try { localStorage.removeItem(MEMORY_KEY); } catch {}
  }, []);

  const saveAsDefaults = useCallback(() => {
    try {
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify(parameters));
    } catch {}
  }, [parameters]);

  // Trigger auto-fill whenever parameters change
  useEffect(() => {
    const hasAny = Object.values(parameters).some(Boolean);
    if (!hasAny) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAutoFillLoading(true);
      try {
        const res = await apiClient.post('/api/system/considering-parameters/autofill/', {
          module,
          parameters,
        });
        setAutoFillResult(res.data || {});
      } catch {
        // Fallback: derive auto-fill from local rules
        setAutoFillResult(deriveLocalAutoFill(parameters));
      } finally {
        setAutoFillLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [parameters, module]);

  return {
    parameters,
    setParameters,
    resetParameters,
    saveAsDefaults,
    options: narrowedOptions(),
    autoFillResult,
    loading,
    autoFillLoading,
  };
}

// ─── Local fallback auto-fill rules ──────────────────────────────────────────

function deriveLocalAutoFill(params: ConsideringParameters): AutoFillResult {
  const result: AutoFillResult = {};
  const { department, work_area, risk_category, work_type } = params;

  if (department === 'Electrical') {
    result.ppe_requirements = ['Insulated gloves', 'Arc flash suit', 'Safety helmet', 'Safety shoes'];
    result.safety_rules = ['Apply LOTO before work', 'Verify de-energisation', 'Use insulated tools'];
    result.risk_level = 'High';
    result.inspection_template = 'Electrical Safety Checklist';
    result.hazards = ['Electrical shock', 'Arc flash', 'Live equipment'];
  } else if (department === 'Civil') {
    result.ppe_requirements = ['Safety helmet', 'Safety harness', 'Safety shoes', 'High-vis vest'];
    result.safety_rules = ['Inspect scaffold before use', 'Barricade excavation', 'Verify fall protection'];
    result.risk_level = 'High';
    result.inspection_template = 'Civil Works Checklist';
    result.hazards = ['Fall from height', 'Falling objects', 'Excavation collapse'];
  } else if (department === 'Mechanical') {
    result.ppe_requirements = ['Safety helmet', 'Safety gloves', 'Safety shoes', 'Goggles'];
    result.safety_rules = ['LOTO for rotating equipment', 'Verify pressure relief', 'Inspect tools'];
    result.risk_level = 'Medium';
    result.inspection_template = 'Mechanical Maintenance Checklist';
    result.hazards = ['Caught in machinery', 'Stored energy', 'Pressure hazard'];
  } else if (department === 'Operations') {
    result.ppe_requirements = ['Safety helmet', 'Safety shoes', 'High-vis vest'];
    result.safety_rules = ['Follow SOP', 'Verify process parameters', 'Report deviations'];
    result.risk_level = 'Medium';
    result.inspection_template = 'Operations Checklist';
  }

  if (risk_category === 'High' || risk_category === 'Critical') {
    result.risk_score = 80;
    result.severity = 'high';
    result.corrective_action = 'Stop work immediately, isolate hazard, notify supervisor, conduct risk assessment before resuming.';
  } else if (risk_category === 'Medium') {
    result.risk_score = 50;
    result.severity = 'medium';
    result.corrective_action = 'Implement additional controls, monitor closely, review before next shift.';
  } else {
    result.risk_score = 20;
    result.severity = 'low';
  }

  if (work_type === 'Hot Work') {
    result.checklist = ['Fire watch assigned', 'Combustibles removed 35ft', 'Fire extinguisher available', 'Hot work permit displayed', 'Atmospheric testing done'];
    result.ppe_requirements = [...(result.ppe_requirements || []), 'Fire-resistant coveralls', 'Welding shield'];
  } else if (work_type === 'Confined Space') {
    result.checklist = ['Atmospheric testing done', 'Continuous gas monitoring', 'Ventilation operating', 'Entry supervisor assigned', 'Rescue team on standby'];
  } else if (work_type === 'Work at Height') {
    result.checklist = ['Fall protection in place', 'Guardrails installed', 'Weather acceptable', 'Rescue plan established', 'Exclusion zone below'];
  }

  if (work_area) {
    result.asset_category = work_area;
  }

  return result;
}

// ─── Static fallback options ──────────────────────────────────────────────────

const STATIC_OPTIONS: ParameterOptions = {
  departments: ['Quality', 'Electrical', 'Civil'],
  work_areas: ['Electrical Room', 'Main Walkway', 'Stores Area', 'Switchyard', 'Panel Room', 'Work at Height Platform', 'Material Storage Yard', 'Workshop', 'Pump Room', 'Substation Area', 'Control Room', 'Site Office'],
  sites: ['Chennai Plant', 'Mumbai Site', 'Delhi Office', 'Bangalore Facility', 'Hyderabad Plant'],
  zones: ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Restricted Zone', 'Safe Zone'],
  contractors: ['Athena Constructions Pvt Ltd', 'ABC Engineering Services', 'Sri Balaji Contractors', 'TechBuild Infra Pvt Ltd', 'Global Industrial Solutions'],
  process_types: ['Maintenance', 'Construction', 'Inspection', 'Testing', 'Commissioning', 'Decommissioning', 'Shutdown'],
  risk_categories: ['Low', 'Medium', 'High', 'Critical'],
  shifts: ['Day Shift', 'Night Shift', 'General Shift', 'Rotational'],
  assets: ['Transformer', 'Generator', 'Pump', 'Compressor', 'Crane', 'Forklift', 'Conveyor', 'Boiler', 'Reactor', 'Tank'],
  work_types: ['Hot Work', 'Cold Work', 'Confined Space', 'Work at Height', 'Electrical Work', 'Excavation', 'Chemical Handling', 'Crane Lifting'],
  inspection_types: ['Safety Inspection', 'Quality Inspection', 'Electrical Inspection', 'Mechanical Inspection', 'Fire Safety Inspection', 'Environmental Inspection'],
  incident_types: ['Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Fire', 'Spill', 'Equipment Damage'],
  activity_categories: ['Routine Maintenance', 'Breakdown Maintenance', 'Preventive Maintenance', 'Project Work', 'Commissioning', 'Testing'],
  training_types: ['Induction Training', 'Safety Training', 'PTW Training', 'Toolbox Talk', 'Job Training', 'Emergency Response', 'First Aid'],
};

// ─── Site-based narrowing rules ───────────────────────────────────────────────

const SITE_NARROWING: Record<string, Partial<ParameterOptions>> = {
  'Chennai Plant': {
    zones: ['Zone A - Production', 'Zone B - Utilities', 'Zone C - Warehouse', 'Zone D - Admin'],
    contractors: ['Athena Constructions Pvt Ltd', 'Sri Balaji Contractors', 'TechBuild Infra Pvt Ltd'],
    assets: ['Transformer T1', 'Generator G1', 'Pump P1', 'Compressor C1', 'Crane CR1'],
  },
  'Mumbai Site': {
    zones: ['North Block', 'South Block', 'East Wing', 'West Wing'],
    contractors: ['ABC Engineering Services', 'Global Industrial Solutions'],
    assets: ['Boiler B1', 'Reactor R1', 'Tank TK1', 'Conveyor CV1'],
  },
};

// ─── Department-based narrowing rules ────────────────────────────────────────

const DEPARTMENT_NARROWING: Record<string, Partial<ParameterOptions>> = {
  Electrical: {
    inspection_types: ['Electrical Inspection', 'Safety Inspection', 'Fire Safety Inspection'],
    training_types: ['Electrical Safety Training', 'PTW Training', 'Induction Training'],
    work_types: ['Electrical Work', 'Hot Work', 'Cold Work'],
  },
  Civil: {
    inspection_types: ['Safety Inspection', 'Quality Inspection', 'Environmental Inspection'],
    training_types: ['Work at Height Training', 'Induction Training', 'Safety Training'],
    work_types: ['Work at Height', 'Excavation', 'Cold Work', 'Confined Space'],
  },
  Quality: {
    inspection_types: ['Quality Inspection', 'Safety Inspection', 'Environmental Inspection'],
    training_types: ['Quality Training', 'Induction Training', 'Safety Training'],
    work_types: ['Cold Work', 'Inspection', 'Testing', 'Commissioning'],
  },
};
