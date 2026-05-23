import api from './api';
import type { AxiosResponse } from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HTPreCommissionFormData {
  // General
  project_name?: string;
  location: string;
  cable_id: string;
  voltage_level: '11kV' | '33kV' | '66kV';
  cable_type: 'XLPE' | 'PILC';
  inspection_date: string;
  contractor_name: string;

  // Dynamic tests/checklists serialized to backend flats + JSON
  checklists_json?: Record<string, any>; // {sectionId: {itemId: {status, remarks}}}
  tests_json?: Record<string, any>;     // {testId: {test_type, phase_r, phase_y, phase_b, result, remarks}}
  
  // Backend flat fields
  client_name?: string;
  date_of_test: string;
  make?: string;
  cable_rating?: string;
  before_r_e?: string;
  // ... other IR/HV fields as needed

  final_status?: 'READY FOR ENERGIZATION' | 'NOT READY';
  attachments?: string[]; // file urls
  status?: 'draft' | 'submitted' | 'approved';
}

export interface HTPreCommissionFormListResponse {
  id: string;
  client_name: string;
  location: string;
  date_of_test: string;
  final_status: string;
  created_at: string;
  created_by_username: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

const INSPECTION_API_BASE = '/api/inspection/';

export const inspectionService = {
  // HT Pre-Commission Forms (`ht-precommission-forms`)
  createHTPreCommissionForm: async (data: HTPreCommissionFormData): Promise<AxiosResponse> => {
    return api.post(`${INSPECTION_API_BASE}ht-precommission-forms/`, data);
  },

  getHTPreCommissionForms: async (params?: { project_id?: string; status?: string }): Promise<AxiosResponse<HTPreCommissionFormListResponse[]>> => {
    return api.get(`${INSPECTION_API_BASE}ht-precommission-forms/`, { params });
  },

  getHTPreCommissionForm: async (id: string): Promise<AxiosResponse<HTPreCommissionFormData>> => {
    return api.get(`${INSPECTION_API_BASE}ht-precommission-forms/${id}/`);
  },

  updateHTPreCommissionForm: async (id: string, data: Partial<HTPreCommissionFormData>): Promise<AxiosResponse> => {
    return api.patch(`${INSPECTION_API_BASE}ht-precommission-forms/${id}/`, data);
  },

  deleteHTPreCommissionForm: async (id: string): Promise<AxiosResponse> => {
    return api.delete(`${INSPECTION_API_BASE}ht-precommission-forms/${id}/`);
  },

  // Template variant if separate
  createHTPreCommissionTemplateForm: async (data: HTPreCommissionFormData): Promise<AxiosResponse> => {
    return api.post(`${INSPECTION_API_BASE}ht-precommission-template-forms/`, data);
  },
};

export default inspectionService;

