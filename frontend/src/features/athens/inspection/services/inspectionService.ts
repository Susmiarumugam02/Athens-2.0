import api from '@common/utils/axiosetup';
import type { Inspection, InspectionItem, InspectionReport } from '../types';

export const inspectionService = {
  // Inspection CRUD operations
  getInspections: (params?: { project_id?: string; status?: string; type?: string; search?: string }) => 
    api.get<{ results: Inspection[] }>('/api/v1/inspection/inspections/', { params }),
  
  getInspection: (id: string) => 
    api.get<Inspection>(`/api/v1/inspection/inspections/${id}/`),
  
  createInspection: (data: Partial<Inspection>) => 
    api.post<Inspection>('/api/v1/inspection/inspections/', data),
  
  updateInspection: (id: string, data: Partial<Inspection>) => 
    api.put<Inspection>(`/api/v1/inspection/inspections/${id}/`, data),
  
  deleteInspection: (id: string) => 
    api.delete(`/api/v1/inspection/inspections/${id}/`),
  
  startInspection: (id: string) => 
    api.post(`/api/v1/inspection/inspections/${id}/start_inspection/`),
  
  completeInspection: (id: string) => 
    api.post(`/api/v1/inspection/inspections/${id}/complete_inspection/`),

  // Inspection Items
  getInspectionItems: (inspectionId: string) => 
    api.get<{ results: InspectionItem[] }>('/api/v1/inspection/inspection-items/', { 
      params: { inspection_id: inspectionId } 
    }),
  
  createInspectionItem: (data: Partial<InspectionItem>) => 
    api.post<InspectionItem>('/api/v1/inspection/inspection-items/', data),
  
  updateInspectionItem: (id: string, data: Partial<InspectionItem>) => 
    api.put<InspectionItem>(`/api/v1/inspection/inspection-items/${id}/`, data),
  
  deleteInspectionItem: (id: string) => 
    api.delete(`/api/v1/inspection/inspection-items/${id}/`),

  // Inspection Reports
  getInspectionReports: () => 
    api.get<{ results: InspectionReport[] }>('/api/v1/inspection/inspection-reports/'),
  
  getInspectionReport: (id: string) => 
    api.get<InspectionReport>(`/api/v1/inspection/inspection-reports/${id}/`),

  // AC Cable Forms
  getACCableForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/ac-cable-forms/'),
  
  createACCableForm: (data: any) => 
    api.post('/api/v1/inspection/ac-cable-forms/', data),
  
  getACCableForm: (id: string) => 
    api.get(`/api/v1/inspection/ac-cable-forms/${id}/`),
  
  updateACCableForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/ac-cable-forms/${id}/`, data),
  
  deleteACCableForm: (id: string) => 
    api.delete(`/api/v1/inspection/ac-cable-forms/${id}/`),

  // ACDB Checklist Forms
  getACDBChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/acdb-checklist-forms/'),
  
  createACDBChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/acdb-checklist-forms/', data),
  
  getACDBChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/acdb-checklist-forms/${id}/`),
  
  updateACDBChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/acdb-checklist-forms/${id}/`, data),
  
  deleteACDBChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/acdb-checklist-forms/${id}/`),

  // HT Cable Forms
  getHTCableForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/ht-cable-forms/'),
  
  createHTCableForm: (data: any) => 
    api.post('/api/v1/inspection/ht-cable-forms/', data),
  
  getHTCableForm: (id: string) => 
    api.get(`/api/v1/inspection/ht-cable-forms/${id}/`),
  
  updateHTCableForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/ht-cable-forms/${id}/`, data),
  
  deleteHTCableForm: (id: string) => 
    api.delete(`/api/v1/inspection/ht-cable-forms/${id}/`),

  // HT Pre-Commission Forms
  getHTPreCommissionForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/ht-precommission-forms/'),
  
  createHTPreCommissionForm: (data: any) => 
    api.post('/api/v1/inspection/ht-precommission-forms/', data),
  
  getHTPreCommissionForm: (id: string) => 
    api.get(`/api/v1/inspection/ht-precommission-forms/${id}/`),
  
  updateHTPreCommissionForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/ht-precommission-forms/${id}/`, data),
  
  deleteHTPreCommissionForm: (id: string) => 
    api.delete(`/api/v1/inspection/ht-precommission-forms/${id}/`),

  // HT Pre-Commission Template Forms
  getHTPreCommissionTemplateForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/ht-precommission-template-forms/'),
  
  createHTPreCommissionTemplateForm: (data: any) => 
    api.post('/api/v1/inspection/ht-precommission-template-forms/', data),
  
  getHTPreCommissionTemplateForm: (id: string) => 
    api.get(`/api/v1/inspection/ht-precommission-template-forms/${id}/`),
  
  updateHTPreCommissionTemplateForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/ht-precommission-template-forms/${id}/`, data),
  
  deleteHTPreCommissionTemplateForm: (id: string) => 
    api.delete(`/api/v1/inspection/ht-precommission-template-forms/${id}/`),

  // Civil Work Checklist Forms
  getCivilWorkChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/civil-work-checklist-forms/'),
  
  createCivilWorkChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/civil-work-checklist-forms/', data),
  
  getCivilWorkChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/civil-work-checklist-forms/${id}/`),
  
  updateCivilWorkChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/civil-work-checklist-forms/${id}/`, data),
  
  deleteCivilWorkChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/civil-work-checklist-forms/${id}/`),

  // Cement Register Forms
  getCementRegisterForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/cement-register-forms/'),
  
  createCementRegisterForm: (data: any) => 
    api.post('/api/v1/inspection/cement-register-forms/', data),
  
  getCementRegisterForm: (id: string) => 
    api.get(`/api/v1/inspection/cement-register-forms/${id}/`),
  
  updateCementRegisterForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/cement-register-forms/${id}/`, data),
  
  deleteCementRegisterForm: (id: string) => 
    api.delete(`/api/v1/inspection/cement-register-forms/${id}/`),

  // Concrete Pour Card Forms
  getConcretePourCardForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/concrete-pour-card-forms/'),
  
  createConcretePourCardForm: (data: any) => 
    api.post('/api/v1/inspection/concrete-pour-card-forms/', data),
  
  getConcretePourCardForm: (id: string) => 
    api.get(`/api/v1/inspection/concrete-pour-card-forms/${id}/`),
  
  updateConcretePourCardForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/concrete-pour-card-forms/${id}/`, data),
  
  deleteConcretePourCardForm: (id: string) => 
    api.delete(`/api/v1/inspection/concrete-pour-card-forms/${id}/`),

  // PCC Checklist Forms
  getPCCChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/pcc-checklist-forms/'),
  
  createPCCChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/pcc-checklist-forms/', data),
  
  getPCCChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/pcc-checklist-forms/${id}/`),
  
  updatePCCChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/pcc-checklist-forms/${id}/`, data),
  
  deletePCCChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/pcc-checklist-forms/${id}/`),

  // Bar Bending Schedule Forms
  getBarBendingScheduleForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/bar-bending-schedule-forms/'),
  
  createBarBendingScheduleForm: (data: any) => 
    api.post('/api/v1/inspection/bar-bending-schedule-forms/', data),
  
  getBarBendingScheduleForm: (id: string) => 
    api.get(`/api/v1/inspection/bar-bending-schedule-forms/${id}/`),
  
  updateBarBendingScheduleForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/bar-bending-schedule-forms/${id}/`, data),
  
  deleteBarBendingScheduleForm: (id: string) => 
    api.delete(`/api/v1/inspection/bar-bending-schedule-forms/${id}/`),

  // Battery Charger Checklist Forms
  getBatteryChargerChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/battery-charger-checklist-forms/'),
  
  createBatteryChargerChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/battery-charger-checklist-forms/', data),
  
  getBatteryChargerChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/battery-charger-checklist-forms/${id}/`),
  
  updateBatteryChargerChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/battery-charger-checklist-forms/${id}/`, data),
  
  deleteBatteryChargerChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/battery-charger-checklist-forms/${id}/`),

  // Battery UPS Checklist Forms
  getBatteryUPSChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/battery-ups-checklist-forms/'),
  
  createBatteryUPSChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/battery-ups-checklist-forms/', data),
  
  getBatteryUPSChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/battery-ups-checklist-forms/${id}/`),
  
  updateBatteryUPSChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/battery-ups-checklist-forms/${id}/`, data),
  
  deleteBatteryUPSChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/battery-ups-checklist-forms/${id}/`),

  // Bus Duct Checklist Forms
  getBusDuctChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/bus-duct-checklist-forms/'),
  
  createBusDuctChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/bus-duct-checklist-forms/', data),
  
  getBusDuctChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/bus-duct-checklist-forms/${id}/`),
  
  updateBusDuctChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/bus-duct-checklist-forms/${id}/`, data),
  
  deleteBusDuctChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/bus-duct-checklist-forms/${id}/`),

  // Control Cable Checklist Forms
  getControlCableChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/control-cable-checklist-forms/'),
  
  createControlCableChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/control-cable-checklist-forms/', data),
  
  getControlCableChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/control-cable-checklist-forms/${id}/`),
  
  updateControlCableChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/control-cable-checklist-forms/${id}/`, data),
  
  deleteControlCableChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/control-cable-checklist-forms/${id}/`),

  // Control Room Audit Checklist Forms
  getControlRoomAuditChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/control-room-audit-checklist-forms/'),
  
  createControlRoomAuditChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/control-room-audit-checklist-forms/', data),
  
  getControlRoomAuditChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/control-room-audit-checklist-forms/${id}/`),
  
  updateControlRoomAuditChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/control-room-audit-checklist-forms/${id}/`, data),
  
  deleteControlRoomAuditChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/control-room-audit-checklist-forms/${id}/`),

  // Earthing Checklist Forms
  getEarthingChecklistForms: () => 
    api.get<{ results: any[] }>('/api/v1/inspection/earthing-checklist-forms/'),
  
  createEarthingChecklistForm: (data: any) => 
    api.post('/api/v1/inspection/earthing-checklist-forms/', data),
  
  getEarthingChecklistForm: (id: string) => 
    api.get(`/api/v1/inspection/earthing-checklist-forms/${id}/`),
  
  updateEarthingChecklistForm: (id: string, data: any) => 
    api.put(`/api/v1/inspection/earthing-checklist-forms/${id}/`, data),
  
  deleteEarthingChecklistForm: (id: string) => 
    api.delete(`/api/v1/inspection/earthing-checklist-forms/${id}/`),
};