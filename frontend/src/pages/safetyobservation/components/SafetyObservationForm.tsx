import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Form, Input, Button, DatePicker, TimePicker, Select, Upload, App, Card, Divider, Row, Col, Alert, AutoComplete, Badge, Progress, Space, Tag, Tooltip, Typography } from 'antd';
import { AudioOutlined, BulbOutlined, CameraOutlined, DeleteOutlined, RobotOutlined, SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import api from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import { analyzeSafetyImage, getSafetyRecommendations, predictIncidents, translateVoice } from '../../../services/aiService';
import dayjs from 'dayjs';
import { useConsideringParameters } from '../../../hooks/useConsideringParameters';
import { useAutoFill } from '../../../hooks/useAutoFill';
import ConsideringParametersPanel from '../../../components/ConsideringParametersPanel';
import SmartRecommendationPanel from '../../../components/SmartRecommendationPanel';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// EXACT BACKEND MODEL CHOICES - PERFECTLY ALIGNED
const observationTypeOptions = [
  { value: 'unsafe_act', label: 'Unsafe Act' },
  { value: 'unsafe_condition', label: 'Unsafe Condition' },
  { value: 'safe_act', label: 'Safe Act' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'at_risk_behavior', label: 'At-Risk Behavior' },
  { value: 'improvement_opportunity', label: 'Improvement Opportunity' },
  { value: 'repeat_observation', label: 'Repeat Observation' },
  { value: 'ppe_non_compliance', label: 'PPE Non-Compliance' },
  { value: 'violation_procedure', label: 'Violation of Procedure/Permit' },
  { value: 'training_need', label: 'Training Need to be Identified' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
];

const classificationOptions = [
  { value: 'ppe_compliance', label: 'PPE - Personal Protective Equipment' },
  { value: 'procedure_deviation', label: 'Procedure Deviation' },
  { value: 'emergency_preparedness', label: 'Emergency Preparedness' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'access_egress', label: 'Access Egress' },
  { value: 'barricade', label: 'Barricade' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'material_handling', label: 'Material Handling' },
  { value: 'work_at_height', label: 'Work at Height' },
  { value: 'environment_hygiene', label: 'Environment & Hygiene' },
  { value: 'permit', label: 'Permit' },
  { value: 'civil', label: 'Civil' },
  { value: 'chemical_exposure', label: 'Chemical Exposure' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'machinery_equipment', label: 'Machinery & Equipment' },
];

const severityOptions = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
];

const likelihoodOptions = [
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Possible' },
  { value: 3, label: 'Likely' },
  { value: 4, label: 'Certain' },
];

const observationStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const departmentOptions = ['Electrical', 'Civil', 'Mechanical', 'Stores'];

const quickTemplates = [
  {
    label: 'Electrical Unsafe Condition',
    values: {
      department: 'Electrical',
      activityPerforming: 'Electrical inspection',
      workLocation: 'Electrical room',
      typeOfObservation: 'unsafe_condition',
      classification: 'electrical',
      safetyObservationFound: 'Unsafe electrical condition observed near the work area.',
      correctivePreventiveAction: 'Isolate the area, inform electrical supervisor, verify LOTO, and rectify before work continues.',
      severity: 4,
      likelihood: 3,
    },
  },
  {
    label: 'Work at Height',
    values: {
      department: 'Civil',
      activityPerforming: 'Work at height activity',
      typeOfObservation: 'unsafe_act',
      classification: 'work_at_height',
      safetyObservationFound: 'Unsafe work at height practice observed without adequate fall protection.',
      correctivePreventiveAction: 'Stop work, provide full body harness with lifeline, barricade below area, and conduct toolbox talk.',
      severity: 4,
      likelihood: 3,
    },
  },
  {
    label: 'Housekeeping',
    values: {
      department: 'Stores',
      activityPerforming: 'Material movement',
      typeOfObservation: 'unsafe_condition',
      classification: 'housekeeping',
      safetyObservationFound: 'Poor housekeeping observed with materials obstructing access.',
      correctivePreventiveAction: 'Clear access path, stack materials safely, display warning signage, and assign housekeeping owner.',
      severity: 2,
      likelihood: 3,
    },
  },
  {
    label: 'PPE Non-Compliance',
    values: {
      typeOfObservation: 'ppe_non_compliance',
      classification: 'ppe_compliance',
      safetyObservationFound: 'Personnel observed working without required PPE.',
      correctivePreventiveAction: 'Stop activity, provide correct PPE, brief worker on PPE requirements, and supervisor to monitor compliance.',
      severity: 3,
      likelihood: 3,
    },
  },
];

const keywordRules = [
  {
    keys: ['electrical', 'cable', 'panel', 'shock', 'switchgear', 'energized'],
    classification: 'electrical',
    typeOfObservation: 'unsafe_condition',
    severity: 4,
    likelihood: 3,
    recommendations: ['Apply LOTO before intervention', 'Use insulated tools and arc-rated PPE', 'Barricade electrical panel area', 'Escalate to electrical supervisor'],
    correctiveAction: 'Isolate power source, apply LOTO, barricade the area, and allow only authorized electrical personnel to rectify.',
  },
  {
    keys: ['ladder', 'scaffold', 'height', 'edge', 'fall'],
    classification: 'work_at_height',
    typeOfObservation: 'unsafe_act',
    severity: 4,
    likelihood: 3,
    recommendations: ['Use full body harness with lifeline', 'Inspect ladder or scaffold tag', 'Barricade drop zone', 'Conduct work at height toolbox talk'],
    correctiveAction: 'Stop work, inspect access equipment, ensure fall protection, and brief the work crew before restarting.',
  },
  {
    keys: ['oil', 'spill', 'leak', 'slippery', 'walkway'],
    classification: 'housekeeping',
    typeOfObservation: 'unsafe_condition',
    severity: 3,
    likelihood: 4,
    recommendations: ['Barricade spill area', 'Use spill kit and dispose waste correctly', 'Place warning signage', 'Verify walkway is dry before reopening'],
    correctiveAction: 'Barricade the spill, clean with approved spill kit, display warning signage, and inspect for source of leakage.',
  },
  {
    keys: ['ppe', 'helmet', 'gloves', 'goggles', 'mask', 'shoe'],
    classification: 'ppe_compliance',
    typeOfObservation: 'ppe_non_compliance',
    severity: 3,
    likelihood: 3,
    recommendations: ['Provide task-specific PPE', 'Coach worker immediately', 'Supervisor to verify PPE compliance', 'Record repeated PPE non-compliance for training'],
    correctiveAction: 'Stop the task until required PPE is worn, brief the worker, and monitor compliance at the location.',
  },
  {
    keys: ['fire', 'spark', 'welding', 'hot work', 'gas cylinder'],
    classification: 'fire_safety',
    typeOfObservation: 'unsafe_condition',
    severity: 4,
    likelihood: 3,
    recommendations: ['Keep fire extinguisher nearby', 'Assign fire watch', 'Remove combustible materials', 'Verify hot work permit controls'],
    correctiveAction: 'Remove ignition and combustible risks, arrange fire watch and extinguisher, and verify hot work controls.',
  },
  {
    keys: ['chemical', 'solvent', 'acid', 'fume', 'exposure'],
    classification: 'chemical_exposure',
    typeOfObservation: 'unsafe_condition',
    severity: 4,
    likelihood: 2,
    recommendations: ['Refer SDS before handling', 'Use chemical-resistant PPE', 'Improve ventilation', 'Prepare spill response material'],
    correctiveAction: 'Stop handling, review SDS, provide chemical PPE, ventilate area, and prepare spill response kit.',
  },
];

const activitySuggestions = ['Electrical maintenance', 'Electrical inspection', 'Electrical panel servicing', 'Cable laying', 'Scaffold erection', 'Work at height activity', 'Material handling', 'Welding and hot work', 'Housekeeping inspection', 'Civil concreting', 'Mechanical maintenance'];
const locationSuggestions = ['Electrical room', 'Main walkway', 'Stores area', 'Switchyard', 'Panel room', 'Work at height platform', 'Material storage yard', 'Workshop', 'Pump room', 'Substation area'];
const rootCauseSuggestions = ['Inadequate supervision', 'Procedure not followed', 'Poor housekeeping', 'Missing barricading', 'PPE non-compliance', 'Lack of awareness', 'Unsafe access', 'Equipment defect'];

const normalizeSentence = (value: string) => {
  const text = (value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const punctuated = /[.!?]$/.test(text) ? text : `${text}.`;
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1);
};

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const matchRules = (text: string) => {
  const source = text.toLowerCase();
  return keywordRules.filter(rule => rule.keys.some(key => source.includes(key)));
};

const riskLevel = (score: number) => {
  if (score >= 12) return { label: 'Critical', color: '#cf1322', percent: 100 };
  if (score >= 8) return { label: 'High', color: '#d46b08', percent: 75 };
  if (score >= 4) return { label: 'Medium', color: '#d4b106', percent: 50 };
  return { label: 'Low', color: '#389e0d', percent: 25 };
};

const speechLanguageMap: Record<string, string> = {
  auto: 'en-IN',
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ml: 'ml-IN',
};

interface SafetyObservationFormProps {
  observationID?: string;
  onSuccess?: () => void;
  initialData?: any;
  isEditMode?: boolean;
}

const SafetyObservationForm: React.FC<SafetyObservationFormProps> = ({
  observationID,
  onSuccess,
  initialData,
  isEditMode = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [epcUsers, setEpcUsers] = useState<any[]>([]);
  const [contractors, setContractors] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [observationPhotos, setObservationPhotos] = useState<any[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [projectContext, setProjectContext] = useState<any | null>(null);
  const [accessWarning, setAccessWarning] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('auto');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSource, setAiSource] = useState<'rules' | 'ai' | 'fallback'>('rules');
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [predictiveWarnings, setPredictiveWarnings] = useState<string[]>([]);
  const [imageInsights, setImageInsights] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [suggestionMemory, setSuggestionMemory] = useState<Record<string, string[]>>({});
  const loadToastShownRef = useRef(false);
  const voiceRecognitionRef = useRef<any | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const aiDebounceRef = useRef<number | null>(null);
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const username = (user as any)?.username || (user as any)?.email?.split('@')?.[0] || '';
  const userId = (user as any)?.id;
  const roleType = (user as any)?.role_type;
  const companyId = (user as any)?.company_id;
  const userProjectId = (user as any)?.project_id;
  const userDepartment = (user as any)?.department || '';
  const hasPlatformAccess = Boolean((user as any)?.modules_unlocked || (user as any)?.module_access_enabled);
  const draftKey = `safety-observation-draft:${userId || 'guest'}:${observationID || 'new'}`;
  const observationText = Form.useWatch('safetyObservationFound', form) || '';
  const activityText = Form.useWatch('activityPerforming', form) || '';
  const departmentValue = Form.useWatch('department', form) || userDepartment || '';
  const locationValue = Form.useWatch('workLocation', form) || '';
  const typeValue = Form.useWatch('typeOfObservation', form) || 'unsafe_act';
  const severityValue = Number(Form.useWatch('severity', form) || 1);
  const likelihoodValue = Number(Form.useWatch('likelihood', form) || 1);
  const riskScore = severityValue * likelihoodValue;
  const currentRisk = riskLevel(riskScore);
  const combinedObservationText = `${observationText} ${activityText} ${locationValue} ${departmentValue}`;

  // ─── Considering Parameters + Auto-Fill ───────────────────────────────────
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);
  const {
    parameters: cpParams,
    setParameters: setCpParams,
    resetParameters: resetCpParams,
    saveAsDefaults: saveCpDefaults,
    options: cpOptions,
    autoFillResult,
    autoFillLoading,
  } = useConsideringParameters('safety_observation');

  const { applyAutoFill } = useAutoFill({
    form,
    parameters: cpParams,
    autoFillResult,
    onAutoFilled: setAutoFilledFields,
  });

  // Sync department from parameters into form when it changes
  useEffect(() => {
    if (cpParams.department && !form.getFieldValue('department')) {
      form.setFieldValue('department', cpParams.department);
    }
    if (cpParams.work_area && !form.getFieldValue('workLocation')) {
      form.setFieldValue('workLocation', cpParams.work_area);
    }
    if (cpParams.contractor && !form.getFieldValue('contractorName')) {
      form.setFieldValue('contractorName', cpParams.contractor);
    }
  }, [cpParams, form]);

  const smartSuggestions = useMemo(() => {
    const matched = matchRules(combinedObservationText);
    const memory = suggestionMemory || {};
    return {
      activities: unique([
        ...(memory.activities || []),
        ...activitySuggestions,
      ]).slice(0, 12),
      locations: unique([
        projectContext?.work_location,
        ...(memory.locations || []),
        ...locationSuggestions,
      ]).slice(0, 12),
      departments: unique([
        userDepartment,
        ...(memory.departments || []),
        ...departmentOptions,
      ]).slice(0, 8),
      correctiveActions: unique([
        ...matched.map(rule => rule.correctiveAction),
        ...(memory.correctiveActions || []),
        'Stop work and make the area safe before continuing.',
        'Barricade the affected location and inform the area supervisor.',
        'Conduct toolbox talk and verify implementation of corrective controls.',
      ]).slice(0, 8),
      rootCauses: unique(rootCauseSuggestions).slice(0, 8),
      recommendations: unique(matched.flatMap(rule => rule.recommendations)).slice(0, 10),
    };
  }, [combinedObservationText, projectContext?.work_location, suggestionMemory, userDepartment]);

  // Generate unique observation ID
  const generateObservationID = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `SO-${year}${month}${day}-${hours}${minutes}${seconds}`;
  };

  // Generate observation ID only once when component mounts
  const [currentObservationID] = useState(() =>
    observationID || (isEditMode ? '' : generateObservationID())
  );

  const updateSuggestionMemory = (values: any) => {
    const next = {
      activities: unique([values.activityPerforming, ...(suggestionMemory.activities || [])]).slice(0, 10),
      locations: unique([values.workLocation, ...(suggestionMemory.locations || [])]).slice(0, 10),
      departments: unique([values.department, ...(suggestionMemory.departments || [])]).slice(0, 10),
      correctiveActions: unique([values.correctivePreventiveAction, ...(suggestionMemory.correctiveActions || [])]).slice(0, 10),
    };
    setSuggestionMemory(next);
    try {
      localStorage.setItem('safety-observation-suggestions', JSON.stringify(next));
    } catch {}
  };

  const applySmartAnalysis = (sourceText: string, overwrite = false) => {
    const matched = matchRules(sourceText);
    if (matched.length === 0) return;

    const currentValues = form.getFieldsValue();
    const primary = matched[0];
    const patch: Record<string, any> = {};

    if ((overwrite || !currentValues.typeOfObservation) && primary.typeOfObservation) {
      patch.typeOfObservation = primary.typeOfObservation;
    }
    if ((overwrite || !currentValues.classification) && primary.classification) {
      patch.classification = primary.classification;
    }
    if (overwrite || Number(currentValues.severity || 0) < primary.severity) {
      patch.severity = primary.severity;
    }
    if (overwrite || Number(currentValues.likelihood || 0) < primary.likelihood) {
      patch.likelihood = primary.likelihood;
    }
    if (!currentValues.correctivePreventiveAction && primary.correctiveAction) {
      patch.correctivePreventiveAction = primary.correctiveAction;
    }

    if (Object.keys(patch).length > 0) {
      form.setFieldsValue(patch);
    }
    setAiRecommendations(unique(matched.flatMap(rule => rule.recommendations)).slice(0, 10));
    setPredictiveWarnings(unique(matched.map(rule => `${classificationOptions.find(option => option.value === rule.classification)?.label || rule.classification} pattern detected`)));
    setAiSource('rules');
  };

  const applyVoiceText = async (transcript: string) => {
    const cleanedTranscript = normalizeSentence(transcript);
    if (!cleanedTranscript) return;

    setVoiceProcessing(true);
    let professionalText = cleanedTranscript;
    let detectedLanguage = 'auto';

    try {
      const translated = await translateVoice(cleanedTranscript, voiceLanguage as any, 'safety_observation', 'safetyObservationFound');
      professionalText = normalizeSentence(translated.professional_english || cleanedTranscript);
      detectedLanguage = translated.detected_language || translated.language || 'auto';
      setAiSource(translated.source === 'gemini' ? 'ai' : 'fallback');
    } catch {
      setAiSource('fallback');
    } finally {
      setVoiceProcessing(false);
    }

    const currentDescription = form.getFieldValue('safetyObservationFound');
    form.setFieldsValue({
      safetyObservationFound: currentDescription
        ? `${currentDescription}\n${professionalText}`
        : professionalText,
    });
    setVoiceTranscript(professionalText);
    setVoiceLanguage(detectedLanguage);
    applySmartAnalysis(professionalText, false);
  };

  const startVoiceAssistant = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      message.warning('Voice input is not supported in this browser. Use Chrome or Edge for speech capture.');
      return;
    }

    try {
      if (voiceRecognitionRef.current) {
        voiceRecognitionRef.current.abort();
      }

      const recognition = new Recognition();
      voiceRecognitionRef.current = recognition;
      recognition.lang = speechLanguageMap[voiceLanguage] || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      let finalText = '';
      recognition.onstart = () => setVoiceActive(true);
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalText += `${result} `;
          else interim += result;
        }
        setVoiceTranscript(normalizeSentence(`${finalText} ${interim}`));
      };
      recognition.onerror = (event: any) => {
        setVoiceActive(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          message.warning('Microphone permission denied. Allow microphone access to use voice assistant.');
        } else if (event.error !== 'aborted') {
          message.warning('Voice capture stopped. You can continue typing normally.');
        }
      };
      recognition.onend = () => {
        setVoiceActive(false);
        voiceRecognitionRef.current = null;
        applyVoiceText(finalText || voiceTranscript);
      };

      recognition.start();
    } catch {
      setVoiceActive(false);
      message.warning('Voice assistant could not start. Please check microphone availability.');
    }
  };

  const stopVoiceAssistant = () => {
    try {
      voiceRecognitionRef.current?.stop();
    } catch {
      setVoiceActive(false);
    }
  };

  const applyTemplate = (values: Record<string, any>) => {
    form.setFieldsValue(values);
    applySmartAnalysis(`${values.safetyObservationFound || ''} ${values.activityPerforming || ''}`, true);
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setDraftSavedAt(null);
    message.success('Draft cleared');
  };

  // Set initial form values when initialData is provided
  useEffect(() => {
    if (initialData && isEditMode) {
      form.setFieldsValue({
        observationID: initialData.observationID,
        reportedBy: initialData.reportedBy,
        date: initialData.date ? dayjs(initialData.date) : null,
        time: initialData.time ? dayjs(initialData.time, 'HH:mm:ss') : null,
        department: initialData.department,
        workLocation: initialData.workLocation,
        activityPerforming: initialData.activityPerforming,
        contractorName: initialData.contractorName,
        typeOfObservation: initialData.typeOfObservation,
        classification: initialData.classification?.[0] || '',
        safetyObservationFound: initialData.safetyObservationFound,
        severity: initialData.severity,
        likelihood: initialData.likelihood,
        correctivePreventiveAction: initialData.correctivePreventiveAction,
        correctiveActionAssignedTo: initialData.correctiveActionAssignedTo,
        commitmentDate: initialData.commitmentDate ? dayjs(initialData.commitmentDate) : null,
        observationStatus: initialData.observationStatus,
        remarks: initialData.remarks,
      });
    }
  }, [initialData, isEditMode, form]);

  useEffect(() => {
    try {
      const savedMemory = localStorage.getItem('safety-observation-suggestions');
      if (savedMemory) setSuggestionMemory(JSON.parse(savedMemory));
    } catch {}
  }, []);

  useEffect(() => {
    if (initialData || isEditMode) return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (!savedDraft) {
        form.setFieldsValue({ date: dayjs(), time: dayjs() });
        return;
      }
      const parsed = JSON.parse(savedDraft);
      form.setFieldsValue({
        ...parsed,
        date: parsed.date ? dayjs(parsed.date) : dayjs(),
        time: parsed.time ? dayjs(parsed.time, 'HH:mm:ss') : dayjs(),
        commitmentDate: parsed.commitmentDate ? dayjs(parsed.commitmentDate) : null,
      });
      setDraftSavedAt(parsed.__savedAt || null);
    } catch {
      form.setFieldsValue({ date: dayjs(), time: dayjs() });
    }
  }, [draftKey, form, initialData, isEditMode]);

  useEffect(() => {
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => {
      if (isEditMode) return;
      const values = form.getFieldsValue();
      const payload = {
        ...values,
        date: values.date?.format?.('YYYY-MM-DD'),
        time: values.time?.format?.('HH:mm:ss'),
        commitmentDate: values.commitmentDate?.format?.('YYYY-MM-DD'),
        __savedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setDraftSavedAt(payload.__savedAt);
      } catch {}
    }, 900);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, [activityText, departmentValue, draftKey, form, isEditMode, likelihoodValue, locationValue, observationText, severityValue, typeValue]);

  useEffect(() => {
    applySmartAnalysis(combinedObservationText, false);

    if (aiDebounceRef.current) window.clearTimeout(aiDebounceRef.current);
    if (combinedObservationText.trim().length < 12) return;

    aiDebounceRef.current = window.setTimeout(async () => {
      setAiBusy(true);
      try {
        const context = {
          module: 'safety_observation',
          description: combinedObservationText,
          department: departmentValue,
          location: locationValue,
          observation_type: typeValue,
          classification: form.getFieldValue('classification'),
          risk_score: riskScore,
        };

        const [recommendationResult, predictionResult] = await Promise.allSettled([
          getSafetyRecommendations(context),
          predictIncidents(context),
        ]);

        if (recommendationResult.status === 'fulfilled') {
          const result: any = recommendationResult.value;
          setAiRecommendations(unique([
            ...(result.ppe || []),
            ...(result.controls || []),
            ...(result.precautions || []),
            ...(result.barricading || []),
            ...(result.rescue_plan || []),
          ]).slice(0, 10));
          setAiSource(result.source === 'gemini' ? 'ai' : 'rules');
        }

        if (predictionResult.status === 'fulfilled') {
          const result: any = predictionResult.value;
          setPredictiveWarnings(unique([
            ...(result.possible_incidents || []),
            ...(result.unsafe_conditions || []),
            ...(result.risk_escalation_triggers || []),
          ]).slice(0, 8));
        }
      } catch {
        setAiSource('fallback');
      } finally {
        setAiBusy(false);
      }
    }, 850);

    return () => {
      if (aiDebounceRef.current) window.clearTimeout(aiDebounceRef.current);
    };
  }, [combinedObservationText, departmentValue, form, locationValue, riskScore, typeValue]);

  useEffect(() => () => {
    try {
      voiceRecognitionRef.current?.abort();
    } catch {}
  }, []);

  const fallbackContractors = [
    'Athena Constructions Pvt Ltd',
    'ABC Engineering Services',
    'Sri Balaji Contractors',
    'TechBuild Infra Pvt Ltd',
    'Global Industrial Solutions',
  ];

  const fallbackUsers = [
    { id: 'rajesh.kumar', username: 'rajesh.kumar', first_name: 'Rajesh', last_name: 'Kumar - Site Supervisor' },
    { id: 'arun.prakash', username: 'arun.prakash', first_name: 'Arun', last_name: 'Prakash - Safety Officer' },
    { id: 'suresh.babu', username: 'suresh.babu', first_name: 'Suresh', last_name: 'Babu - Electrical Supervisor' },
    { id: 'karthik.r', username: 'karthik.r', first_name: 'Karthik', last_name: 'R - Mechanical Engineer' },
    { id: 'manoj.kumar', username: 'manoj.kumar', first_name: 'Manoj', last_name: 'Kumar - Civil Supervisor' },
  ];

  // Fetch project users and contractors on component mount
  useEffect(() => {
    const fetchUsersAndContractors = async () => {
      setLoadingUsers(true);
      try {
        console.info('[SafetyObservationForm] Loading project context', {
          userId,
          roleType,
          companyId,
          projectId: userProjectId,
          hasPlatformAccess,
        });

        // Fetch project users for corrective action assignment (induction-trained users only)
        const projectUsersResponse = await api.get('/api/v1/safetyobservation/project-users/');
        const projectUsersData = projectUsersResponse.data;
        const context = projectUsersData.project_context || null;
        setProjectContext(context);
        setAccessWarning(context?.has_project === false
          ? 'No project assigned. You can continue only after an administrator assigns your account to a project.'
          : null
        );
        console.info('[SafetyObservationForm] Project context loaded', {
          tenantId: context?.tenant_id,
          projectId: context?.project_id,
          hasProject: context?.has_project,
          usersCount: projectUsersData.users?.length || 0,
        });

        const prefill: Record<string, any> = {};
        if (!form.getFieldValue('reportedBy') && username) prefill.reportedBy = username;
        if (!form.getFieldValue('department') && context?.department) prefill.department = context.department;
        if (!form.getFieldValue('workLocation') && context?.work_location) prefill.workLocation = context.work_location;
        if (Object.keys(prefill).length > 0) form.setFieldsValue(prefill);
        
        if (projectUsersData.users && projectUsersData.users.length > 0) {
          setEpcUsers(projectUsersData.users.map((user: any) => ({
            id: user.username,
            username: user.username,
            first_name: user.display_name.split(' ')[0] || user.username,
            last_name: user.display_name.split(' ').slice(1).join(' ') || ''
          })));
        }

        // Fetch contractor users for contractor name dropdown
        try {
          const contractorResponse = await api.get('/api/workforce/contractoruser-list/');
          const contractorData = contractorResponse.data;
          
          if (contractorData?.users && contractorData.users.length > 0) {
            const companyNames = [...new Set(
              contractorData.users.map((user: any) => user.company_name).filter(Boolean)
            )] as string[];
            setContractors(companyNames);
          } else {
            setContractors([]);
          }
        } catch (contractorError: any) {
          setContractors([]);
          // Only show error if it's not a permission/project issue
          if (contractorError.response?.status !== 403 && !loadToastShownRef.current) {
            loadToastShownRef.current = true;
            message.warning('Could not load contractor companies. This may be due to project access restrictions.');
          }
        }

      } catch (error: any) {
        console.info('[SafetyObservationForm] Project context load failed', {
          status: error.response?.status,
          code: error.response?.data?.error,
        });
        if (error.response?.status === 403) {
          setAccessWarning(error.response?.data?.message || 'No project assigned. Contact your administrator.');
        } else {
          setAccessWarning('Project context could not be refreshed. You can still fill the form and retry submission.');
          if (!loadToastShownRef.current) {
            loadToastShownRef.current = true;
            message.warning('Could not refresh project context.');
          }
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsersAndContractors();
  }, [companyId, form, hasPlatformAccess, message, roleType, userDepartment, userId, username, userProjectId]);

  // Photo upload handlers
  const handlePhotoUpload = async (info: any) => {
    const { fileList } = info;
    setObservationPhotos(fileList);

    const latestFile = fileList[fileList.length - 1]?.originFileObj;
    if (!latestFile) return;

    const lowerName = latestFile.name?.toLowerCase?.() || '';
    const localMatches = matchRules(`${lowerName} ${observationText}`);
    if (localMatches.length > 0) {
      setImageInsights(unique(localMatches.flatMap(rule => [
        `Possible ${classificationOptions.find(option => option.value === rule.classification)?.label || rule.classification} concern`,
        ...rule.recommendations.slice(0, 2),
      ])).slice(0, 6));
    }

    try {
      const imageData = new FormData();
      imageData.append('image', latestFile);
      imageData.append('module', 'safety_observation');
      imageData.append('description', observationText || activityText || '');
      const result: any = await analyzeSafetyImage(imageData);
      const detected = unique([
        ...(result.detected_hazards || []),
        ...(result.classifications || []),
        ...(result.recommendations || []),
        ...(result.controls || []),
      ]).slice(0, 8);
      if (detected.length > 0) {
        setImageInsights(detected);
        setAiSource(result.source === 'gemini' ? 'ai' : 'rules');
      }
    } catch {
      // Image AI is optional. The uploaded file remains attached to the observation.
    }
  };

  const beforePhotoUpload = (file: any) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    return false; // Prevent auto upload, we'll handle it manually
  };

  // Form submission handler
  const onFinish = async (values: any) => {

    // Generate unique submission ID
    const currentSubmissionId = `${currentObservationID}-${Date.now()}`;

    // Prevent multiple submissions
    if (loading) {
      return;
    }

    // Check if this exact submission was already processed
    if (submissionId === currentSubmissionId) {
      return;
    }

    setSubmissionId(currentSubmissionId);
    setLoading(true);

    try {
      // Prepare FormData for file uploads
      const formData = new FormData();

      // Basic Information (REQUIRED)
      formData.append('observationID', currentObservationID);
      
      // Handle date and time properly - REQUIRED
      if (!values.date) {
        message.error('Date is required');
        return;
      }
      if (!values.time) {
        message.error('Time is required');
        return;
      }
      
      formData.append('date', values.date.format('YYYY-MM-DD'));
      formData.append('time', values.time.format('HH:mm:ss'));
      
      // Required fields validation
      if (!values.department) {
        message.error('Department is required');
        return;
      }
      if (!values.workLocation) {
        message.error('Work Location is required');
        return;
      }
      if (!values.activityPerforming) {
        message.error('Activity Performing is required');
        return;
      }
      if (!values.typeOfObservation) {
        message.error('Type of Observation is required');
        return;
      }
      if (!values.classification) {
        message.error('Classification is required');
        return;
      }
      if (!values.safetyObservationFound) {
        message.error('Safety Observation Found is required');
        return;
      }
      if (!values.severity) {
        message.error('Severity is required');
        return;
      }
      if (!values.likelihood) {
        message.error('Likelihood is required');
        return;
      }
      if (!values.correctivePreventiveAction) {
        message.error('Corrective/Preventive Action is required');
        return;
      }
      if (!values.correctiveActionAssignedTo) {
        message.error('Assigned To is required');
        return;
      }
      
      formData.append('reportedBy', values.reportedBy || username || '');
      formData.append('department', values.department);
      formData.append('workLocation', values.workLocation);
      formData.append('activityPerforming', values.activityPerforming);

      // Optional Basic Fields
      formData.append('contractorName', values.contractorName || '');

      // Observation Details (REQUIRED)
      formData.append('typeOfObservation', values.typeOfObservation);
      
      // Handle classification properly - backend expects JSON array
      const classification = Array.isArray(values.classification) ? values.classification : [values.classification];
      formData.append('classification', JSON.stringify(classification));
      
      formData.append('safetyObservationFound', values.safetyObservationFound);

      // Risk Assessment (REQUIRED) - Ensure numeric values
      formData.append('severity', String(Number(values.severity)));
      formData.append('likelihood', String(Number(values.likelihood)));

      // CAPA Information (REQUIRED)
      formData.append('correctivePreventiveAction', values.correctivePreventiveAction);
      formData.append('correctiveActionAssignedTo', values.correctiveActionAssignedTo);

      // Commitment Date (Optional) - FIXED FIELD NAME
      if (values.commitmentDate) {
        formData.append('commitmentDate', values.commitmentDate.format('YYYY-MM-DD'));
      }

      // Status and Closure
      formData.append('observationStatus', values.observationStatus || 'open');
      formData.append('remarks', values.remarks || '');

      // Add observation photos
      observationPhotos.forEach((file) => {
        if (file.originFileObj) {
          formData.append('beforePictures', file.originFileObj);
        }
      });


      // Debug: Log all FormData entries
      for (const [key, value] of formData.entries()) {
      }

      let response;
      if (isEditMode && observationID) {
        response = await api.put(`/api/v1/safetyobservation/${observationID}/`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Safety observation updated successfully!');
      } else {
        response = await api.post('/api/v1/safetyobservation/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        message.success('Safety observation created successfully!');
      }

      // Handle successful response
      if (response && response.data) {
        if (!isEditMode) {
          form.resetFields();
          setObservationPhotos([]);
          try {
            localStorage.removeItem(draftKey);
          } catch {}
          setDraftSavedAt(null);
        }
        updateSuggestionMemory(values);
        if (onSuccess) onSuccess();
        
        // Navigate to list page after successful submission
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard/safetyobservation/list';
          }
        }, 1000);
      }

    } catch (error: any) {
      
      let errorMessage = isEditMode ? 'Failed to update safety observation' : 'Failed to create safety observation';
      
      if (error.response?.status === 400) {
        // Handle 400 Bad Request errors specifically
        if (error.response?.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else {
            // Handle field-specific validation errors
            const fieldErrors = [];
            for (const [field, errors] of Object.entries(error.response.data)) {
              if (Array.isArray(errors)) {
                fieldErrors.push(`${field}: ${errors.join(', ')}`);
              } else {
                fieldErrors.push(`${field}: ${errors}`);
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = `Validation errors: ${fieldErrors.join('; ')}`;
            } else {
              errorMessage = `Bad request: ${JSON.stringify(error.response.data)}`;
            }
          }
        } else {
          errorMessage = 'Bad request: Please check all required fields are filled correctly';
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied. You do not have access to create safety observations.';
      } else if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      message.error(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Safety Observation Form"
      style={{ maxWidth: 1240, margin: '0 auto' }}
      extra={
        <Space wrap>
          {draftSavedAt && (
            <Tooltip title={dayjs(draftSavedAt).format('DD MMM YYYY, HH:mm:ss')}>
              <Tag icon={<SaveOutlined />} color="blue">Draft saved</Tag>
            </Tooltip>
          )}
          <Badge status={aiBusy ? 'processing' : 'success'} text={aiBusy ? 'AI analyzing' : `AI ${aiSource}`} />
        </Space>
      }
    >
      {accessWarning && (
        <Alert
          type={projectContext?.has_project === false ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
          message={projectContext?.has_project === false ? 'No project assigned' : 'Project context notice'}
          description={accessWarning}
        />
      )}

      {/* ── Considering Parameters Panel ── */}
      <ConsideringParametersPanel
        parameters={cpParams}
        options={cpOptions}
        autoFillResult={autoFillResult}
        autoFillLoading={autoFillLoading}
        autoFilledFields={autoFilledFields}
        onChange={setCpParams}
        onReset={resetCpParams}
        onSaveDefaults={saveCpDefaults}
        onApplyAutoFill={() => applyAutoFill('safety_observation')}
        visibleParams={['department', 'work_area', 'site', 'contractor', 'work_type', 'risk_category', 'shift']}
      />

      <Row gutter={16}>
        <Col xs={24} xl={17}>

      <div style={{ marginBottom: 20, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4}>
              <Text strong><RobotOutlined /> AI Observation Assistant</Text>
              <Text type="secondary">Voice, autofill, recommendations and risk intelligence are active.</Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space wrap>
              <Button
                type={voiceActive ? 'primary' : 'default'}
                danger={voiceActive}
                icon={<AudioOutlined />}
                loading={voiceProcessing}
                onClick={voiceActive ? stopVoiceAssistant : startVoiceAssistant}
              >
                {voiceActive ? 'Stop Listening' : 'Start Voice'}
              </Button>
              <Select
                size="middle"
                value={voiceLanguage}
                style={{ width: 150 }}
                onChange={setVoiceLanguage}
                options={[
                  { value: 'auto', label: 'Auto detect' },
                  { value: 'en', label: 'English' },
                  { value: 'ta', label: 'Tamil' },
                  { value: 'hi', label: 'Hindi' },
                  { value: 'te', label: 'Telugu' },
                  { value: 'ml', label: 'Malayalam' },
                ]}
              />
              <Button icon={<DeleteOutlined />} onClick={clearDraft}>Clear Draft</Button>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <ThunderboltOutlined />
                <Text strong>Risk: {currentRisk.label}</Text>
                <Tag color={currentRisk.color}>Score {riskScore}/16</Tag>
              </Space>
              <Progress percent={currentRisk.percent} strokeColor={currentRisk.color} showInfo={false} />
            </Space>
          </Col>
        </Row>

        {voiceTranscript && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            showIcon
            message="Live transcription"
            description={voiceTranscript}
          />
        )}

        <Divider style={{ margin: '16px 0' }} />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Text strong><BulbOutlined /> Quick templates</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {quickTemplates.map(template => (
                  <Button key={template.label} size="small" onClick={() => applyTemplate(template.values)}>
                    {template.label}
                  </Button>
                ))}
              </Space>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <Text strong>Smart recommendations</Text>
            <div style={{ marginTop: 8 }}>
              {(aiRecommendations.length > 0 ? aiRecommendations : smartSuggestions.recommendations).slice(0, 6).map(item => (
                <Tag key={item} color="green" style={{ marginBottom: 6 }}>{item}</Tag>
              ))}
              {aiRecommendations.length === 0 && smartSuggestions.recommendations.length === 0 && (
                <Text type="secondary">Recommendations appear as the observation is entered.</Text>
              )}
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <Text strong>Predictive alerts</Text>
            <div style={{ marginTop: 8 }}>
              {predictiveWarnings.slice(0, 6).map(item => (
                <Tag key={item} color={currentRisk.label === 'Critical' ? 'red' : 'orange'} style={{ marginBottom: 6 }}>{item}</Tag>
              ))}
              {imageInsights.slice(0, 4).map(item => (
                <Tag key={item} color="purple" style={{ marginBottom: 6 }}>{item}</Tag>
              ))}
              {predictiveWarnings.length === 0 && imageInsights.length === 0 && (
                <Text type="secondary">Image and text insights appear automatically.</Text>
              )}
            </div>
          </Col>
        </Row>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          observationID: currentObservationID,
          typeOfObservation: 'unsafe_act',
          severity: 1,
          likelihood: 1,
          observationStatus: 'open',
          reportedBy: username,
          department: userDepartment || undefined,
        }}
      >
        {/* Basic Information Section */}
        <Divider orientation="left">Basic Information</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Observation ID"
              name="observationID"
            >
              <Input size="large" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Reported By"
              name="reportedBy"
              rules={[{ required: true, message: 'Please enter reporter name' }]}
            >
              <Input size="large" placeholder="Enter reporter name" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker size="large" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Time"
              name="time"
              rules={[{ required: true, message: 'Please select time' }]}
            >
              <TimePicker size="large" style={{ width: '100%' }} format="HH:mm" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Department"
              name="department"
              rules={[{ required: true, message: 'Please select department' }]}
            >
              <AutoComplete
                size="large"
                placeholder="Select or type department"
                options={smartSuggestions.departments.map(value => ({ value }))}
                filterOption={(inputValue, option) =>
                  String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Work Location"
              name="workLocation"
              rules={[{ required: true, message: 'Please enter work location' }]}
            >
              <AutoComplete
                size="large"
                placeholder="Enter work location"
                options={smartSuggestions.locations.map(value => ({ value }))}
                filterOption={(inputValue, option) =>
                  String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Activity Performing"
              name="activityPerforming"
              rules={[{ required: true, message: 'Please enter activity' }]}
            >
              <AutoComplete
                size="large"
                placeholder="Enter activity being performed"
                options={smartSuggestions.activities.map(value => ({ value }))}
                filterOption={(inputValue, option) =>
                  String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Contractor Name"
              name="contractorName"
            >
              <Select
                size="large"
                placeholder="Select contractor (optional)"
                loading={loadingUsers}
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {(contractors.length > 0 ? contractors : fallbackContractors).map(contractor => (
                  <Option key={contractor} value={contractor}>{contractor}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Observation Details Section */}
        <Divider orientation="left">Observation Details</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Type of Observation"
              name="typeOfObservation"
              rules={[{ required: true, message: 'Please select observation type' }]}
            >
              <Select
                size="large"
                placeholder="Select observation type"
                onChange={(value) => {
                  const selectedRule = keywordRules.find(rule => rule.typeOfObservation === value);
                  if (selectedRule && !form.getFieldValue('correctivePreventiveAction')) {
                    form.setFieldsValue({ correctivePreventiveAction: selectedRule.correctiveAction });
                  }
                }}
              >
                {observationTypeOptions.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Classification"
              name="classification"
              rules={[{ required: true, message: 'Please select classification' }]}
            >
              <Select
                size="large"
                placeholder="Select classification"
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {classificationOptions.map(cls => (
                  <Option key={cls.value} value={cls.value}>{cls.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Safety Observation Found"
          name="safetyObservationFound"
          rules={[{ required: true, message: 'Please describe the observation' }]}
        >
          <TextArea
            rows={4}
            size="large"
            placeholder="Describe or use voice input. Example: Oil spill near main walkway."
            onBlur={(event) => applySmartAnalysis(event.target.value, false)}
          />
        </Form.Item>

        <Form.Item
          label="Observation Photos"
          name="observationPhotos"
          extra="Upload photos of the safety observation (Max 5MB per image)"
        >
          <Upload
            listType="picture-card"
            fileList={observationPhotos}
            onChange={handlePhotoUpload}
            beforeUpload={beforePhotoUpload}
            multiple
            accept="image/*"
            maxCount={5}
          >
            {observationPhotos.length >= 5 ? null : (
              <div>
                <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>Upload Photos</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {/* Risk Assessment Section */}
        <Divider orientation="left">Risk Assessment</Divider>
        
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Severity"
              name="severity"
              rules={[{ required: true, message: 'Please select severity' }]}
            >
              <Select size="large" placeholder="Select severity">
                {severityOptions.map(sev => (
                  <Option key={sev.value} value={sev.value}>{sev.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Likelihood"
              name="likelihood"
              rules={[{ required: true, message: 'Please select likelihood' }]}
            >
              <Select size="large" placeholder="Select likelihood">
                {likelihoodOptions.map(like => (
                  <Option key={like.value} value={like.value}>{like.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* CAPA Section */}
        <Divider orientation="left">Corrective & Preventive Action</Divider>
        
        <Form.Item
          label="Corrective/Preventive Action"
          name="correctivePreventiveAction"
          rules={[{ required: true, message: 'Please enter corrective action' }]}
        >
          <AutoComplete
            size="large"
            options={smartSuggestions.correctiveActions.map(value => ({ value }))}
            filterOption={(inputValue, option) =>
              String(option?.value || '').toLowerCase().includes(inputValue.toLowerCase())
            }
          >
            <TextArea rows={4} size="large" placeholder="Describe the corrective/preventive action required..." />
          </AutoComplete>
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Assigned To"
              name="correctiveActionAssignedTo"
              rules={[{ required: true, message: 'Please select assigned person' }]}
            >
              <Select
                size="large"
                placeholder="Select person to assign corrective action"
                loading={loadingUsers}
                showSearch
                filterOption={(input, option) =>
                  String(option?.children || '').toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={epcUsers.length === 0 ? 'Showing sample users' : 'No data'}
              >
                {(epcUsers.length > 0 ? epcUsers : fallbackUsers).map(user => (
                  <Option key={user.id} value={user.username}>
                    {user.first_name} {user.last_name} ({user.username})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Commitment Date (Optional)"
              name="commitmentDate"
            >
              <DatePicker
                size="large"
                style={{ width: '100%' }}
                placeholder="Select commitment date"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item
              label="Observation Status"
              name="observationStatus"
              rules={[{ required: true, message: 'Please select status' }]}
            >
              <Select size="large" placeholder="Select status">
                {observationStatusOptions.map(status => (
                  <Option key={status.value} value={status.value}>{status.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Additional Information */}
        <Divider orientation="left">Additional Information</Divider>
        
        <Form.Item
          label="Remarks"
          name="remarks"
        >
          <TextArea rows={3} size="large" placeholder="Additional remarks (optional)..." />
        </Form.Item>
        <div style={{ marginTop: -12, marginBottom: 16 }}>
          <Text type="secondary">Root cause suggestions: </Text>
          {smartSuggestions.rootCauses.map(rootCause => (
            <Tag
              key={rootCause}
              style={{ cursor: 'pointer', marginBottom: 6 }}
              onClick={() => {
                const current = form.getFieldValue('remarks') || '';
                form.setFieldsValue({ remarks: current ? `${current}\nRoot cause: ${rootCause}` : `Root cause: ${rootCause}` });
              }}
            >
              {rootCause}
            </Tag>
          ))}
        </div>

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginTop: 32 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={loading}
            style={{ minWidth: 200, height: 48, fontSize: 16 }}
          >
            {loading
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : (isEditMode ? 'Update Safety Observation' : 'Create Safety Observation')
            }
          </Button>
        </Form.Item>
      </Form>

        </Col>
        <Col xs={24} xl={7}>
          <div style={{ position: 'sticky', top: 16 }}>
            <SmartRecommendationPanel
              module="safety_observation"
              parameters={cpParams}
              autoFillResult={autoFillResult}
              contextText={combinedObservationText}
              onApplySuggestion={(field, value) => {
                const fieldMap: Record<string, string> = {
                  corrective_action: 'correctivePreventiveAction',
                };
                form.setFieldValue(fieldMap[field] || field, value);
              }}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
};

export default SafetyObservationForm;
