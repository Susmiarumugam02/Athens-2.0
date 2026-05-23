import React, { useState } from 'react'
import { Alert, Button, Collapse, Tag, Spin, Tooltip, Space, Divider } from 'antd'
import {
  RobotOutlined, AudioOutlined, AudioMutedOutlined, CheckCircleOutlined,
  WarningOutlined, BulbOutlined, SafetyOutlined, ThunderboltOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import type { AIAnalysis, AIValidation } from '../hooks/usePTWAI'

const { Panel } = Collapse

const RISK_COLORS: Record<string, string> = {
  Low: '#52c41a', Medium: '#faad14', High: '#fa8c16', Extreme: '#ff4d4f',
}

const CATEGORY_ICONS: Record<string, string> = {
  hot_work: '🔥', height_work: '⬆️', confined_space: '🔒',
  electrical: '⚡', excavation: '⛏️', chemical: '☣️',
  pressure_work: '💨',
}

// ─── Voice Button ──────────────────────────────────────────────────────────────

interface VoiceButtonProps {
  fieldLabel: string
  voiceActive: boolean
  voiceProcessing: boolean
  conversionNote: string
  voiceError: string
  recordingSeconds?: number
  rawTranscript?: string
  onStart: () => void
  onStop: () => void
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  fieldLabel, voiceActive, voiceProcessing, conversionNote, voiceError,
  recordingSeconds = 0, rawTranscript = '',
  onStart, onStop,
}) => {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Tooltip title={
        voiceActive
          ? `Listening (${formatTime(recordingSeconds)}) — Click to stop and convert`
          : `Speak in Tamil, Hindi, or English — AI converts to professional English`
      }>
        <Button
          size="small"
          type={voiceActive ? 'primary' : 'default'}
          danger={voiceActive}
          icon={voiceProcessing ? <Spin size="small" /> : voiceActive ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={voiceActive ? onStop : onStart}
          loading={voiceProcessing}
          disabled={voiceProcessing}
          style={voiceActive ? {
            animation: 'pulse 1.2s ease-in-out infinite',
            boxShadow: '0 0 0 4px rgba(255,77,79,0.2)',
          } : {}}
        >
          {voiceProcessing
            ? 'Converting...'
            : voiceActive
              ? `Stop (${formatTime(recordingSeconds)})`
              : '🎤 Voice'}
        </Button>
      </Tooltip>

      {voiceActive && (
        <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
          🔴 Listening — speak now
        </Tag>
      )}

      {voiceProcessing && (
        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>⚡ AI Converting...</Tag>
      )}

      {!voiceActive && !voiceProcessing && conversionNote && (
        <Tag color="success" style={{ margin: 0, fontSize: 11 }}>✅ {conversionNote}</Tag>
      )}

      {voiceError && (
        <span style={{ fontSize: 11, color: '#ff4d4f', maxWidth: 220, display: 'inline-block' }}>
          ⚠️ {voiceError}
        </span>
      )}

      {rawTranscript && !voiceActive && !voiceProcessing && (
        <Tooltip title={`Raw transcript: "${rawTranscript}"`}>
          <Tag style={{ margin: 0, fontSize: 10, cursor: 'help', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📝 {rawTranscript.slice(0, 30)}{rawTranscript.length > 30 ? '…' : ''}
          </Tag>
        </Tooltip>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

// ─── AI Analysis Panel ─────────────────────────────────────────────────────────

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null
  analyzing: boolean
  onApplyHazards: (hazards: string[]) => void
  onApplyControls: (controls: string[]) => void
  onApplyPPE: (ppe: string[]) => void
  onApplyChecklist: (items: string[]) => void
  onApplyRisk: (probability: number, severity: number) => void
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  analysis, analyzing, onApplyHazards, onApplyControls, onApplyPPE, onApplyChecklist, onApplyRisk,
}) => {
  if (analyzing) {
    return (
      <div style={{ padding: '12px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spin size="small" />
        <span style={{ fontSize: 13, color: '#52c41a' }}>AI analyzing work description...</span>
      </div>
    )
  }

  if (!analysis) return null

  const riskColor = RISK_COLORS[analysis.risk.level] || '#faad14'

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ color: '#40a9ff', fontSize: 16 }} />
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>AI Safety Analysis</span>
          {analysis.detected_categories.map(cat => (
            <Tag key={cat} style={{ fontSize: 11, margin: 0 }}>
              {CATEGORY_ICONS[cat] || '⚠️'} {cat.replace('_', ' ').toUpperCase()}
            </Tag>
          ))}
        </div>
        <Tag color={riskColor} style={{ fontWeight: 700, fontSize: 12 }}>
          Risk: {analysis.risk.level} ({analysis.risk.score})
        </Tag>
      </div>

      <Collapse ghost size="small" defaultActiveKey={['hazards', 'ppe']}>
        {/* Hazards */}
        {analysis.hazards.length > 0 && (
          <Panel
            key="hazards"
            header={<span style={{ fontWeight: 600, fontSize: 13 }}><WarningOutlined style={{ color: '#fa8c16', marginRight: 6 }} />Detected Hazards ({analysis.hazards.length})</span>}
            extra={<Button size="small" type="link" onClick={(e) => { e.stopPropagation(); onApplyHazards(analysis.hazards) }}>Apply All</Button>}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {analysis.hazards.map((h, i) => (
                <Tag key={i} color="orange" style={{ fontSize: 12 }}>{h}</Tag>
              ))}
            </div>
          </Panel>
        )}

        {/* Controls */}
        {analysis.controls.length > 0 && (
          <Panel
            key="controls"
            header={<span style={{ fontWeight: 600, fontSize: 13 }}><SafetyOutlined style={{ color: '#52c41a', marginRight: 6 }} />Recommended Controls ({analysis.controls.length})</span>}
            extra={<Button size="small" type="link" onClick={(e) => { e.stopPropagation(); onApplyControls(analysis.controls) }}>Apply All</Button>}
          >
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
              {analysis.controls.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
            </ul>
          </Panel>
        )}

        {/* PPE */}
        {analysis.ppe_requirements.length > 0 && (
          <Panel
            key="ppe"
            header={<span style={{ fontWeight: 600, fontSize: 13 }}><ThunderboltOutlined style={{ color: '#1890ff', marginRight: 6 }} />Required PPE ({analysis.ppe_requirements.length})</span>}
            extra={<Button size="small" type="link" onClick={(e) => { e.stopPropagation(); onApplyPPE(analysis.ppe_requirements) }}>Apply All</Button>}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {analysis.ppe_requirements.map((p, i) => (
                <Tag key={i} color="blue" style={{ fontSize: 12 }}>{p}</Tag>
              ))}
            </div>
          </Panel>
        )}

        {/* Checklist */}
        {analysis.checklist.length > 0 && (
          <Panel
            key="checklist"
            header={<span style={{ fontWeight: 600, fontSize: 13 }}><CheckCircleOutlined style={{ color: '#722ed1', marginRight: 6 }} />Smart Checklist ({analysis.checklist.length} items)</span>}
            extra={<Button size="small" type="link" onClick={(e) => { e.stopPropagation(); onApplyChecklist(analysis.checklist) }}>Apply All</Button>}
          >
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
              {analysis.checklist.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
            </ul>
          </Panel>
        )}

        {/* Risk */}
        <Panel
          key="risk"
          header={<span style={{ fontWeight: 600, fontSize: 13 }}><ExclamationCircleOutlined style={{ color: riskColor, marginRight: 6 }} />Risk Assessment</span>}
          extra={
            <Button size="small" type="link" onClick={(e) => { e.stopPropagation(); onApplyRisk(analysis.risk.probability, analysis.risk.severity) }}>
              Apply Risk Score
            </Button>
          }
        >
          <Space>
            <Tag>Probability: {analysis.risk.probability}/5</Tag>
            <Tag>Severity: {analysis.risk.severity}/5</Tag>
            <Tag color={riskColor}>Score: {analysis.risk.score} — {analysis.risk.level}</Tag>
          </Space>
          {analysis.permits_needed.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Additional permits needed: </span>
              {analysis.permits_needed.map((p, i) => <Tag key={i} color="red" style={{ fontSize: 11 }}>{p}</Tag>)}
            </div>
          )}
        </Panel>
      </Collapse>
    </div>
  )
}

// ─── AI Validation Panel ───────────────────────────────────────────────────────

interface AIValidationPanelProps {
  validation: AIValidation | null
  validating: boolean
}

export const AIValidationPanel: React.FC<AIValidationPanelProps> = ({ validation, validating }) => {
  if (validating) {
    return (
      <div style={{ padding: '12px 16px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spin size="small" />
        <span style={{ fontSize: 13, color: '#1890ff' }}>AI validating permit...</span>
      </div>
    )
  }

  if (!validation) return null

  return (
    <div style={{ marginTop: 12 }}>
      {validation.errors.map((e, i) => (
        <Alert key={i} type="error" message={e} showIcon style={{ marginBottom: 6, fontSize: 13 }} />
      ))}
      {validation.warnings.map((w, i) => (
        <Alert key={i} type="warning" message={w} showIcon style={{ marginBottom: 6, fontSize: 13 }} />
      ))}
      {validation.recommendations.map((r, i) => (
        <Alert key={i} type="info" icon={<BulbOutlined />} message={r} showIcon style={{ marginBottom: 6, fontSize: 13 }} />
      ))}
      {validation.valid && validation.errors.length === 0 && (
        <Alert type="success" message="AI validation passed. Permit is ready for submission." showIcon style={{ fontSize: 13 }} />
      )}
    </div>
  )
}
