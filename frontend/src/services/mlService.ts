/**
 * Athens ML Service
 * All ML prediction API calls — incident risk, worker risk, anomaly detection.
 */
import { apiClient } from '../lib/api'

const BASE = '/api/ml'
const AI_BASE = '/ai'

export interface MLModelStatus {
  exists: boolean
  trained_at: string | null
  metrics: Record<string, number>
  feature_count: number
}

export interface MLStatus {
  tenant_id: number
  models: Record<string, MLModelStatus>
  all_ready: boolean
}

export interface IncidentPrediction {
  permit_id: number
  permit_number?: string
  permit_type?: string
  location?: string
  incident_probability: number
  risk_score: number
  risk_label: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  explanation: Record<string, number>
  model_source: 'ml_model' | 'rules' | 'fallback'
  latency_ms: number
  cached?: boolean
}

export interface AIPredictIncidentResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  incident_probability: number
  risk_score: number
  severity_prediction: string
  predicted_incident: string
  recommended_actions: string[]
  confidence: number
  model_source: string
  explanation: Record<string, number>
}

export interface AIPTWAnalysisResult {
  permit_id: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  incident_probability: number
  predicted_hazards: string[]
  recommended_controls: string[]
  recommended_ppe: string[]
  recommended_toolbox_talks: string[]
  similar_previous_incidents: Array<Record<string, any>>
  smart_risk: SmartRiskScore
  model_source: string
}

export interface WorkerRiskPrediction {
  worker_id: number
  fatigue_score: number
  behavior_risk_score: number
  training_gap_score: number
  overall_risk_score: number
  risk_label: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  key_signals: Array<{ signal: string; severity: string }>
  model_source: string
  employee_name?: string
  department?: string
}

export interface ContractorRiskPrediction {
  contractor_name: string
  risk_score: number
  risk_label: string
  total_permits: number
  incidents: number
  violation_rate: number
  rejection_rate: number
  trend: 'improving' | 'stable' | 'declining'
  model_source: string
}

export interface AnomalyResult {
  project_id: number
  is_anomalous: boolean
  anomaly_score: number
  severity: string
  anomaly_signals: string[]
  model_source: string
}

export interface SmartRiskScore {
  permit_id: number
  manual_risk_score: number
  ml_risk_score: number
  blended_risk_score: number
  risk_level: string
  ml_adjustment: number
  model_source: string
}

export interface MLDashboard {
  tenant_id: number
  as_of: string
  high_risk_permits: IncidentPrediction[]
  high_risk_workers: WorkerRiskPrediction[]
  anomalies: AnomalyResult[]
  model_status: MLStatus
  summary: {
    critical_permits: number
    high_risk_workers: number
    anomalous_projects: number
    avg_incident_probability: number
  }
}

export interface MLHybridResult {
  permit_id: number
  ml_predictions: {
    ml_incident_probability: number
    ml_risk_score: number
    ml_risk_label: string
    ml_top_risk_factors: string[]
    ml_confidence: number
    ml_source: string
  }
  ai_explanation: string
  source: string
}

// ─── Model Management ──────────────────────────────────────────────────────────

export const getMLStatus = (): Promise<MLStatus> =>
  apiClient.get(`${BASE}/status/`).then(r => r.data)

export const trainModels = (modelType = 'all'): Promise<Record<string, any>> =>
  apiClient.post(`${BASE}/train/`, { model_type: modelType }).then(r => r.data)

// ─── Incident Prediction ───────────────────────────────────────────────────────

export const predictIncidentRisk = (permitId: number): Promise<IncidentPrediction> =>
  apiClient.post(`${BASE}/predict/incident/`, { permit_id: permitId }).then(r => r.data)

export const predictPermitsBatch = (limit = 20): Promise<{ predictions: IncidentPrediction[]; count: number }> =>
  apiClient.post(`${BASE}/predict/incidents/batch/`, { limit }).then(r => r.data)

// ─── Worker Risk ───────────────────────────────────────────────────────────────

export const predictWorkerRisk = (workerId: number): Promise<WorkerRiskPrediction> =>
  apiClient.post(`${BASE}/predict/worker/`, { worker_id: workerId }).then(r => r.data)

export const predictWorkersBatch = (limit = 50): Promise<{
  predictions: WorkerRiskPrediction[]
  count: number
  high_risk_count: number
}> =>
  apiClient.post(`${BASE}/predict/workers/batch/`, { limit }).then(r => r.data)

// ─── Contractor Risk ───────────────────────────────────────────────────────────

export const predictContractorRisk = (contractorName: string): Promise<ContractorRiskPrediction> =>
  apiClient.post(`${BASE}/predict/contractor/`, { contractor_name: contractorName }).then(r => r.data)

// ─── Anomaly Detection ─────────────────────────────────────────────────────────

export const detectAnomaly = (projectId: number): Promise<AnomalyResult> =>
  apiClient.post(`${BASE}/anomaly/detect/`, { project_id: projectId }).then(r => r.data)

export const runAnomalyScan = (): Promise<{ anomalies: AnomalyResult[]; count: number; critical_count: number }> =>
  apiClient.get(`${BASE}/anomaly/scan/`).then(r => r.data)

export const getAnomalyRecords = () =>
  apiClient.get(`${BASE}/anomaly/records/`).then(r => r.data)

export const reviewAnomaly = (id: number, status = 'reviewed') =>
  apiClient.post(`${BASE}/anomaly/records/${id}/review/`, { status }).then(r => r.data)

// ─── Smart Risk Matrix ─────────────────────────────────────────────────────────

export const getSmartRiskScore = (permitId: number): Promise<SmartRiskScore> =>
  apiClient.post(`${BASE}/risk/smart/`, { permit_id: permitId }).then(r => r.data)

// ─── Enterprise Dashboard ──────────────────────────────────────────────────────

export const getMLDashboard = (): Promise<MLDashboard> =>
  apiClient.get(`${BASE}/dashboard/`).then(r => r.data)

// ─── LLM + ML Hybrid ──────────────────────────────────────────────────────────

export const getMLHybridAnalysis = (permitId: number, question?: string): Promise<MLHybridResult> =>
  apiClient.post(`${BASE}/hybrid/`, { permit_id: permitId, question }).then(r => r.data)

// ─── Prediction History ────────────────────────────────────────────────────────

export const getPredictionHistory = (modelType?: string) =>
  apiClient.get(`${BASE}/predictions/`, { params: { model_type: modelType } }).then(r => r.data)

// ─── Athens AI Platform Gateway (/ai) ─────────────────────────────────────────

export const aiPredictIncident = (permitId: number): Promise<AIPredictIncidentResult> =>
  apiClient.post(`${AI_BASE}/predict-incident`, { permit_id: permitId }).then(r => r.data)

export const aiAnalyzePTW = (permitId: number): Promise<AIPTWAnalysisResult> =>
  apiClient.post(`${AI_BASE}/analyze-ptw`, { permit_id: permitId }).then(r => r.data)

export const aiDetectAnomaly = (projectId: number): Promise<AnomalyResult> =>
  apiClient.post(`${AI_BASE}/detect-anomaly`, { project_id: projectId }).then(r => r.data)

export const getAIRiskDashboard = (): Promise<MLDashboard> =>
  apiClient.get(`${AI_BASE}/risk-dashboard`).then(r => r.data)

export const getAIWorkerRisk = (workerId: number): Promise<WorkerRiskPrediction> =>
  apiClient.get(`${AI_BASE}/worker-risk/${workerId}`).then(r => r.data)

export const getAIProjectRisk = (projectId: number): Promise<Record<string, any>> =>
  apiClient.get(`${AI_BASE}/project-risk/${projectId}`).then(r => r.data)

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const RISK_COLORS: Record<string, string> = {
  low: '#52c41a',
  medium: '#fadb14',
  high: '#fa8c16',
  critical: '#ff4d4f',
  normal: '#52c41a',
}

export const RISK_BG: Record<string, string> = {
  low: 'rgba(82,196,26,0.1)',
  medium: 'rgba(250,219,20,0.1)',
  high: 'rgba(250,140,22,0.1)',
  critical: 'rgba(255,77,79,0.1)',
}
