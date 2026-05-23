import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Form,
  Input,
  Button,
  DatePicker,
  Select,
  Upload,
  App,
  Card,
  Divider,
  Row,
  Col,
  Tooltip,
  Modal,
  Tag,
  Spin,
  Alert,
  Space,
} from 'antd';
import {
  UploadOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  SaveOutlined,
  SendOutlined,
  AudioOutlined,
  TranslationOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import debounce from 'lodash/debounce';
import { useIncidents } from '../hooks/useIncidents';
import type { IncidentFormData } from '../types';
import {
  INCIDENT_TYPES,
  SEVERITY_LEVELS,
  BUSINESS_IMPACT_LEVELS,
  REGULATORY_FRAMEWORKS,
  COST_CATEGORIES,
} from '../types';
import { useAuthStore } from '../../../store/authStore';
import {
  analyzeSafetyImage,
  analyzeSafetyDocument,
  getSafetyRecommendations,
  predictIncidents,
  translateToEnglish,
} from '../../../services/aiService';
import { apiClient } from '../../../lib/api';

const { TextArea } = Input;
const { Option } = Select;

const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'te-IN', label: 'Telugu' },
] as const;

const VOICE_FIELD_LABELS: Record<string, string> = {
  title: 'Incident Title',
  description: 'Incident Description',
  location: 'Location',
  reporter_name: 'Reporter Name',
  immediate_action_taken: 'Corrective Action',
};

const getSeverityColor = (severity: string) => {
  const severityConfig = SEVERITY_LEVELS.find(s => s.value === severity);
  return severityConfig?.color || 'default';
};

const buildDraftKey = (mode: string, incidentId?: string) => {
  return `incident-management-draft-${mode}-${incidentId ?? 'new'}`;
};

// ─── Safety vocabulary correction map ────────────────────────────────────────
const SAFETY_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bppe\b/gi, 'PPE'],
  [/\bp\.p\.e\.?\b/gi, 'PPE'],
  [/\behs\b/gi, 'EHS'],
  [/\blti\b/gi, 'LTI'],
  [/\bfac\b/gi, 'FAC'],
  [/\bmtc\b/gi, 'MTC'],
  [/\bptw\b/gi, 'PTW'],
  [/\bhot work permit\b/gi, 'Hot Work Permit'],
  [/\bhot work\b/gi, 'Hot Work'],
  [/\bnear[ -]?miss\b/gi, 'Near Miss'],
  [/\blost[ -]?time[ -]?injur/gi, 'Lost Time Injury'],
  [/\bfirst[ -]?aid\b/gi, 'First Aid'],
  [/\bemergency[ -]?shutdown\b/gi, 'Emergency Shutdown'],
  [/\bgas[ -]?leak(age)?\b/gi, 'Gas Leakage'],
  [/\bchemical[ -]?spill\b/gi, 'Chemical Spill'],
  [/\bunsafe[ -]?condition\b/gi, 'Unsafe Condition'],
  [/\bworking[ -]?at[ -]?height\b/gi, 'Working at Height'],
  [/\bconfined[ -]?space\b/gi, 'Confined Space'],
  [/\bscaffold(ing)?\b/gi, 'Scaffold'],
  [/\bforklift\b/gi, 'Forklift'],
  [/\btransformer\b/gi, 'Transformer'],
  [/\binverter[ -]?room\b/gi, 'Inverter Room'],
  [/\bpanel[ -]?room\b/gi, 'Panel Room'],
  [/\bcontrol[ -]?panel\b/gi, 'Control Panel'],
  [/\belectrical[ -]?hazard\b/gi, 'Electrical Hazard'],
  [/\belectrical[ -]?spark\b/gi, 'Electrical Spark'],
  [/\bfire[ -]?incident\b/gi, 'Fire Incident'],
  [/\bppe[ -]?violation\b/gi, 'PPE Violation'],
  [/\bslip[ -]?and[ -]?fall\b/gi, 'Slip and Fall'],
  [/\bmachine[ -]?breakdown\b/gi, 'Machine Breakdown'],
  [/\bequipment[ -]?damage\b/gi, 'Equipment Damage'],
  [/\bsafety[ -]?observation\b/gi, 'Safety Observation'],
  [/\bcrane[ -]?issue\b/gi, 'Crane Issue'],
  [/\bscaffold[ -]?issue\b/gi, 'Scaffold Issue'],
];

const applySafetyCorrections = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of SAFETY_CORRECTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
};

// ─── Field-specific post-processing ──────────────────────────────────────────
const postProcessForField = (text: string, field: string): string => {
  switch (field) {
    case 'title': {
      // Short, clean, title-cased
      const clean = text.replace(/[.!?]+$/, '').trim();
      return clean.length > 120 ? clean.slice(0, 120) : clean;
    }
    case 'location': {
      // Preserve location names, strip trailing punctuation
      return text.replace(/[.!?]+$/, '').trim();
    }
    case 'reporter_name': {
      // Title-case each word, strip numbers/symbols
      return text
        .replace(/[^a-zA-Z\s.'-]/g, '')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    default:
      return text;
  }
};

const guessIncidentTypeFromText = (text: string) => {
  const n = text.toLowerCase();
  if (/fire|smoke|flame|fire incident/.test(n)) return 'fire';
  if (/spill|leak|chemical spill|chemical|hazardous/.test(n)) return 'spill';
  if (/electrical|wiring|shock|arc|electrical hazard|electrical spark|panel room|transformer|inverter room/.test(n)) return 'electrical';
  if (/fall|slip|trip|slip and fall|working at height/.test(n)) return 'fall_from_height';
  if (/vehicle|truck|bus|car|forklift|forklift incident/.test(n)) return 'vehicle_accident';
  if (/equipment|machine|crusher|press|machine breakdown|equipment damage|crane/.test(n)) return 'equipment_failure';
  if (/near miss|almost|close call/.test(n)) return 'near_miss';
  if (/environment|pollution|contamination/.test(n)) return 'environmental';
  if (/security|theft|security breach|intruder/.test(n)) return 'security';
  if (/chemical exposure|gas|fume|vapour|gas leakage/.test(n)) return 'chemical_exposure';
  if (/ergonomic|strain|repetitive|back pain|muscle/.test(n)) return 'ergonomic';
  if (/struck by|hit by|pelted|falling object/.test(n)) return 'struck_by_object';
  if (/caught in|trapped|between/.test(n)) return 'caught_in_between';
  if (/ppe violation|unsafe condition|safety observation/.test(n)) return 'near_miss';
  if (/confined space|hot work|scaffold|working at height/.test(n)) return 'near_miss';
  return 'other';
};

const guessSeverityFromText = (text: string) => {
  const n = text.toLowerCase();
  if (/critical|life.threatening|fatal|amputation|serious injury|emergency shutdown|explosion/.test(n)) return 'critical';
  if (/hospital|fracture|electrocution|severe|major|lost time injury|lti|gas leakage/.test(n)) return 'high';
  if (/injury|burn|sprain|near miss|minor injury|first aid|smoke|ppe violation|unsafe condition/.test(n)) return 'medium';
  return 'low';
};

const guessDepartmentFromText = (text: string) => {
  const n = text.toLowerCase();
  if (/operation|ops|production|manufacturing/.test(n)) return 'Operations';
  if (/warehouse|logistic|logistics|supply/.test(n)) return 'Logistics';
  if (/maintenance|electrical|mechanical|service|panel room|transformer|inverter/.test(n)) return 'Maintenance';
  if (/construction|site|civil|scaffold|crane/.test(n)) return 'Construction';
  if (/quality|inspection|audit/.test(n)) return 'Quality';
  if (/chemical|lab|laboratory/.test(n)) return 'Chemical';
  return 'Operations';
};

const guessHazardTags = (text: string) => {
  const n = text.toLowerCase();
  const tags: string[] = [];
  if (/wet|slip|trip|fall|wet floor/.test(n)) tags.push('Wet Surface');
  if (/smoke|fire|flame/.test(n)) tags.push('Fire/Smoke');
  if (/electrical|wiring|live wire|short circuit|spark|panel|transformer/.test(n)) tags.push('Electrical Hazard');
  if (/spill|leak|chemical/.test(n)) tags.push('Chemical/Spill');
  if (/machinery|equipment|guarding|machine breakdown/.test(n)) tags.push('Unsafe Equipment');
  if (/barricade|cone|barrier|cordon/.test(n)) tags.push('Missing Barricade');
  if (/ppe|helmet|glove|goggles|vest/.test(n)) tags.push('PPE Violation');
  if (/gas|fume|vapour|leakage/.test(n)) tags.push('Gas/Fume Hazard');
  if (/height|scaffold|crane|fall from/.test(n)) tags.push('Working at Height');
  if (/confined space/.test(n)) tags.push('Confined Space');
  if (/hot work/.test(n)) tags.push('Hot Work');
  if (/forklift/.test(n)) tags.push('Forklift Hazard');
  return tags.length ? tags : ['General Safety Risk'];
};

const mapLocaleToLanguage = (locale: string) => {
  const code = locale.split('-')[0];
  if (code === 'en') return 'en';
  if (code === 'ta') return 'ta';
  if (code === 'hi') return 'hi';
  if (code === 'te') return 'te';
  return 'auto';
};

const isSpeechRecognitionSupported = () => {
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
};

// ─── Voice transcript utilities ───────────────────────────────────────────────

/**
 * Remove consecutive duplicate words produced by the speech engine.
 * e.g. "System System System failure" → "System failure"
 */
const deduplicateWords = (text: string): string => {
  const words = text.trim().split(/\s+/);
  const deduped: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
      deduped.push(words[i]);
    }
  }
  return deduped.join(' ');
};

/**
 * Remove duplicate phrases (2-4 word n-grams that repeat back-to-back).
 * e.g. "system failure system failure" → "system failure"
 */
const deduplicatePhrases = (text: string): string => {
  // Collapse runs of the same 2-4 word phrase
  let result = text;
  for (let n = 4; n >= 2; n--) {
    // Build regex: (word1 word2 ... wordN) followed by the same group
    result = result.replace(
      new RegExp(`((?:\\b\\w+\\b\\s+){${n - 1}}\\b\\w+\\b)(?:\\s+\\1)+`, 'gi'),
      '$1',
    );
  }
  return result;
};

/** Remove common filler words and clean up spacing/capitalisation. */
const cleanTranscript = (raw: string): string => {
  let text = raw.trim();
  // Strip leading filler words
  text = text.replace(/^(uh+|um+|er+|ah+|hmm+)[,\s]*/i, '');
  // Remove mid-sentence fillers
  text = text.replace(/\s+(uh+|um+|er+|ah+)[,\s]+/gi, ' ');
  // Deduplicate consecutive identical words
  text = deduplicateWords(text);
  // Deduplicate repeated phrases
  text = deduplicatePhrases(text);
  // Apply safety vocabulary corrections
  text = applySafetyCorrections(text);
  // Collapse multiple spaces
  text = text.replace(/\s{2,}/g, ' ').trim();
  // Capitalise first letter
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return text;
};

/**
 * Pick the best alternative from a SpeechRecognitionResultList entry.
 * Prefers the alternative with the highest confidence above MIN_CONFIDENCE.
 */
const MIN_CONFIDENCE = 0.35;
const pickBestAlternative = (result: any): string | null => {
  let best = '';
  let bestConf = -1;
  for (let i = 0; i < result.length; i++) {
    const alt = result[i];
    const conf = typeof alt.confidence === 'number' ? alt.confidence : 1;
    if (conf > bestConf) {
      bestConf = conf;
      best = alt.transcript || '';
    }
  }
  if (bestConf < MIN_CONFIDENCE && bestConf !== 1) return null; // 1 = browser didn't supply confidence
  return best.trim() || null;
};

const getFriendlyVoiceError = (error: string) => {
  switch (error) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Microphone access is blocked. Please allow microphone permissions and try again.';
    case 'no-speech':
      return 'No speech detected. Please speak clearly and try again.';
    case 'audio-capture':
      return 'Unable to access the microphone. Check your device settings and try again.';
    case 'network':
      return 'A network issue prevented voice capture. Please check your connection.';
    case 'aborted':
      return 'Voice capture was stopped.';
    default:
      return `Voice capture failed: ${error}`;
  }
};

const buildSmartSummary = (text: string, incidentType: string) => {
  if (!text) return '';
  const n = text.toLowerCase();
  const typeLabel = INCIDENT_TYPES.find(item => item.value === incidentType)?.label || 'Incident';
  if (/electrical|wiring|shock|spark|panel|transformer|inverter/.test(n))
    return `${typeLabel} detected with elevated electrical risk. Immediate de-energisation and area isolation recommended.`;
  if (/fire|smoke|flame/.test(n))
    return `${typeLabel} detected with immediate fire hazard. Emergency response and evacuation required.`;
  if (/gas|fume|vapour|leakage/.test(n))
    return `${typeLabel} detected with gas/fume exposure risk. Ventilate area and restrict access immediately.`;
  if (/slip|trip|wet floor|oil/.test(n))
    return `${typeLabel} detected near a wet or slippery surface. Place warning signs and dry the area.`;
  if (/spill|leak|chemical/.test(n))
    return `${typeLabel} detected with chemical contamination risk. Contain spill and notify EHS team.`;
  if (/height|scaffold|crane|fall from/.test(n))
    return `${typeLabel} detected involving work at height. Inspect fall protection and restrict access.`;
  if (/confined space/.test(n))
    return `${typeLabel} detected in confined space. Ensure atmospheric testing and standby personnel.`;
  if (/hot work/.test(n))
    return `${typeLabel} detected during hot work activity. Verify permit validity and fire watch.`;
  if (/forklift|vehicle/.test(n))
    return `${typeLabel} detected involving mobile equipment. Segregate pedestrian and vehicle zones.`;
  if (/ppe|helmet|glove|goggles|vest/.test(n))
    return `${typeLabel} detected with PPE non-compliance. Enforce PPE policy and conduct toolbox talk.`;
  if (/near miss/.test(n))
    return `${typeLabel} reported. Investigate root cause immediately to prevent recurrence.`;
  return `${typeLabel} identified with safety concerns. Investigate root cause and implement corrective actions.`;
};

const getSafetyRecommendationText = (incidentType: string) => {
  switch (incidentType || 'other') {
    case 'fire':
      return [
        'Isolate all ignition sources and activate fire alarm immediately.',
        'Evacuate the area and alert the fire response team.',
        'Inspect fire suppression equipment; replace damaged PPE.',
        'Conduct fire watch for at least 30 minutes post-incident.',
      ];
    case 'electrical':
      return [
        'De-energise affected equipment using LOTO procedure before inspection.',
        'Use insulated tools and wear Class E electrical PPE.',
        'Secure the electrical panel/transformer room and restrict access.',
        'Engage a qualified electrician for inspection before re-energising.',
      ];
    case 'spill':
      return [
        'Contain the spill immediately using absorbent materials.',
        'Post chemical hazard warning signs and stop work in the area.',
        'Notify EHS team and follow chemical spill response procedure.',
        'Review MSDS/SDS and update chemical handling procedures.',
      ];
    case 'fall_from_height':
      return [
        'Inspect all guardrails, harnesses, and fall arrest systems.',
        'Ensure valid Working at Height permit is in place.',
        'Dry slippery surfaces and place anti-slip matting.',
        'Conduct toolbox talk on fall protection with all workers.',
      ];
    case 'near_miss':
      return [
        'Investigate the near miss immediately using 5-Why analysis.',
        'Share findings in a safety briefing with the crew.',
        'Apply preventive controls and update risk assessment.',
        'Record in near-miss register and track corrective actions.',
      ];
    case 'chemical_exposure':
      return [
        'Remove affected person from exposure area immediately.',
        'Provide first aid per MSDS/SDS instructions.',
        'Ventilate the area and identify the source of exposure.',
        'Review chemical storage and handling procedures.',
      ];
    case 'vehicle_accident':
      return [
        'Segregate pedestrian and vehicle movement zones.',
        'Inspect forklift/vehicle for mechanical defects.',
        'Review traffic management plan on site.',
        'Conduct defensive driving refresher for all operators.',
      ];
    case 'equipment_failure':
      return [
        'Isolate and tag-out the failed equipment immediately.',
        'Conduct root cause analysis before returning to service.',
        'Review preventive maintenance schedule.',
        'Inspect similar equipment for the same defect.',
      ];
    default:
      return [
        'Document the incident details clearly and completely.',
        'Assign a responsible person to investigate the root cause.',
        'Implement corrective actions and monitor the area closely.',
        'Share lessons learned with the team in next safety meeting.',
      ];
  }
};

const getDraftFromStorage = (draftKey: string) => {
  try {
    const saved = localStorage.getItem(draftKey);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

const serializeDraft = (values: Record<string, any>, attachments: any[]) => {
  const payload = { ...values };
  if (payload.date_time_incident) {
    payload.date_time_incident = payload.date_time_incident.toISOString?.() || payload.date_time_incident;
  }
  payload.attachments = attachments.map(file => ({ uid: file.uid, name: file.name, type: file.type, size: file.size }));
  return payload;
};

const extractTextPreview = (text: string) => text?.slice(0, 200);

interface IncidentFormProps {
  mode?: 'create' | 'edit';
  initialData?: Partial<IncidentFormData>;
  onSubmit?: (data: IncidentFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

const IncidentForm: React.FC<IncidentFormProps> = ({
  mode = 'create',
  initialData,
  onSubmit,
  onCancel,
  loading: externalLoading = false,
}) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [smartAnalysis, setSmartAnalysis] = useState({
    riskScore: 0,
    severityPrediction: 'low',
    status: 'Stable',
    hazards: [] as string[],
    priority: 'Moderate',
    summary: '',
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [translationPreview, setTranslationPreview] = useState<string>('');
  const [translationSource, setTranslationSource] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<Array<{ uid: string; name: string; findings: string; extractedText?: string }>>([]);
  const [voiceLanguage, setVoiceLanguage] = useState<typeof LANGUAGE_OPTIONS[number]['value']>('en-US');
  const [currentVoiceField, setCurrentVoiceField] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<string>('Ready to capture voice input');
  const [draftStatus, setDraftStatus] = useState<string>('Draft live saving is enabled');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const activeVoiceFieldRef = useRef<string | null>(null);
  const suppressErrorRef = useRef(false);
  const [analyzedUids, setAnalyzedUids] = useState<string[]>([]);
  const [isProcessingVoiceRef, setIsProcessingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [listeningAnimationRef, setListeningAnimation] = useState(false);

  const title = Form.useWatch('title', form);
  const description = Form.useWatch('description', form);
  const location = Form.useWatch('location', form);
  const reporterName = Form.useWatch('reporter_name', form);
  const immediateActionTaken = Form.useWatch('immediate_action_taken', form);

  const draftKey = buildDraftKey(mode, initialData?.id?.toString());

  const { createIncident, updateIncident, loading: hookLoading } = useIncidents({ autoFetch: false });
  const isLoading = externalLoading || hookLoading || submitting || analysisLoading;

  useEffect(() => {
    setVoiceSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

    apiClient
      .get('/api/auth/departments/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setDepartmentOptions(data.map((d: any) => d.name || d));
      })
      .catch(() => setDepartmentOptions([]));
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      const savedDraft = getDraftFromStorage(draftKey);
      if (savedDraft && !initialData) {
        const parsed = { ...savedDraft };
        if (parsed.date_time_incident) {
          parsed.date_time_incident = dayjs(parsed.date_time_incident);
        }
        form.setFieldsValue(parsed);
        setDraftStatus('Draft restored automatically');
      }
    }
  }, [draftKey, form, initialData, mode]);

  useEffect(() => {
    if (mode === 'create') {
      const user = useAuthStore.getState();
      const name = user.name || user.username || '';
      if (name && !form.getFieldValue('reporter_name')) {
        form.setFieldValue('reporter_name', name);
      }
    }
  }, [form, mode]);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.setFieldsValue({
        title: initialData.title,
        description: initialData.description,
        incident_type: initialData.incident_type,
        severity_level: initialData.severity_level,
        location: initialData.location,
        department: initialData.department,
        date_time_incident: initialData.date_time_incident ? dayjs(initialData.date_time_incident) : null,
        reporter_name: initialData.reporter_name,
        immediate_action_taken: initialData.immediate_action_taken,
        potential_causes: initialData.potential_causes,
        probability_score: initialData.probability_score,
        impact_score: initialData.impact_score,
        estimated_cost: initialData.estimated_cost,
        cost_category: initialData.cost_category,
        regulatory_framework: initialData.regulatory_framework,
        regulatory_reportable: initialData.regulatory_reportable,
        business_impact: initialData.business_impact,
        production_impact_hours: initialData.production_impact_hours,
        personnel_affected_count: initialData.personnel_affected_count,
        weather_conditions: initialData.weather_conditions,
        environmental_factors: initialData.environmental_factors,
        equipment_involved: initialData.equipment_involved,
        equipment_serial_numbers: initialData.equipment_serial_numbers,
        work_process: initialData.work_process,
        work_permit_number: initialData.work_permit_number,
        safety_procedures_followed: initialData.safety_procedures_followed,
        family_notified: initialData.family_notified,
        media_attention: initialData.media_attention,
      });
    }
  }, [initialData, mode, form]);

  const saveDraft = useCallback(
    debounce(() => {
      if (mode !== 'create') return;
      const values = form.getFieldsValue(true);
      const draftData = serializeDraft(values, fileList);
      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        setDraftStatus(`Draft saved at ${new Date().toLocaleTimeString()}`);
      } catch {
        setDraftStatus('Unable to save draft in browser storage.');
      }
    }, 1500),
    [draftKey, fileList, form, mode],
  );

  useEffect(() => {
    if (mode !== 'create') return;
    saveDraft();
    return () => {
      saveDraft.cancel();
    };
  }, [description, immediateActionTaken, location, reporterName, title, fileList, saveDraft, mode]);

  const getSmartDefaults = async () => {
    const text = [title, description, location].filter(Boolean).join(' ');
    if (!text) {
      return;
    }

    setAnalysisLoading(true);
    try {
      const prediction = await predictIncidents({ title, description, location });
      const recommended = await getSafetyRecommendations({
        incident_type: form.getFieldValue('incident_type'),
        title,
        description,
        location,
        department: form.getFieldValue('department'),
      }).catch(() => ({ ppe: [], precautions: [], controls: [] }));

      const incidentType =
        form.getFieldValue('incident_type') ||
        guessIncidentTypeFromText(prediction?.possible_incidents?.[0] || text);
      const severity =
        form.getFieldValue('severity_level') ||
        (prediction?.severity_prediction as string) ||
        guessSeverityFromText(text);
      const department = form.getFieldValue('department') || guessDepartmentFromText(text);
      const hazards = prediction?.unsafe_conditions?.length
        ? prediction.unsafe_conditions
        : guessHazardTags(text);
      const summaryText = buildSmartSummary(text, incidentType);

      setSmartAnalysis({
        riskScore: prediction?.incident_probability_score || Math.round(Math.random() * 80 + 20),
        severityPrediction: severity,
        status: prediction?.warning_level ? prediction.warning_level.toUpperCase() : 'Stable',
        hazards,
        priority: prediction?.confidence ? 'High' : 'Medium',
        summary: summaryText,
      });
      setRecommendations(recommended?.precautions?.length
        ? recommended.precautions
        : getSafetyRecommendationText(incidentType));

      const autoFillUpdates: Partial<Record<string, any>> = {};
      if (!form.getFieldValue('incident_type')) autoFillUpdates.incident_type = incidentType;
      if (!form.getFieldValue('severity_level')) autoFillUpdates.severity_level = severity;
      if (!form.getFieldValue('department')) autoFillUpdates.department = department;
      if (!form.getFieldValue('potential_causes')) autoFillUpdates.potential_causes = hazards.join(', ');
      if (!form.getFieldValue('immediate_action_taken')) autoFillUpdates.immediate_action_taken = recommended?.controls?.join('; ') || '';
      if (Object.keys(autoFillUpdates).length > 0) {
        form.setFieldsValue(autoFillUpdates);
      }
    } catch (err) {
      const textFallback = [title, description, location].filter(Boolean).join(' ');
      const incidentType = guessIncidentTypeFromText(textFallback);
      const severity = guessSeverityFromText(textFallback);
      setSmartAnalysis({
        riskScore: 45,
        severityPrediction: severity,
        status: 'Review',
        hazards: guessHazardTags(textFallback),
        priority: 'Medium',
        summary: buildSmartSummary(textFallback, incidentType),
      });
      setRecommendations(getSafetyRecommendationText(incidentType));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const debouncedSmartDefaults = useCallback(debounce(getSmartDefaults, 1000), [title, description, location]);

  useEffect(() => {
    debouncedSmartDefaults();
    return () => debouncedSmartDefaults.cancel();
  }, [title, description, location, debouncedSmartDefaults]);

  const abortVoiceRecognition = useCallback((silent = false) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    suppressErrorRef.current = silent;
    try {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onstart = null;
      recognition.onend = null;
      recognition.abort?.();
    } catch {
      try {
        recognition.stop?.();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
    activeVoiceFieldRef.current = null;
  }, []);

  const stopVoiceRecognition = useCallback((statusMessage = 'Microphone inactive') => {
    abortVoiceRecognition(true);
    setCurrentVoiceField(null);
    setAudioStatus(statusMessage);
  }, [abortVoiceRecognition]);

  useEffect(() => {
    return () => {
      abortVoiceRecognition(true);
    };
  }, [abortVoiceRecognition]);

  const handleVoiceInput = async (field: string) => {
    if (!isSpeechRecognitionSupported()) {
      message.error('Voice recognition is not supported in this browser.');
      setAudioStatus('Voice recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      message.error('Voice recognition is not supported in this browser.');
      setAudioStatus('Voice recognition is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      if (activeVoiceFieldRef.current === field) {
        stopVoiceRecognition('Microphone stopped');
        return;
      }
      stopVoiceRecognition('Switching microphone');
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    activeVoiceFieldRef.current = field;
    suppressErrorRef.current = false;
    setIsProcessingVoice(false);
    setInterimTranscript('');
    
    // Enable interim results for live feedback
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = voiceLanguage;

    // Provide safety vocabulary hints via SpeechGrammarList if supported
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (SpeechGrammarList) {
      const safetyTerms = [
        'PPE', 'EHS', 'LTI', 'PTW', 'near miss', 'hot work', 'confined space',
        'working at height', 'electrical hazard', 'chemical spill', 'gas leakage',
        'fire incident', 'emergency shutdown', 'scaffold', 'forklift', 'crane',
        'transformer', 'inverter room', 'panel room', 'control panel', 'first aid',
        'lost time injury', 'safety observation', 'PPE violation', 'unsafe condition',
        'slip and fall', 'machine breakdown', 'equipment damage',
      ];
      const grammar = `#JSGF V1.0; grammar safety; public <safety> = ${safetyTerms.join(' | ')};`;
      const grammarList = new SpeechGrammarList();
      grammarList.addFromString(grammar, 1);
      recognition.grammars = grammarList;
    }

    recognition.onstart = () => {
      setCurrentVoiceField(field);
      setAudioStatus(`🎤 Listening for ${VOICE_FIELD_LABELS[field]}...`);
      setListeningAnimation(true);
      setInterimTranscript('');
    };

    // Handle interim results for live feedback (but don't commit to form)
    recognition.onresult = async (event: any) => {
      let interimText = '';
      let finalTranscript = '';
      
      // Separate interim and final results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimText += transcript;
        }
      }
      
      // Show interim results as the user speaks
      if (interimText && !finalTranscript) {
        setInterimTranscript(interimText);
        setAudioStatus(`Voice detected: "${interimText.slice(0, 50)}..."`);
        return; // Don't process interim results to form yet
      }

      // Only process when we get final results
      if (!finalTranscript) {
        return;
      }

      // CRITICAL FIX: Prevent duplicate processing
      if (isProcessingVoiceRef) {
        return;
      }
      setIsProcessingVoice(true);

      try {
        setListeningAnimation(false);
        setAudioStatus('Processing captured speech...');
        
        // Use pickBestAlternative for confidence filtering across 3 alternatives
        const lastResult = event.results[event.results.length - 1];
        const bestTranscript = pickBestAlternative(lastResult);
        if (!bestTranscript) {
          setAudioStatus('Speech quality too low. Please try again.');
          setIsProcessingVoice(false);
          return;
        }

        const mappedLanguage = mapLocaleToLanguage(voiceLanguage);
        let finalText = bestTranscript;

        // CRITICAL FIX: Apply comprehensive cleaning to remove duplicates
        finalText = cleanTranscript(finalText);

        if (mappedLanguage !== 'en') {
          try {
            const translation = await translateToEnglish(finalText, mappedLanguage, 'incident', field);
            finalText = translation.professional_english || finalText;
            setTranslationPreview(translation.professional_english || '');
            setTranslationSource(`Detected ${translation.language || voiceLanguage}`);
          } catch {
            // Use the cleaned original text if translation fails
          }
        }

        // Field-specific post-processing
        finalText = postProcessForField(finalText, field);

        // Replace vs. append logic based on field type
        const fieldType = field === 'description' || field === 'immediate_action_taken' ? 'textarea' : 'input';
        let updatedValue = finalText;
        
        if (fieldType === 'textarea') {
          const existingValue = form.getFieldValue(field)?.toString().trim() || '';
          if (existingValue && existingValue.length > 10) {
            updatedValue = `${existingValue}. ${finalText}`;
          }
        } else {
          updatedValue = finalText;
        }

        form.setFieldValue(field, updatedValue);
        setAudioStatus(`✓ Voice captured successfully: "${finalText.slice(0, 60)}${finalText.length > 60 ? '...' : ''}"`);
        
        // Trigger smart analysis after capturing voice input
        setTimeout(() => {
          debouncedSmartDefaults();
        }, 300);

      } catch (err: any) {
        const friendlyMessage = getFriendlyVoiceError(err?.message || 'processing_error');
        message.error(friendlyMessage);
        setAudioStatus(friendlyMessage);
      } finally {
        setIsProcessingVoice(false);
        setCurrentVoiceField(null);
        activeVoiceFieldRef.current = null;
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: any) => {
      const errorType = event.error || event;
      if (suppressErrorRef.current || errorType === 'aborted') {
        return;
      }

      const friendlyMessage = getFriendlyVoiceError(errorType);
      if (errorType === 'no-speech') {
        message.warning(friendlyMessage);
        setAudioStatus('⚠️ No speech detected. Speak clearly and try again.');
      } else if (errorType === 'audio-capture') {
        message.error(friendlyMessage);
        setAudioStatus('❌ Microphone access denied. Check permissions.');
      } else if (errorType === 'network') {
        message.error(friendlyMessage);
        setAudioStatus('❌ Network error. Check your connection.');
      } else {
        message.error(friendlyMessage);
        setAudioStatus(`❌ Voice error: ${friendlyMessage}`);
      }
      setCurrentVoiceField(null);
      setListeningAnimation(false);
      setInterimTranscript('');
      abortVoiceRecognition(true);
    };

    recognition.onend = () => {
      setListeningAnimation(false);
      if (suppressErrorRef.current) {
        setAudioStatus('Microphone inactive');
      } else if (activeVoiceFieldRef.current === field && !isProcessingVoiceRef) {
        setAudioStatus('Recording stopped');
      }
      setCurrentVoiceField(null);
      setInterimTranscript('');
      recognitionRef.current = null;
      activeVoiceFieldRef.current = null;
    };

    try {
      recognition.start();
    } catch (error: any) {
      const friendlyMessage = getFriendlyVoiceError(error?.name || 'unknown');
      message.error(friendlyMessage);
      setAudioStatus(friendlyMessage);
      recognitionRef.current = null;
      activeVoiceFieldRef.current = null;
      setListeningAnimation(false);
      setInterimTranscript('');
    }
  };

  const validateSmartForm = (values: any) => {
    const errorMessages: string[] = [];
    const warningMessages: string[] = [];
    const descriptionText = values.description?.trim() || '';

    if (!descriptionText || descriptionText.length < 30) {
      errorMessages.push('Incident description must be at least 30 characters for a strong report.');
    }
    if (!values.title || values.title.trim().length < 5) {
      errorMessages.push('Incident title must be descriptive and at least 5 characters.');
    }
    if ((values.severity_level === 'high' || values.severity_level === 'critical') && !values.immediate_action_taken) {
      warningMessages.push('High severity incidents should include immediate corrective actions.');
    }
    if (descriptionText.match(/unknown|not sure|don't know|maybe/)) {
      warningMessages.push('Please provide clearer detail in the description for better analysis.');
    }
    if (descriptionText.length < 60) {
      warningMessages.push('Longer descriptions help the AI auto-detect hazards and recommendations.');
    }

    setWarnings([...warningMessages]);

    if (errorMessages.length) {
      message.error(errorMessages.join(' '));
      return false;
    }
    if (warningMessages.length) {
      message.warning(warningMessages.join(' '));
    }
    return true;
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const formData: IncidentFormData = {
        title: values.title,
        description: values.description,
        incident_type: values.incident_type,
        severity_level: values.severity_level,
        location: values.location,
        department: values.department,
        date_time_incident: values.date_time_incident.toISOString(),
        reporter_name: values.reporter_name,
        immediate_action_taken: values.immediate_action_taken || '',
        potential_causes: values.potential_causes || '',
        attachments: fileList.map(file => file.originFileObj).filter(Boolean),
        probability_score: values.probability_score,
        impact_score: values.impact_score,
        estimated_cost: values.estimated_cost,
        cost_category: values.cost_category,
        regulatory_framework: values.regulatory_framework,
        regulatory_reportable: values.regulatory_reportable,
        business_impact: values.business_impact,
        production_impact_hours: values.production_impact_hours,
        personnel_affected_count: values.personnel_affected_count,
        weather_conditions: values.weather_conditions,
        environmental_factors: values.environmental_factors,
        equipment_involved: values.equipment_involved,
        equipment_serial_numbers: values.equipment_serial_numbers,
        work_process: values.work_process,
        work_permit_number: values.work_permit_number,
        safety_procedures_followed: values.safety_procedures_followed,
        family_notified: values.family_notified,
        media_attention: values.media_attention,
      };

      if (onSubmit) {
        await onSubmit(formData);
      } else if (mode === 'create') {
        await createIncident(formData);
      } else if (mode === 'edit' && initialData?.id) {
        await updateIncident(initialData.id.toString(), formData);
      }

      message.success(`Incident ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      if (mode === 'create') {
        localStorage.removeItem(draftKey);
        form.resetFields();
        setFileList([]);
        setDraftStatus('Draft cleared after successful submission');
      }
      if (mode === 'edit') {
        setDraftStatus('');
      }
    } catch (error: any) {
      message.destroy();
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400 && data) {
          const errorMessages: string[] = [];
          for (const [field, messages] of Object.entries(data)) {
            const fieldErrors = Array.isArray(messages) ? messages : [messages];
            errorMessages.push(`${field}: ${fieldErrors.join(', ')}`);
          }
          message.error(`Validation Error: ${errorMessages.join('; ')}`);
        } else if (status === 500) {
          message.error('Server Error: Please check your data and try again. If the problem persists, contact support.');
        } else {
          message.error(`Error ${status}: ${data.detail || data.message || 'An unexpected error occurred'}`);
        }
      } else if (error.request) {
        message.error('Network Error: Unable to connect to server. Please check your connection and try again.');
      } else {
        message.error(`Error: ${error.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onFinish = (values: any) => {
    if (!validateSmartForm(values)) {
      return;
    }
    modal.confirm({
      title: `Confirm ${mode === 'create' ? 'Submission' : 'Update'}`,
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to ${mode === 'create' ? 'submit this incident report' : 'update this incident'}?`,
      okText: 'Yes, proceed',
      cancelText: 'No, review again',
      onOk: () => handleSubmit(values),
    });
  };

  const onFinishFailed = () => {
    message.error('Please fill in all required fields correctly.');
  };

  const disabledTime = (current: dayjs.Dayjs) => {
    if (!current) {
      return {};
    }
    const now = dayjs();
    if (current.isSame(now, 'day')) {
      return {
        disabledHours: () => {
          const hours = [];
          for (let i = now.hour() + 1; i < 24; i += 1) {
            hours.push(i);
          }
          return hours;
        },
        disabledMinutes: hour => {
          if (hour === now.hour()) {
            const minutes = [];
            for (let i = now.minute() + 1; i < 60; i += 1) {
              minutes.push(i);
            }
            return minutes;
          }
          return [];
        },
        disabledSeconds: (hour, minute) => {
          if (hour === now.hour() && minute === now.minute()) {
            const seconds = [];
            for (let i = now.second() + 1; i < 60; i += 1) {
              seconds.push(i);
            }
            return seconds;
          }
          return [];
        },
      };
    }
    return {};
  };

  const processAttachmentAnalysis = async (file: any) => {
    if (!file.originFileObj) return;
    const uid = file.uid;
    if (analyzedUids.includes(uid)) return;

    const formData = new FormData();
    formData.append('file', file.originFileObj);
    setAnalysisLoading(true);
    try {
      const isImage = file.type.startsWith('image/');
      const result = isImage
        ? await analyzeSafetyImage(formData).catch(() => null)
        : await analyzeSafetyDocument(formData).catch(() => null);
      const extractedText = result?.extracted_text || result?.text || result?.description || '';
      const findings = result?.findings || result?.summary || extractTextPreview(extractedText) || 'No significant hazards detected on file analysis.';
      setAnalysisResults(prev => [...prev, { uid, name: file.name, findings, extractedText }]);
      setAnalyzedUids(prev => [...prev, uid]);
      if (extractedText && !form.getFieldValue('description')) {
        form.setFieldValue('description', `${extractedText}`);
      }
      if (extractedText && !form.getFieldValue('title')) {
        form.setFieldValue('title', extractedText.split(/[\.\n]/).filter(Boolean).slice(0, 1).join(' ').slice(0, 80));
      }
    } catch {
      setAnalysisResults(prev => [...prev, { uid, name: file.name, findings: 'Unable to analyze file automatically at this time.' }]);
      setAnalyzedUids(prev => [...prev, uid]);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleUploadChange = (info: any) => {
    const nextList = info.fileList.slice(0, 5);
    setFileList(nextList);
    const newFiles = nextList.filter(file => file.originFileObj && !analyzedUids.includes(file.uid));
    newFiles.forEach(file => processAttachmentAnalysis(file));
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
      <Spin spinning={isLoading}>
      <Card
        title={`${mode === 'create' ? 'Create' : 'Edit'} Incident Report`}
        style={{ maxWidth: 1200, margin: 'auto' }}
        extra={onCancel ? <Button onClick={onCancel} disabled={isLoading}>Cancel</Button> : null}
      >
        {mode === 'edit' && initialData && (
          <Alert
            message={`Editing Incident: ${initialData.title || initialData.incident_type || 'Unknown'}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Card type="inner" title="Translation / Voice Input" style={{ marginBottom: 24, background: '#f0f5ff' }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Form.Item label="Speech Language" style={{ marginBottom: 0 }}>
                <Select value={voiceLanguage} onChange={setVoiceLanguage} size="large" disabled={currentVoiceField !== null}>
                  {LANGUAGE_OPTIONS.map(lang => (
                    <Option key={lang.value} value={lang.value}>{lang.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={16}>
              <Space wrap>
                <Button 
                  icon={<AudioOutlined style={{ animation: listeningAnimationRef && currentVoiceField === 'title' ? 'pulse 1s infinite' : 'none' }} />} 
                  type={currentVoiceField === 'title' ? 'primary' : 'default'} 
                  onClick={() => handleVoiceInput('title')} 
                  disabled={!voiceSupported}
                  loading={currentVoiceField === 'title'}
                >
                  Voice Title
                </Button>
                <Button 
                  icon={<AudioOutlined style={{ animation: listeningAnimationRef && currentVoiceField === 'description' ? 'pulse 1s infinite' : 'none' }} />} 
                  type={currentVoiceField === 'description' ? 'primary' : 'default'} 
                  onClick={() => handleVoiceInput('description')} 
                  disabled={!voiceSupported}
                  loading={currentVoiceField === 'description'}
                >
                  Voice Description
                </Button>
                <Button 
                  icon={<AudioOutlined style={{ animation: listeningAnimationRef && currentVoiceField === 'location' ? 'pulse 1s infinite' : 'none' }} />} 
                  type={currentVoiceField === 'location' ? 'primary' : 'default'} 
                  onClick={() => handleVoiceInput('location')} 
                  disabled={!voiceSupported}
                  loading={currentVoiceField === 'location'}
                >
                  Voice Location
                </Button>
                <Button 
                  icon={<AudioOutlined style={{ animation: listeningAnimationRef && currentVoiceField === 'reporter_name' ? 'pulse 1s infinite' : 'none' }} />} 
                  type={currentVoiceField === 'reporter_name' ? 'primary' : 'default'} 
                  onClick={() => handleVoiceInput('reporter_name')} 
                  disabled={!voiceSupported}
                  loading={currentVoiceField === 'reporter_name'}
                >
                  Voice Reporter
                </Button>
                <Button 
                  icon={<AudioOutlined style={{ animation: listeningAnimationRef && currentVoiceField === 'immediate_action_taken' ? 'pulse 1s infinite' : 'none' }} />} 
                  type={currentVoiceField === 'immediate_action_taken' ? 'primary' : 'default'} 
                  onClick={() => handleVoiceInput('immediate_action_taken')} 
                  disabled={!voiceSupported}
                  loading={currentVoiceField === 'immediate_action_taken'}
                >
                  Voice Corrective Action
                </Button>
              </Space>
              <div style={{ marginTop: 12, color: voiceSupported ? '#2372f4' : '#999', fontWeight: 500 }}>
                {audioStatus}
              </div>
              {interimTranscript && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                  Live: {interimTranscript.slice(0, 100)}
                </div>
              )}
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} md={24}>
              <Button
                icon={<TranslationOutlined />}
                type="default"
                onClick={async () => {
                  const text = form.getFieldValue('description');
                  if (!text) {
                    message.warning('Enter incident description first to translate.');
                    return;
                  }
                  setAnalysisLoading(true);
                  try {
                    const translateResult = await translateToEnglish(text, 'auto', 'incident', 'description');
                    setTranslationSource(`Detected language: ${translateResult.language || 'auto'}`);
                    setTranslationPreview(translateResult.professional_english || translateResult.original);
                    message.success('Translation preview generated');
                  } catch {
                    message.error('Translation service is unavailable.');
                  } finally {
                    setAnalysisLoading(false);
                  }
                }}
              >
                Translate Description
              </Button>
            </Col>
            {translationPreview && (
              <Col xs={24} style={{ marginTop: 16 }}>
                <Card type="inner" title={`Translated Preview (${translationSource || 'English'})`}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{translationPreview}</p>
                </Card>
              </Col>
            )}
            {recommendations.length > 0 && (
              <Col xs={24} style={{ marginTop: 16 }}>
                <Card type="inner" title="Smart Safety Recommendations">
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {recommendations.map((item, idx) => (
                      <li key={`${item}-${idx}`} style={{ marginBottom: 8 }}>{item}</li>
                    ))}
                  </ul>
                </Card>
              </Col>
            )}
          </Row>
        </Card>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          size="large"
          disabled={isLoading}
        >
          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Basic Information
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Incident Title"
                name="title"
                rules={[
                  { required: true, message: 'Please enter incident title', whitespace: true },
                  { min: 5, message: 'Title must be at least 5 characters' },
                  { max: 255, message: 'Title cannot exceed 255 characters' },
                ]}
              >
                <Input
                  placeholder="Brief description of the incident"
                  size="large"
                  maxLength={255}
                  showCount
                  suffix={
                    <Tooltip title="Speak the incident title">
                      <Button
                        type="text"
                        icon={<AudioOutlined />}
                        onClick={() => handleVoiceInput('title')}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Date and Time of Incident&nbsp;
                    <Tooltip title="Select the date and time when the incident occurred. Future dates are not allowed.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="date_time_incident"
                rules={[
                  { required: true, message: 'Please select date and time of incident' },
                  {
                    validator: (_, value) =>
                      value && value.isAfter(dayjs())
                        ? Promise.reject(new Error('Date/time cannot be in the future'))
                        : Promise.resolve(),
                  },
                ]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  disabledDate={current => current && current > dayjs().endOf('day')}
                  disabledTime={disabledTime}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Location"
                name="location"
                rules={[
                  { required: true, message: 'Please enter location' },
                  { max: 255, message: 'Maximum 255 characters' },
                ]}
              >
                <Input
                  placeholder="Specific location where incident occurred"
                  size="large"
                  suffix={
                    <Tooltip title="Speak the incident location">
                      <Button
                        type="text"
                        icon={<AudioOutlined />}
                        onClick={() => handleVoiceInput('location')}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Department&nbsp;
                    <Tooltip title="Select the department where the incident occurred.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="department"
                rules={[{ required: true, message: 'Please select department' }]}
              >
                <Select placeholder="Select department" size="large">
                  {departmentOptions.map(dep => (
                    <Option key={dep} value={dep}>{dep}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Reporter Name&nbsp;
                    {mode === 'create' && (
                      <Tooltip title="Automatically filled with your name">
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      </Tooltip>
                    )}
                  </>
                }
                name="reporter_name"
                rules={[
                  { required: true, message: 'Please enter reporter name' },
                  { min: 2, message: 'Name must be at least 2 characters' },
                  { max: 100, message: 'Name cannot exceed 100 characters' },
                ]}
              >
                <Input
                  placeholder="Name of person reporting the incident"
                  size="large"
                  suffix={
                    <Tooltip title="Speak the reporter name">
                      <Button
                        type="text"
                        icon={<AudioOutlined />}
                        onClick={() => handleVoiceInput('reporter_name')}
                      />
                    </Tooltip>
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Type of Incident&nbsp;
                    <Tooltip title="Select the type of incident that occurred.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="incident_type"
                rules={[{ required: true, message: 'Please select type of incident' }]}
              >
                <Select placeholder="Select type of incident" size="large">
                  {INCIDENT_TYPES.map(type => (
                    <Option key={type.value} value={type.value}> {type.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Severity Level&nbsp;
                    <Tooltip title="Select the severity level of the incident.">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="severity_level"
                rules={[{ required: true, message: 'Please select severity level' }]}
              >
                <Select placeholder="Select severity level" size="large">
                  {SEVERITY_LEVELS.map(level => (
                    <Option key={level.value} value={level.value}>
                      <Tag color={level.color}>{level.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              {form.getFieldValue('severity_level') && (
                <Tag
                  color={getSeverityColor(form.getFieldValue('severity_level'))}
                  style={{ marginTop: 8, fontSize: 16, padding: '4px 12px' }}
                >
                  {SEVERITY_LEVELS.find(s => s.value === form.getFieldValue('severity_level'))?.label}
                </Tag>
              )}
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Description&nbsp;
                    <Tooltip title="Provide a detailed description of the incident (10-1000 characters).">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="description"
                rules={[
                  { required: true, message: 'Please enter incident description' },
                  { min: 10, message: 'Description must be at least 10 characters' },
                  { max: 1000, message: 'Description cannot exceed 1000 characters' },
                ]}
              >
                <div style={{ position: 'relative' }}>
                  <TextArea
                    rows={5}
                    placeholder="Detailed description of what happened..."
                    showCount
                    maxLength={1000}
                    size="large"
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<AudioOutlined />}
                    onClick={() => handleVoiceInput('description')}
                    style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 2 }}
                  />
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Additional Information
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Immediate Action Taken"
                name="immediate_action_taken"
                rules={[{ max: 500, message: 'Maximum 500 characters' }]}
              >
                <div style={{ position: 'relative' }}>
                  <TextArea
                    rows={3}
                    placeholder="Describe any immediate actions taken after the incident..."
                    showCount
                    maxLength={500}
                    size="large"
                  />
                  <Button
                    type="default"
                    shape="circle"
                    icon={<AudioOutlined />}
                    onClick={() => handleVoiceInput('immediate_action_taken')}
                    style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 2 }}
                  />
                </div>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Potential Causes"
                name="potential_causes"
                rules={[{ max: 500, message: 'Maximum 500 characters' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Initial assessment of potential causes..."
                  showCount
                  maxLength={500}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Risk Assessment
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={8}>
              <Form.Item
                label={
                  <>
                    Probability Score&nbsp;
                    <Tooltip title="Rate the likelihood of this incident recurring (1=Very Unlikely, 5=Almost Certain)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="probability_score"
              >
                <Select placeholder="Select probability (1-5)" size="large">
                  {[1, 2, 3, 4, 5].map(score => (
                    <Option key={score} value={score}>
                      {score} - {score === 1 ? 'Very Unlikely' : score === 2 ? 'Unlikely' : score === 3 ? 'Possible' : score === 4 ? 'Likely' : 'Almost Certain'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label={
                  <>
                    Impact Score&nbsp;
                    <Tooltip title="Rate the severity of impact (1=Negligible, 5=Catastrophic)">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="impact_score"
              >
                <Select placeholder="Select impact (1-5)" size="large">
                  {[1, 2, 3, 4, 5].map(score => (
                    <Option key={score} value={score}>
                      {score} - {score === 1 ? 'Negligible' : score === 2 ? 'Minor' : score === 3 ? 'Moderate' : score === 4 ? 'Major' : 'Catastrophic'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label={
                  <>
                    Business Impact&nbsp;
                    <Tooltip title="Overall impact on business operations">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="business_impact"
              >
                <Select placeholder="Select business impact" size="large">
                  {BUSINESS_IMPACT_LEVELS.map(level => (
                    <Option key={level.value} value={level.value}>
                      <Tag color={level.color}>{level.label}</Tag>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Production Impact (Hours)&nbsp;
                    <Tooltip title="Number of production hours lost due to this incident">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="production_impact_hours"
              >
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Hours of production lost"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Personnel Affected&nbsp;
                    <Tooltip title="Number of people affected by this incident">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="personnel_affected_count"
              >
                <Input
                  type="number"
                  min={0}
                  placeholder="Number of people affected"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Financial Impact
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Estimated Cost&nbsp;
                    <Tooltip title="Estimated financial impact of this incident">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="estimated_cost"
              >
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Estimated cost (USD)"
                  size="large"
                  prefix="$"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Cost Category&nbsp;
                    <Tooltip title="Primary category of cost associated with this incident">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="cost_category"
              >
                <Select placeholder="Select cost category" size="large">
                  {COST_CATEGORIES.map(category => (
                    <Option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Regulatory & Compliance
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Regulatory Framework&nbsp;
                    <Tooltip title="Applicable regulatory framework for this incident">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="regulatory_framework"
              >
                <Select placeholder="Select regulatory framework" size="large">
                  {REGULATORY_FRAMEWORKS.map(framework => (
                    <Option key={framework.value} value={framework.value}>{framework.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Regulatory Reportable&nbsp;
                    <Tooltip title="Must this incident be reported to regulatory authorities?">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="regulatory_reportable"
              >
                <Select placeholder="Regulatory reportable?" size="large">
                  <Option value={true}>Yes - Must be reported</Option>
                  <Option value={false}>No - Internal only</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Environmental & Work Context
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Weather Conditions" name="weather_conditions">
                <Input placeholder="Weather conditions at time of incident" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Work Process" name="work_process">
                <Input placeholder="Specific work process being performed" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Work Permit Number" name="work_permit_number">
                <Input placeholder="Work permit or authorization number" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={
                  <>
                    Safety Procedures Followed&nbsp;
                    <Tooltip title="Were proper safety procedures followed?">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                name="safety_procedures_followed"
              >
                <Select placeholder="Safety procedures followed?" size="large">
                  <Option value={true}>✅ Yes - Procedures followed</Option>
                  <Option value={false}>❌ No - Procedures not followed</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24}>
              <Form.Item label="Equipment Involved" name="equipment_involved">
                <TextArea
                  rows={2}
                  placeholder="Equipment, tools, or machinery involved in the incident..."
                  showCount
                  maxLength={500}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Equipment Serial Numbers" name="equipment_serial_numbers">
                <Input placeholder="Serial numbers of equipment involved" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Environmental Factors" name="environmental_factors">
                <Input placeholder="Environmental conditions that contributed" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Communication & Notifications
          </Divider>

          <Row gutter={24}>
            <Col xs={24} sm={12}>
              <Form.Item label="Family Notified" name="family_notified" valuePropName="checked">
                <Select placeholder="Was family notified?" size="large">
                  <Option value={true}>Yes - Family notified</Option>
                  <Option value={false}>No - Family not notified</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Media Attention" name="media_attention" valuePropName="checked">
                <Select placeholder="Media attention?" size="large">
                  <Option value={true}>Yes - Media involved</Option>
                  <Option value={false}>No - No media attention</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 20, fontWeight: 'bold' }}>
            Attachments & OCR
          </Divider>

          <Form.Item
            label={
              <>
                Upload Supporting Files&nbsp;
                <Tooltip title="Upload images, documents, or videos related to the incident. Maximum 5 files, 5MB each.">
                  <InfoCircleOutlined />
                </Tooltip>
              </>
            }
            name="attachments"
            valuePropName="fileList"
            getValueFromEvent={() => fileList}
          >
            <Upload.Dragger
              beforeUpload={file => {
                const isAllowedType = [
                  'image/jpeg',
                  'image/png',
                  'image/gif',
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/msword',
                  'video/mp4',
                ].includes(file.type);
                if (!isAllowedType) {
                  message.error('You can only upload JPG/PNG/GIF/PDF/DOC/DOCX/MP4 files!');
                }
                const isLt5M = file.size / 1024 / 1024 < 5;
                if (!isLt5M) {
                  message.error('File must be smaller than 5MB!');
                }
                return false;
              }}
              onChange={handleUploadChange}
              multiple
              fileList={fileList}
              maxCount={5}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp4"
              listType="picture"
              showUploadList={{
                showPreviewIcon: true,
                showRemoveIcon: true,
                showDownloadIcon: false,
              }}
            >
              <p className="ant-upload-drag-icon" style={{ fontSize: 24 }}>
                <UploadOutlined />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 18 }}>
                Click or drag files to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 14 }}>
                Support for JPG, PNG, GIF, PDF, DOC, DOCX, MP4 files. Maximum 5 files, 5MB each.
              </p>
            </Upload.Dragger>
          </Form.Item>

          {analysisResults.length > 0 && (
            <Card type="inner" title="AI File Analysis" style={{ marginBottom: 24 }}>
              {analysisResults.map(result => (
                <div key={result.uid} style={{ marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>{result.name}</h4>
                  <p style={{ marginBottom: 4, color: '#555' }}>{result.findings}</p>
                  {result.extractedText && (
                    <Alert type="info" showIcon message="Extracted text preview" description={extractTextPreview(result.extractedText)} />
                  )}
                </div>
              ))}
            </Card>
          )}

          <Divider />

          <Form.Item style={{ textAlign: 'center', marginTop: 32 }}>
            <Row gutter={16} justify="center">
              {onCancel && (
                <Col>
                  <Button size="large" onClick={onCancel} disabled={isLoading} style={{ minWidth: 120 }}>
                    Cancel
                  </Button>
                </Col>
              )}
              <Col>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={isLoading}
                  icon={mode === 'create' ? <SendOutlined /> : <SaveOutlined />}
                  style={{ minWidth: 220, height: 50, fontSize: 16 }}
                >
                  {mode === 'create' ? 'Submit Incident Report' : 'Update Incident'}
                </Button>
              </Col>
            </Row>
          </Form.Item>

          {warnings.length > 0 && (
            <Alert
              type="warning"
              message="Smart Validation Suggestions"
              description={warnings.map(warning => <div key={warning}>{warning}</div>)}
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          <div style={{ marginTop: 12, color: '#888', fontSize: 13 }}>
            {draftStatus}
          </div>
        </Form>
      </Card>
    </Spin>
    </>
  );
};

export default IncidentForm;
