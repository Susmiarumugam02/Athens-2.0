import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface CommandSnapshot {
  as_of: string;
  active_permits: number;
  pending_approvals: number;
  high_risk_permits: number;
  open_incidents: number;
  active_workers: number;
  iot_alerts: number;
  weather_risk: string;
  enterprise_score?: number;
  accident_probability?: number;
  unsafe_trends?: string[];
  recent_events: Array<{ id: number; event_type: string; severity: string; title: string; created_at: string }>;
  ai_insights: Array<{ id: number; insight_type: string; title: string; probability: number; impact: string }>;
  emergency_active: boolean;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#fa8c16',
  medium: '#fadb14',
  low: '#52c41a',
  info: '#1890ff',
};

const KPICard: React.FC<{
  label: string;
  value: number | string;
  color?: string;
  alert?: boolean;
}> = ({ label, value, color = '#1890ff', alert }) => (
  <div style={{
    background: alert ? 'rgba(255,77,79,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${alert ? '#ff4d4f' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 12,
    padding: '20px 24px',
    flex: 1,
    minWidth: 140,
  }}>
    <div style={{ fontSize: 32, fontWeight: 700, color: alert ? '#ff4d4f' : color }}>{value}</div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{label}</div>
  </div>
);

const EnterpriseCommandCenter: React.FC = () => {
  const { token } = useAuthStore();
  const [snapshot, setSnapshot] = useState<CommandSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [liveEvents, setLiveEvents] = useState<Array<{ type: string; data: any; ts: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/ptw-phase3/command-center/');
      setSnapshot(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWs = useCallback(() => {
    if (!token) return;
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/ai/command-center/`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'snapshot') {
          setSnapshot(prev => prev ? { ...prev, ...msg.data } : msg.data);
        } else if (['ai_event', 'ai_alert', 'permit_update', 'emergency_alert', 'agent_action'].includes(msg.type)) {
          setLiveEvents(prev => [{
            type: msg.type,
            data: msg.data,
            ts: new Date().toLocaleTimeString(),
          }, ...prev.slice(0, 19)]);
          // Refresh snapshot on significant events
          if (msg.type === 'emergency_alert' || msg.type === 'permit_update') {
            fetchSnapshot();
          }
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      reconnectRef.current = setTimeout(connectWs, 5000);
    };

    ws.onerror = () => ws.close();
  }, [token, fetchSnapshot]);

  useEffect(() => {
    fetchSnapshot();
    connectWs();
    const interval = setInterval(fetchSnapshot, 30000);
    return () => {
      clearInterval(interval);
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [fetchSnapshot, connectWs]);

  const generateBrain = async () => {
    try {
      await apiClient.post('/api/ptw-phase3/safety-brain/');
      fetchSnapshot();
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#fff' }}>
        Loading Command Center...
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a1628 100%)',
      minHeight: '100vh',
      padding: '24px',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#fff' }}>
            🏭 Enterprise Command Center
          </h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            {snapshot?.as_of ? `Last updated: ${new Date(snapshot.as_of).toLocaleTimeString()}` : 'Loading...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            background: wsStatus === 'connected' ? 'rgba(82,196,26,0.2)' : 'rgba(255,77,79,0.2)',
            color: wsStatus === 'connected' ? '#52c41a' : '#ff4d4f',
            border: `1px solid ${wsStatus === 'connected' ? '#52c41a' : '#ff4d4f'}`,
          }}>
            {wsStatus === 'connected' ? '● LIVE' : wsStatus === 'connecting' ? '○ Connecting...' : '○ Offline'}
          </div>
          <button
            onClick={generateBrain}
            style={{
              padding: '8px 16px',
              background: 'rgba(24,144,255,0.2)',
              border: '1px solid #1890ff',
              borderRadius: 8,
              color: '#1890ff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🧠 Refresh AI Brain
          </button>
        </div>
      </div>

      {/* Emergency Banner */}
      {snapshot?.emergency_active && (
        <div style={{
          background: 'rgba(255,77,79,0.2)',
          border: '2px solid #ff4d4f',
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: '#ff4d4f', fontSize: 16 }}>EMERGENCY ACTIVE</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              Emergency event in progress. Check emergency panel for details.
            </div>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPICard label="Active Permits" value={snapshot?.active_permits ?? 0} color="#1890ff" />
        <KPICard label="Pending Approvals" value={snapshot?.pending_approvals ?? 0}
          color="#fa8c16" alert={(snapshot?.pending_approvals ?? 0) > 10} />
        <KPICard label="High Risk Permits" value={snapshot?.high_risk_permits ?? 0}
          color="#ff4d4f" alert={(snapshot?.high_risk_permits ?? 0) > 0} />
        <KPICard label="Open Incidents" value={snapshot?.open_incidents ?? 0}
          color="#ff4d4f" alert={(snapshot?.open_incidents ?? 0) > 0} />
        <KPICard label="IoT Alerts" value={snapshot?.iot_alerts ?? 0}
          color="#fa8c16" alert={(snapshot?.iot_alerts ?? 0) > 0} />
        {snapshot?.enterprise_score !== undefined && (
          <KPICard label="Safety Score" value={`${snapshot.enterprise_score.toFixed(0)}%`}
            color={snapshot.enterprise_score >= 80 ? '#52c41a' : snapshot.enterprise_score >= 60 ? '#fa8c16' : '#ff4d4f'} />
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Live Events */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 20,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            ⚡ Live Events
          </h3>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {liveEvents.length === 0 && snapshot?.recent_events?.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                No events yet
              </div>
            )}
            {liveEvents.map((ev, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                marginBottom: 8,
                background: 'rgba(24,144,255,0.1)',
                borderRadius: 8,
                borderLeft: '3px solid #1890ff',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: '#1890ff' }}>{ev.type.replace(/_/g, ' ').toUpperCase()}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{ev.ts}</div>
              </div>
            ))}
            {snapshot?.recent_events?.map(ev => (
              <div key={ev.id} style={{
                padding: '8px 12px',
                marginBottom: 8,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                borderLeft: `3px solid ${SEVERITY_COLOR[ev.severity] || '#1890ff'}`,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, color: SEVERITY_COLOR[ev.severity] || '#fff' }}>{ev.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                  {ev.event_type} · {new Date(ev.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 20,
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            🧠 AI Predictive Insights
          </h3>
          {snapshot?.unsafe_trends && snapshot.unsafe_trends.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Unsafe Trends</div>
              {snapshot.unsafe_trends.map((t, i) => (
                <div key={i} style={{
                  padding: '6px 10px',
                  marginBottom: 6,
                  background: 'rgba(250,140,22,0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#fa8c16',
                  borderLeft: '2px solid #fa8c16',
                }}>{t}</div>
              ))}
            </div>
          )}
          {snapshot?.ai_insights?.map(insight => (
            <div key={insight.id} style={{
              padding: '10px 12px',
              marginBottom: 8,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              borderLeft: `3px solid ${insight.impact === 'high' ? '#ff4d4f' : '#fa8c16'}`,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{insight.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                {insight.insight_type} · Probability: {insight.probability.toFixed(0)}%
              </div>
            </div>
          ))}
          {(!snapshot?.ai_insights || snapshot.ai_insights.length === 0) && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              No active insights. Click "Refresh AI Brain" to generate.
            </div>
          )}
        </div>
      </div>

      {/* Accident Probability */}
      {snapshot?.accident_probability !== undefined && (
        <div style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 20,
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            📊 AI Safety Brain
          </h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Accident Probability (30d)</div>
              <div style={{
                fontSize: 28,
                fontWeight: 700,
                color: snapshot.accident_probability > 60 ? '#ff4d4f' :
                  snapshot.accident_probability > 30 ? '#fa8c16' : '#52c41a',
              }}>
                {snapshot.accident_probability.toFixed(0)}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                height: 8,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${snapshot.accident_probability}%`,
                  background: snapshot.accident_probability > 60 ? '#ff4d4f' :
                    snapshot.accident_probability > 30 ? '#fa8c16' : '#52c41a',
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseCommandCenter;
