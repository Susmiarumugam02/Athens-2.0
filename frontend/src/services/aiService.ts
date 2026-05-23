/**
 * Athens AI Service
 * All AI API calls go through this layer.
 * Gemini API key never touches the frontend.
 */
import { apiClient } from '../lib/api'

const BASE = '/api/gemini'

export interface PTWAnalysis {
  detected_categories: string[]
  hazards: string[]
  controls: string[]
  ppe_requirements: string[]
  checklist: string[]
  permits_needed: string[]
  emergency_procedures: string[]
  toolbox_topics: string[]
  risk: { probability: number; severity: number; score: number; level: string }
  confidence: string
  source: 'gemini' | 'rules' | 'fallback'
}

export interface PTWValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  recommendations: string[]
  risk_score: number
  source: string
}

export interface TranslationResult {
  original: string
  professional_english: string
  detected_activities: string[]
  language: string
  detected_language?: string
  conversion_note?: string
  source: string
}

export interface ChatResponse {
  reply: string
  conversation_id: number
  source: string
}

export interface AIHealth {
  status: string
  gemini_available: boolean
  fallback_mode: boolean
  message: string
}

export interface SmartAutofillResult {
  hazards: string[]
  ppe_requirements: string[]
  checklist: string[]
  emergency_contacts: string[]
  emergency_precautions?: string[]
  isolation_requirements?: string[]
  risk_controls: string[]
  gas_testing_requirements?: string[]
  toolbox_talks: string[]
  required_documents: string[]
  work_procedures: string[]
  work_nature?: 'day' | 'night' | 'both' | string
  permit_category?: string
  source: string
}

export interface SafetyRecommendationResult {
  ppe: string[]
  controls: string[]
  precautions: string[]
  isolation_steps: string[]
  fire_watch: { required: boolean; reason: string }
  standby_personnel: string[]
  barricading: string[]
  rescue_plan: string[]
  gas_testing: string[]
  source: string
}

export interface WorkflowGuidanceResult {
  next_steps: string[]
  required_inputs: string[]
  approval_guidance: string[]
  risk_checks: string[]
  warnings: string[]
  source: string
}

export interface IncidentPredictionResult {
  incident_probability_score: number
  severity_prediction: string
  possible_incidents: string[]
  near_misses: string[]
  unsafe_conditions: string[]
  risk_escalation_triggers: string[]
  recommendations: string[]
  confidence: number
  warning_level: 'normal' | 'watch' | 'warning' | 'critical' | string
  source: string
}

export interface ComplianceValidationResult {
  compliance_score: number
  blocking: boolean
  violations: Array<{ code: string; severity: string; message: string; correction: string }>
  missing_requirements: string[]
  recommended_corrections: string[]
  audit_notes: string[]
  standards: string[]
  source: string
}

export interface LiveMonitoringResult {
  as_of: string
  counts: Record<string, number>
  alerts: Array<Record<string, any>>
  expiring_soon: Array<Record<string, any>>
  source: string
}

// ─── PTW ───────────────────────────────────────────────────────────────────────

export const analyzePTW = (
  description: string,
  permitTypeCategory = '',
  project = ''
): Promise<PTWAnalysis> =>
  apiClient.post(`${BASE}/ptw/`, {
    action: 'analyze',
    description,
    permit_type_category: permitTypeCategory,
    project,
  }).then(r => r.data)

export const validatePTW = (formData: Record<string, any>): Promise<PTWValidation> =>
  apiClient.post(`${BASE}/ptw/`, { action: 'validate', ...formData }).then(r => r.data)

export const translateVoice = (
  transcript: string,
  language: 'auto' | 'en' | 'ta' | 'hi' = 'auto',
  module = 'ptw',
  fieldName = ''
): Promise<TranslationResult> =>
  apiClient.post(`${BASE}/ptw/`, {
    action: 'translate_voice',
    transcript,
    language,
    module,
    field_name: fieldName,
  }).then(r => r.data)

export const translateVoiceAudio = (
  audioBase64: string,
  mimeType: string,
  module = 'ptw',
  fieldName = ''
): Promise<TranslationResult> =>
  apiClient.post(`${BASE}/ptw/`, {
    action: 'translate_voice_audio',
    audio_base64: audioBase64,
    mime_type: mimeType,
    module,
    field_name: fieldName,
  }).then(r => r.data)

export const translateToEnglish = (
  text: string,
  language: 'auto' | 'en' | 'ta' | 'hi' = 'auto',
  module = 'general',
  fieldName = ''
): Promise<TranslationResult> =>
  apiClient.post(`${BASE}/translate/`, {
    text,
    language,
    module,
    field_name: fieldName,
  }).then(r => r.data)

export const smartAutofill = (context: Record<string, any>): Promise<SmartAutofillResult> =>
  apiClient.post(`${BASE}/autofill/`, context).then(r => r.data)

export const getSafetyRecommendations = (context: Record<string, any>): Promise<SafetyRecommendationResult> =>
  apiClient.post(`${BASE}/safety/`, context).then(r => r.data)

export const getWorkflowGuidance = (context: Record<string, any>): Promise<WorkflowGuidanceResult> =>
  apiClient.post(`${BASE}/workflow/`, context).then(r => r.data)

export const predictHazards = (context: Record<string, any>) =>
  apiClient.post(`${BASE}/hazards/`, context).then(r => r.data)

export const predictIncidents = (context: Record<string, any>): Promise<IncidentPredictionResult> =>
  apiClient.post(`${BASE}/incident-prediction/`, context).then(r => r.data)

export const getLiveMonitoring = (): Promise<LiveMonitoringResult> =>
  apiClient.get(`${BASE}/monitoring/`).then(r => r.data)

export const validateCompliance = (context: Record<string, any>): Promise<ComplianceValidationResult> =>
  apiClient.post(`${BASE}/compliance/`, context).then(r => r.data)

export const validateWorkers = (context: Record<string, any>) =>
  apiClient.post(`${BASE}/worker-validation/`, context).then(r => r.data)

export const analyzeSafetyImage = (formData: FormData) =>
  apiClient.post(`${BASE}/image-analysis/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

export const analyzeSafetyDocument = (formData: FormData) =>
  apiClient.post(`${BASE}/document-analysis/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)

// ─── Chat ──────────────────────────────────────────────────────────────────────

export const sendChatMessage = (
  message: string,
  context: { module?: string; project?: string; conversation_id?: number }
): Promise<ChatResponse> =>
  apiClient.post(`${BASE}/chat/`, {
    message,
    module: context.module || 'general',
    project: context.project || '',
    conversation_id: context.conversation_id,
  }).then(r => r.data)

export const getChatHistory = (conversationId: number) =>
  apiClient.get(`${BASE}/conversations/${conversationId}/`).then(r => r.data)

export const clearChatHistory = (conversationId?: number) =>
  conversationId
    ? apiClient.delete(`${BASE}/conversations/${conversationId}/`)
    : apiClient.delete(`${BASE}/conversations/`)

// ─── Incident ─────────────────────────────────────────────────────────────────

export const analyzeIncident = (description: string, incidentType = '') =>
  apiClient.post(`${BASE}/incident/`, { description, incident_type: incidentType }).then(r => r.data)

// ─── Inspection ───────────────────────────────────────────────────────────────

export const generateInspectionChecklist = (area: string, inspectionType = '') =>
  apiClient.post(`${BASE}/inspection/`, { area, inspection_type: inspectionType }).then(r => r.data)

// ─── Health ───────────────────────────────────────────────────────────────────

export const getAIHealth = (): Promise<AIHealth> =>
  apiClient.get(`${BASE}/health/`).then(r => r.data)

// ─── AI Copilot ───────────────────────────────────────────────────────────────

export interface CopilotResponse {
  reply: string
  session_id: number
  source: string
}

export const sendCopilotMessage = (
  message: string,
  opts: { module?: string; session_id?: number; language?: string; context?: Record<string, any> } = {}
): Promise<CopilotResponse> =>
  apiClient.post(`${BASE}/copilot/`, {
    message,
    module: opts.module || 'general',
    session_id: opts.session_id,
    language: opts.language || 'en',
    context: opts.context || {},
  }).then(r => r.data)

// ─── Executive Summary ────────────────────────────────────────────────────────

export const getExecutiveSummary = (period: 'daily' | 'weekly' | 'monthly' = 'weekly') =>
  apiClient.get(`${BASE}/executive-summary/`, { params: { period } }).then(r => r.data)

export const generateExecutiveSummary = (data: Record<string, any>) =>
  apiClient.post(`${BASE}/executive-summary/`, data).then(r => r.data)

// ─── Agent Management ─────────────────────────────────────────────────────────

export const getAgents = () =>
  apiClient.get(`${BASE}/agents/`).then(r => r.data)

export const dispatchAgent = (agentType: string, payload?: Record<string, any>) =>
  apiClient.post(`${BASE}/agents/`, { agent_type: agentType, payload: payload || {} }).then(r => r.data)

export const getAgentActions = (status = 'pending') =>
  apiClient.get(`${BASE}/agents/actions/`, { params: { status } }).then(r => r.data)

export const updateAgentActionStatus = (actionId: number, status: 'applied' | 'dismissed') =>
  apiClient.post(`${BASE}/agents/actions/${actionId}/status/`, { status }).then(r => r.data)

// ─── Knowledge Search (RAG) ───────────────────────────────────────────────────

export const knowledgeSearch = (
  query: string,
  opts: { entity_types?: string[]; top_k?: number; module?: string } = {}
) =>
  apiClient.post(`${BASE}/knowledge/search/`, {
    query,
    entity_types: opts.entity_types,
    top_k: opts.top_k || 5,
    module: opts.module || 'general',
  }).then(r => r.data)

// ─── Context Intelligence ─────────────────────────────────────────────────────

export const getCompanyIntelligence = () =>
  apiClient.get(`${BASE}/context/company/`).then(r => r.data)

export const generateCompanyIntelligence = (data: Record<string, any>) =>
  apiClient.post(`${BASE}/context/company/`, data).then(r => r.data)

export const getProjectIntelligence = (projectId?: number) =>
  projectId
    ? apiClient.get(`${BASE}/context/project/${projectId}/`).then(r => r.data)
    : apiClient.get(`${BASE}/context/project/`).then(r => r.data)

export const generateProjectIntelligence = (data: Record<string, any>) =>
  apiClient.post(`${BASE}/context/project/`, data).then(r => r.data)

export const getLocationIntelligence = (location?: string) =>
  apiClient.get(`${BASE}/context/location/`, { params: location ? { location } : {} }).then(r => r.data)

export const generateLocationIntelligence = (data: Record<string, any>) =>
  apiClient.post(`${BASE}/context/location/`, data).then(r => r.data)

export const runSmartContextEngine = (data: { permit: Record<string, any>; project_id?: number }) =>
  apiClient.post(`${BASE}/context/engine/`, data).then(r => r.data)

export const getContextMemory = (type?: string) =>
  apiClient.get(`${BASE}/context/memory/`, { params: type ? { type } : {} }).then(r => r.data)

export const addContextMemory = (data: { memory_type: string; key: string; content: string; tags?: string[] }) =>
  apiClient.post(`${BASE}/context/memory/`, data).then(r => r.data)

// ─── Vector Memory ────────────────────────────────────────────────────────────

export const vectorSearch = (query: string, entityTypes?: string[], topK = 5) =>
  apiClient.post(`${BASE}/vector/search/`, { query, entity_types: entityTypes, top_k: topK }).then(r => r.data)

export const indexDocument = (data: {
  title: string; content: string; doc_type: string; doc_id?: number; tags?: string[]
}) =>
  apiClient.post(`${BASE}/vector/index/`, data).then(r => r.data)

// ─── PTW Phase 3 ──────────────────────────────────────────────────────────────

const PHASE3 = '/api/ptw-phase3'

export const getCommandCenterSnapshot = () =>
  apiClient.get(`${PHASE3}/command-center/`).then(r => r.data)

export const getSafetyBrain = () =>
  apiClient.get(`${PHASE3}/safety-brain/`).then(r => r.data)

export const generateSafetyBrain = () =>
  apiClient.post(`${PHASE3}/safety-brain/`).then(r => r.data)

export const globalSearch = (query: string, types?: string[]) =>
  apiClient.get(`${PHASE3}/search/`, { params: { q: query, ...(types ? { types } : {}) } }).then(r => r.data)

export const getAIApprovalRecommendation = (permitId: number) =>
  apiClient.get(`${PHASE3}/ai-approval/${permitId}/`).then(r => r.data)

export const generateAIApprovalRecommendation = (permitId: number) =>
  apiClient.post(`${PHASE3}/ai-approval/`, { permit_id: permitId }).then(r => r.data)

export const getWeatherReadings = (projectId?: number) =>
  apiClient.get(`${PHASE3}/weather/`, { params: projectId ? { project_id: projectId } : {} }).then(r => r.data)

export const getWeatherAlerts = (projectId?: number) =>
  apiClient.get(`${PHASE3}/weather/alerts/`, { params: projectId ? { project_id: projectId } : {} }).then(r => r.data)

export const getIoTDevices = (projectId?: number) =>
  apiClient.get(`${PHASE3}/iot/devices/`, { params: projectId ? { project_id: projectId } : {} }).then(r => r.data)

export const getContractorScores = (projectId?: number) =>
  apiClient.get(`${PHASE3}/contractor-scores/`, { params: projectId ? { project_id: projectId } : {} }).then(r => r.data)

export const dispatchPhase3Agent = (agentType: string, payload?: Record<string, any>) =>
  apiClient.post(`${PHASE3}/agents/dispatch/`, { agent_type: agentType, payload: payload || {} }).then(r => r.data)

// ─── AI Activity Log ──────────────────────────────────────────────────────────

export const getAIActivityLog = () =>
  apiClient.get(`${BASE}/activity-log/`).then(r => r.data)
