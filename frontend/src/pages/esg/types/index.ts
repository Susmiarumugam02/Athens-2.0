export interface EnvironmentAspect {
  id?: number;
  aspect_type: string;
  description: string;
  severity: number;
  likelihood: number;
  significance?: number;
  controls: string[];
  site?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GenerationData {
  id?: number;
  asset_id: string;
  asset_type: string;
  timestamp: string;
  kwh: number;
  source_tag?: string;
  imported_via?: string;
  site?: number;
  created_at?: string;
}

export interface GHGActivity {
  id?: number;
  period_start: string;
  period_end: string;
  category_scope: string;
  activity_type: string;
  quantity: number;
  uom: string;
  emission_factor: number;
  emission_factor_name?: string;
  ghg_co2e?: number;
  evidence_ids: string[];
  site?: number;
  created_by?: number;
  created_at?: string;
}

export interface WasteManifest {
  id?: number;
  waste_type: string;
  quantity: number;
  uom: string;
  stored_since: string;
  transporter?: number;
  transporter_name?: string;
  tsdf_id: string;
  manifest_docs: string[];
  status: string;
  site?: number;
  created_by?: number;
  created_at?: string;
}

export interface BiodiversityEvent {
  id?: number;
  species: string;
  date: string;
  time: string;
  location_geo: string;
  severity: number;
  actions_taken: string;
  related_incident?: number;
  related_incident_id?: string;
  site?: number;
  created_by?: number;
  created_at?: string;
}

export interface ESGPolicy {
  id?: number;
  title: string;
  version: string;
  effective_date: string;
  status: string;
  document?: File | string;
  mapped_iso_clauses: string[];
  created_by?: number;
  created_at?: string;
}

export interface Grievance {
  id?: number;
  source: string;
  type: string;
  description: string;
  anonymous_flag: boolean;
  assigned_to?: number;
  assigned_to_name?: string;
  status: string;
  resolution_date?: string;
  evidence_ids: string[];
  site?: number;
  created_at?: string;
}

export interface EmissionFactor {
  id?: number;
  source: string;
  factor_value: number;
  unit: string;
  scope: string;
  last_updated?: string;
  is_active: boolean;
}

export interface ESGDashboardData {
  today_generation: number;
  month_generation: number;
  asset_breakdown: Array<{
    asset_type: string;
    total: number;
    count: number;
  }>;
  scope_breakdown: Array<{
    category_scope: string;
    total_co2e: number;
  }>;
  monthly_trend: Array<{
    month: string;
    total_co2e: number;
  }>;
}

// === ADVANCED ENVIRONMENTAL INTERFACES ===

export interface EnvironmentalMonitoring {
  id?: number;
  parameter: string;
  measurement_date: string;
  value: number;
  unit: string;
  monitoring_station: string;
  gps_coordinates?: string;
  weather_conditions?: Record<string, any>;
  regulatory_limit?: number;
  compliance_status?: string;
  measurement_method: string;
  equipment_used: string;
  calibration_date?: string;
  site?: number;
  created_by?: number;
  created_at?: string;
}

export interface CarbonFootprint {
  id?: number;
  reporting_period_start: string;
  reporting_period_end: string;
  scope: string;
  category: string;
  activity_description: string;
  activity_amount: number;
  activity_unit: string;
  emission_factor: number;
  emission_factor_source: string;
  emission_factor_unit: string;
  co2_equivalent_tonnes?: number;
  uncertainty_percentage?: number;
  verified?: boolean;
  verification_body?: string;
  verification_date?: string;
  site?: number;
  created_by?: number;
  created_at?: string;
}

export interface SustainabilityTarget {
  id?: number;
  category: string;
  target_name: string;
  description: string;
  baseline_value: number;
  target_value: number;
  current_value?: number;
  unit_of_measure: string;
  baseline_year: number;
  target_year: number;
  progress_percentage?: number;
  on_track?: boolean;
  sdg_alignment?: string[];
  paris_agreement_aligned?: boolean;
  site?: number;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}