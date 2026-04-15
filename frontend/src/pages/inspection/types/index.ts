export interface Inspection {
  id: string;
  project: string;
  inspection_type: 'safety' | 'quality' | 'environmental' | 'equipment' | 'housekeeping' | 'fire_safety' | 'electrical' | 'structural';
  title: string;
  description: string;
  location: string;
  scheduled_date: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  inspector: string;
  inspector_name: string;
  created_by: string;
  created_by_name: string;
  project_name: string;
  created_at: string;
  updated_at: string;
}

export interface InspectionItem {
  id: string;
  inspection: string;
  item_number: string;
  description: string;
  requirement: string;
  compliance_status: 'compliant' | 'non_compliant' | 'not_applicable' | 'observation';
  findings: string;
  recommendations: string;
  photo?: string;
  created_at: string;
}

export interface InspectionReport {
  id: string;
  inspection: string;
  inspection_title: string;
  inspection_type: string;
  inspector_name: string;
  summary: string;
  total_items: number;
  compliant_items: number;
  non_compliant_items: number;
  observations: number;
  overall_score: number;
  recommendations: string;
  inspector_signature: string;
  report_date: string;
  status: string;
  type: string;
  title: string;
  created_at: string;
}