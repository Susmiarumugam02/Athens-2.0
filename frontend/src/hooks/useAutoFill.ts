/**
 * useAutoFill
 * Centralized auto-fill engine.
 * Consumes ConsideringParameters and applies field values to any Ant Design Form instance.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { FormInstance } from 'antd';
import type { ConsideringParameters, AutoFillResult } from './useConsideringParameters';

interface UseAutoFillOptions {
  form: FormInstance;
  parameters: ConsideringParameters;
  autoFillResult: AutoFillResult;
  /** Fields that should never be overwritten once the user has typed in them */
  protectedFields?: string[];
  /** Called after auto-fill is applied with the list of fields that were filled */
  onAutoFilled?: (fields: string[]) => void;
}

/**
 * Maps AutoFillResult keys to form field names per module.
 * Extend this map as new modules are added.
 */
const FIELD_MAP: Record<string, Record<string, string>> = {
  incident: {
    department: 'department',
    severity: 'severity_level',
    risk_score: 'probability_score',
    corrective_action: 'immediate_action_taken',
    ppe_requirements: 'potential_causes',
  },
  safety_observation: {
    department: 'department',
    severity: 'severity',
    corrective_action: 'correctivePreventiveAction',
    work_area: 'workLocation',
  },
  ptw: {
    department: 'department',
    ppe_requirements: 'ppe_requirements',
    corrective_action: 'control_measures',
    checklist: 'safety_checklist',
    risk_level: 'risk_level',
  },
  inspection: {
    department: 'department',
    inspection_template: 'inspection_type',
    work_area: 'location',
  },
  training: {
    department: 'department',
    training_type: 'training_type',
    work_area: 'location',
  },
  quality: {
    department: 'department',
    severity: 'severity',
    corrective_action: 'corrective_action',
    work_area: 'inspection_area',
  },
  task: {
    department: 'department',
    work_area: 'location',
  },
  tbt: {
    department: 'department',
    work_area: 'location',
    work_type: 'topic',
  },
};

export function useAutoFill({
  form,
  parameters,
  autoFillResult,
  protectedFields = [],
  onAutoFilled,
}: UseAutoFillOptions) {
  const appliedRef = useRef<Set<string>>(new Set());

  const applyAutoFill = useCallback(
    (module: string) => {
      const fieldMap = FIELD_MAP[module] || {};
      const filledFields: string[] = [];

      // Apply parameter values directly to matching form fields
      const paramFieldMap: Record<keyof ConsideringParameters, string> = {
        department: 'department',
        work_area: 'work_area',
        site: 'site',
        zone: 'zone',
        contractor: 'contractor',
        process_type: 'process_type',
        risk_category: 'risk_category',
        shift: 'shift',
        asset: 'asset',
        work_type: 'work_type',
        inspection_type: 'inspection_type',
        incident_type: 'incident_type',
        user_role: 'user_role',
        activity_category: 'activity_category',
        training_type: 'training_type',
      };

      const updates: Record<string, any> = {};

      // 1. Apply parameters to form fields
      for (const [paramKey, formField] of Object.entries(paramFieldMap)) {
        const value = parameters[paramKey as keyof ConsideringParameters];
        if (!value) continue;
        if (protectedFields.includes(formField)) continue;
        const currentValue = form.getFieldValue(formField);
        if (currentValue && appliedRef.current.has(formField)) continue; // user typed
        updates[formField] = value;
        filledFields.push(formField);
      }

      // 2. Apply auto-fill result to module-specific fields
      for (const [resultKey, formField] of Object.entries(fieldMap)) {
        const value = autoFillResult[resultKey];
        if (value === undefined || value === null) continue;
        if (protectedFields.includes(formField)) continue;
        const currentValue = form.getFieldValue(formField);
        if (currentValue && appliedRef.current.has(formField)) continue;
        updates[formField] = value;
        filledFields.push(formField);
      }

      if (Object.keys(updates).length > 0) {
        form.setFieldsValue(updates);
        onAutoFilled?.(filledFields);
      }
    },
    [form, parameters, autoFillResult, protectedFields, onAutoFilled],
  );

  // Track which fields the user has manually edited (protect them from overwrite)
  const markUserEdited = useCallback((fieldName: string) => {
    appliedRef.current.add(fieldName);
  }, []);

  const resetProtection = useCallback(() => {
    appliedRef.current.clear();
  }, []);

  return { applyAutoFill, markUserEdited, resetProtection };
}
