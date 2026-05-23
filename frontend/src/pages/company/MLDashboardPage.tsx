import React, { useState, useEffect, useCallback } from 'react'
import {
  getMLDashboard, getMLStatus, trainModels, runAnomalyScan,
  RISK_COLORS, RISK_BG,
  type MLDashboard, type MLStatus,
} from '../../services/mlService'

// ─── Sub-components ───────────────────────────────────────────────────────────

const RiskBadge: React.FC<{ label: string }> = ({ label }) => (
  <span style={{
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    background: RISK_BG[label] || RISK_BG.low,
    color: RISK_COLORS[label] || RISK_COLORS.low,
    border: `1px solid ${RISK_COLORS[label] || RISK_COLORS.low}`,
    textTransform: 'uppercase',
  }}>{label}</span>
)

const ScoreBar: React.FC<{ score: number; max?: number }> = ({ score, max = 100 }) => {
  const pct = Math.min((score / max) * 100, 100)
  const color = score >= 75 ? '#ff4d4f' : score >= 55 ? '#fa8c16' : score >= 35 ? '#fadb14' : '#52c41a'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 600, minWidth: 32 }}>{score.toFixed(0)}</span>
    </div>
  )
}

const ModelCard: React.FC<{ name: string; status: any }> = ({ name, status }) => (
  <div style={{
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${status.exists ? 'rgba(82,196,26,0.3)' : 'rgba(255,77,79,0.3)'}`,
    borderRadius: 8,
    flex: 1,
    minWidth: 160,
  }}>
    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
      {name.replace(/_/g, ' ').toUpperCase()}
    </div>
    <div style={{
      fontSize: 13, fontWeight: 600,
      color: status.exists ? '#52c41a' : '#ff4d4f',
    }}>
      {status.exists ? '✓ Ready' : '✗ Not trained'}
    </div>
    {status.metrics?.f1 !== undefined && (
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
        F1: {(status.metrics.f1 * 100).toFixed(0)}% · AUC: {((status.metrics.roc_auc || 0) * 100).toFixed(0)}%
      </div>
    )}
    {status.trained_at && (
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
        {new Date(status.trained_at).toLocaleDateString()}
      </div>
    )}
  </div>
)

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const MLDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<MLDashboard | null>(null)
  const [status, setStatus] = useState<MLStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [trainResult, setTrainResult] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'permits' | 'workers' | 'anomalies'>('overview')

  const load = useCallback(async () => {
    try {
      const [dash, stat] = await Promise.all([getMLDashboard(), getMLStatus()])
      setDashboard(dash)
      setStatus(stat)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleTrain = async () => {
    setTraining(true)
    setTrainResult('')
    try {
      const result = await trainModels('all')
      const success = Object.values(result).filter((v: any) => v?.status === 'success').length
      setTrainResult(`✓ ${success} models trained successfully in ${result.total_duration_seconds?.toFixed(1)}s`)
      await load()
    } catch {
      setTrainResult('✗ Training failed')
    } finally {
      setTraining(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    try {
      await runAnomalyScan()
      await load()
    } catch { /* silent */ }
    finally { setScanning(false) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#fff' }}>
        Loading ML Intelligence...
      </div>
    )
  }

  const summary = dashboard?.summary
  const models = status?.models || {}

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)',
      minHeight: '100vh',
      padding: '24px',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            🤖 Predictive Intelligence Engine
          </h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            ML-powered safety predictions · {dashboard?.as_of ? new Date(dashboard.as_of).toLocaleTimeString() : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleScan} disabled={scanning} style={btnStyle('#1890ff')}>
            {scanning ? 'Scanning...' : '🔍 Anomaly Scan'}
          </button>
          <button onClick={handleTrain} disabled={training} style={btnStyle('#52c41a')}>
            {training ? 'Training...' : '⚡ Train Models'}
          </button>
        </div>
      </div>

      {trainResult && (
        <div style={{
          padding: '10px 16px', marginBottom: 16, borderRadius: 8,
          background: trainResult.startsWith('✓') ? 'rgba(82,196,26,0.1)' : 'rgba(255,77,79,0.1)',
          border: `1px solid ${trainResult.startsWith('✓') ? '#52c41a' : '#ff4d4f'}`,
          color: trainResult.startsWith('✓') ? '#52c41a' : '#ff4d4f',
          fontSize: 13,
        }}>{trainResult}</div>
      )}

      {/* Model Status Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(models).map(([name, s]) => (
          <ModelCard key={name} name={name} status={s} />
        ))}
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Critical Permits', value: summary?.critical_permits ?? 0, color: '#ff4d4f', alert: (summary?.critical_permits ?? 0) > 0 },
          { label: 'High Risk Workers', value: summary?.high_risk_workers ?? 0, color: '#fa8c16', alert: (summary?.high_risk_workers ?? 0) > 0 },
          { label: 'Anomalous Projects', value: summary?.anomalous_projects ?? 0, color: '#fadb14', alert: (summary?.anomalous_projects ?? 0) > 0 },
          { label: 'Avg Incident Prob.', value: `${((summary?.avg_incident_probability ?? 0) * 100).toFixed(1)}%`, color: '#1890ff' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            flex: 1, minWidth: 140,
            padding: '16px 20px',
            background: kpi.alert ? 'rgba(255,77,79,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${kpi.alert ? 'rgba(255,77,79,0.4)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['overview', 'permits', 'workers', 'anomalies'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: activeTab === tab ? 'rgba(24,144,255,0.2)' : 'rgba(255,255,255,0.05)',
            color: activeTab === tab ? '#1890ff' : 'rgba(255,255,255,0.6)',
            fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
            borderBottom: activeTab === tab ? '2px solid #1890ff' : '2px solid transparent',
          }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Section title="🚨 High Risk Permits">
            {(dashboard?.high_risk_permits || []).slice(0, 8).map((p, i) => (
              <div key={i} style={rowStyle}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.permit_number || `Permit #${p.permit_id}`}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.permit_type} · {p.location}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <RiskBadge label={p.risk_label} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                    {(p.incident_probability * 100).toFixed(0)}% prob
                  </div>
                </div>
              </div>
            ))}
            {!dashboard?.high_risk_permits?.length && <EmptyState text="No high risk permits" />}
          </Section>
          <Section title="⚠️ Anomalies Detected">
            {(dashboard?.anomalies || []).map((a, i) => (
              <div key={i} style={rowStyle}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Project #{a.project_id}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {a.anomaly_signals?.[0] || 'Anomalous pattern detected'}
                  </div>
                </div>
                <RiskBadge label={a.severity} />
              </div>
            ))}
            {!dashboard?.anomalies?.length && <EmptyState text="No anomalies detected" />}
          </Section>
        </div>
      )}

      {activeTab === 'permits' && (
        <Section title="Permit Incident Risk Predictions">
          {(dashboard?.high_risk_permits || []).map((p, i) => (
            <div key={i} style={{ ...rowStyle, flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.permit_number || `Permit #${p.permit_id}`}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{p.permit_type}</span>
                </div>
                <RiskBadge label={p.risk_label} />
              </div>
              <ScoreBar score={p.risk_score} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                Confidence: {(p.confidence * 100).toFixed(0)}% · Source: {p.model_source} · {p.latency_ms}ms
              </div>
              {Object.keys(p.explanation || {}).length > 0 && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                  Top factors: {Object.keys(p.explanation).slice(0, 3).join(', ')}
                </div>
              )}
            </div>
          ))}
          {!dashboard?.high_risk_permits?.length && <EmptyState text="No permit predictions available. Train models first." />}
        </Section>
      )}

      {activeTab === 'workers' && (
        <Section title="Worker Safety Risk Predictions">
          {(dashboard?.high_risk_workers || []).map((w, i) => (
            <div key={i} style={{ ...rowStyle, flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{w.employee_name || `Worker #${w.worker_id}`}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{w.department}</span>
                </div>
                <RiskBadge label={w.risk_label} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Fatigue</div>
                  <ScoreBar score={w.fatigue_score} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Behavior</div>
                  <ScoreBar score={w.behavior_risk_score} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Training Gap</div>
                  <ScoreBar score={w.training_gap_score} />
                </div>
              </div>
              {w.key_signals?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {w.key_signals.map((s, j) => (
                    <span key={j} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: RISK_BG[s.severity] || RISK_BG.medium,
                      color: RISK_COLORS[s.severity] || RISK_COLORS.medium,
                    }}>{s.signal}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!dashboard?.high_risk_workers?.length && <EmptyState text="No worker risk predictions available." />}
        </Section>
      )}

      {activeTab === 'anomalies' && (
        <Section title="Anomaly Detection Results">
          {(dashboard?.anomalies || []).map((a, i) => (
            <div key={i} style={{ ...rowStyle, flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Project #{a.project_id}</span>
                <RiskBadge label={a.severity === 'normal' ? 'low' : a.severity} />
              </div>
              <ScoreBar score={a.anomaly_score} />
              {a.anomaly_signals?.map((s, j) => (
                <div key={j} style={{ fontSize: 12, color: '#fa8c16', paddingLeft: 8, borderLeft: '2px solid #fa8c16' }}>
                  {s}
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Source: {a.model_source}</div>
            </div>
          ))}
          {!dashboard?.anomalies?.length && <EmptyState text="No anomalies detected. Run anomaly scan to check." />}
        </Section>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 20,
  }}>
    <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{title}</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
)

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{text}</div>
)

const rowStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 8,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
}

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '8px 16px',
  background: `rgba(${color === '#1890ff' ? '24,144,255' : '82,196,26'},0.15)`,
  border: `1px solid ${color}`,
  borderRadius: 8,
  color,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
})

export default MLDashboardPage
