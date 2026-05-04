import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Select, Checkbox, Input, Tag, Alert,
  Spin, Button, Divider, Space, Typography, Form
} from 'antd';
import { WarningOutlined, SaveOutlined } from '@ant-design/icons';
import { apiClient } from '../../../lib/api';

const { TextArea } = Input;
const { Text } = Typography;

// ─── Static data ──────────────────────────────────────────────────────────────

const PROBABILITY_OPTIONS = [
  { value: 1, label: '1 – Rare',           desc: 'May occur in exceptional circumstances' },
  { value: 2, label: '2 – Unlikely',       desc: 'Could occur at some time' },
  { value: 3, label: '3 – Possible',       desc: 'Might occur at some time' },
  { value: 4, label: '4 – Likely',         desc: 'Will probably occur' },
  { value: 5, label: '5 – Almost Certain', desc: 'Expected to occur' },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: '1 – Insignificant', desc: 'No injury, minimal impact' },
  { value: 2, label: '2 – Minor',         desc: 'First aid treatment' },
  { value: 3, label: '3 – Moderate',      desc: 'Medical treatment required' },
  { value: 4, label: '4 – Major',         desc: 'Extensive injuries' },
  { value: 5, label: '5 – Catastrophic',  desc: 'Death or permanent disability' },
];

const HAZARD_GROUPS = [
  {
    category: 'electrical',
    label: 'Electrical Hazards',
    items: ['Live electrical equipment', 'Arc flash potential'],
  },
  {
    category: 'mechanical',
    label: 'Mechanical Hazards',
    items: ['Moving machinery', 'Stored energy'],
  },
  {
    category: 'chemical',
    label: 'Chemical Hazards',
    items: ['Toxic substances', 'Corrosive materials'],
  },
  {
    category: 'height',
    label: 'Working at Height',
    items: ['Fall from height', 'Falling objects'],
  },
  {
    category: 'confined',
    label: 'Confined Space',
    items: ['Oxygen deficiency', 'Toxic atmosphere'],
  },
];

const RISK_FACTOR_OPTIONS = [
  'Inadequate training', 'Poor housekeeping', 'Fatigue / shift work',
  'Extreme weather', 'Simultaneous operations', 'Unfamiliar task',
  'Time pressure', 'Inadequate supervision',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcLevel(score: number): string {
  if (score <= 4)  return 'Low';
  if (score <= 9)  return 'Medium';
  if (score <= 16) return 'High';
  return 'Extreme';
}

function levelAlert(level: string): 'success' | 'warning' | 'error' {
  return { Low: 'success', Medium: 'warning', High: 'error', Extreme: 'error' }[level] as any ?? 'info';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskData {
  probability: number;
  severity: number;
  risk_score: number;
  risk_level: string;
  hazards: string[];
  other_hazards: string;
  risk_factors: string[];
  control_measures: string;
  emergency_procedures: string;
}

interface Props {
  permitId?: number;
  permitType?: { name: string; category: string; risk_level: string } | null;
  onChange?: (data: RiskData) => void;
  standalone?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const RiskAssessmentPanel: React.FC<Props> = ({
  permitId,
  permitType,
  onChange,
  standalone = false,
}) => {
  // ── State ──
  const [probability, setProbability] = useState<number>(1);
  const [severity,    setSeverity]    = useState<number>(1);
  const [riskScore,   setRiskScore]   = useState<number>(1);
  const [riskLevel,   setRiskLevel]   = useState<string>('Low');

  const [hazards,              setHazards]              = useState<string[]>([]);
  const [otherHazards,         setOtherHazards]         = useState('');
  const [riskFactors,          setRiskFactors]          = useState<string[]>([]);
  const [controlMeasures,      setControlMeasures]      = useState('');
  const [emergencyProcedures,  setEmergencyProcedures]  = useState('');

  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // ── Real-time risk calculation ──
  useEffect(() => {
    const score = probability * severity;
    const level = calcLevel(score);
    setRiskScore(score);
    setRiskLevel(level);
  }, [probability, severity]);

  // ── Notify parent on every change ──
  useEffect(() => {
    onChange?.({
      probability,
      severity,
      risk_score:           probability * severity,
      risk_level:           calcLevel(probability * severity).toLowerCase(),
      hazards,
      other_hazards:        otherHazards,
      risk_factors:         riskFactors,
      control_measures:     controlMeasures,
      emergency_procedures: emergencyProcedures,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probability, severity, hazards, otherHazards, riskFactors, controlMeasures, emergencyProcedures]);

  // ── Load existing assessment ──
  useEffect(() => {
    if (!permitId) return;
    setLoading(true);
    apiClient
      .get(`/api/ptw/risk-assessments/by_permit/?permit_id=${permitId}`)
      .then((res) => {
        const d = res.data;
        if (!d?.id) return;
        setProbability(d.probability ?? 1);
        setSeverity(d.severity ?? 1);
        setHazards(d.hazards ?? []);
        setOtherHazards(d.other_hazards ?? '');
        setRiskFactors(d.risk_factors ?? []);
        setControlMeasures(d.control_measures ?? '');
        setEmergencyProcedures(d.emergency_procedures ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [permitId]);

  // ── Save ──
  const handleSave = async () => {
    if (!permitId) return;
    setSaving(true);
    try {
      await apiClient.post('/api/ptw/risk-assessments/upsert/', {
        permit: permitId,
        probability, severity,
        hazards, other_hazards: otherHazards,
        risk_factors: riskFactors,
        control_measures: controlMeasures,
        emergency_procedures: emergencyProcedures,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin style={{ display: 'block', margin: '32px auto' }} />;

  return (
    <Card
      title={
        <Space>
          <WarningOutlined />
          <span>Risk Assessment</span>
          {permitType && <Tag color="blue">{permitType.name}</Tag>}
        </Space>
      }
      extra={
        standalone && permitId ? (
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            {saved ? 'Saved ✓' : 'Save Assessment'}
          </Button>
        ) : null
      }
    >
      {/* Permit context banner */}
      {permitType && (
        <Alert
          message={`${permitType.name} — ${permitType.category?.replace(/_/g, ' ').toUpperCase()}`}
          description={`Base Risk Level: ${permitType.risk_level?.toUpperCase()}`}
          type={levelAlert(permitType.risk_level)}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ── STEP 1: Probability & Severity ── */}
      <Row gutter={16}>
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 500 }}>Probability (Likelihood) <span style={{ color: 'red' }}>*</span></label>
          </div>
          <Select
            value={probability}
            onChange={(val) => setProbability(val)}
            style={{ width: '100%' }}
          >
            {PROBABILITY_OPTIONS.map((o) => (
              <Select.Option key={o.value} value={o.value}>
                <strong>{o.label}</strong>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{o.desc}</Text>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontWeight: 500 }}>Severity (Consequence) <span style={{ color: 'red' }}>*</span></label>
          </div>
          <Select
            value={severity}
            onChange={(val) => setSeverity(val)}
            style={{ width: '100%' }}
          >
            {SEVERITY_OPTIONS.map((o) => (
              <Select.Option key={o.value} value={o.value}>
                <strong>{o.label}</strong>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{o.desc}</Text>
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* ── Risk Matrix Result ── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Risk Matrix Result</div>
        <div>
          Risk Score: {riskScore}/25 &nbsp;&nbsp;
          Risk Level: {riskLevel}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Risk Score = Probability × Severity | Low: 1–4, Medium: 5–9, High: 10–16, Extreme: 17–25
        </div>
      </div>

      {/* ── STEP 3: Hazard Checkboxes ── */}
      <Divider orientation="left" style={{ marginTop: 20 }}>Hazard Identification</Divider>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginTop: 8 }}>
        {HAZARD_GROUPS.map((group) => (
          <div key={group.category}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{group.label}</div>
            <Checkbox.Group
              value={hazards}
              onChange={(vals) => setHazards(vals as string[])}
            >
              <Space direction="vertical" size={4}>
                {group.items.map((item) => (
                  <Checkbox key={item} value={item} style={{ fontSize: 12 }}>{item}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Other Hazards</label>
        <TextArea
          rows={2}
          value={otherHazards}
          onChange={(e) => setOtherHazards(e.target.value)}
          placeholder="Describe any additional hazards not listed above"
          maxLength={500}
          showCount
        />
      </div>

      {/* ── STEP 4: Risk Controls ── */}
      <Divider orientation="left" style={{ marginTop: 20 }}>Risk Controls</Divider>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Risk Factors</label>
        <Select
          mode="tags"
          value={riskFactors}
          onChange={setRiskFactors}
          placeholder="Select or type risk factors"
          options={RISK_FACTOR_OPTIONS.map((r) => ({ label: r, value: r }))}
          style={{ width: '100%' }}
        />
      </div>

      <Form.Item
        label={<span style={{ fontWeight: 500 }}>Control Measures</span>}
        validateStatus={controlMeasures.length > 0 && controlMeasures.length < 10 ? 'error' : ''}
        help={controlMeasures.length > 0 && controlMeasures.length < 10 ? 'Minimum 10 characters required' : ''}
        required
        style={{ marginBottom: 12 }}
      >
        <TextArea
          rows={4}
          value={controlMeasures}
          onChange={(e) => setControlMeasures(e.target.value)}
          placeholder="Describe control measures to mitigate identified hazards"
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <div>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Emergency Procedures</label>
        <TextArea
          rows={3}
          value={emergencyProcedures}
          onChange={(e) => setEmergencyProcedures(e.target.value)}
          placeholder="Describe emergency procedures"
          maxLength={500}
          showCount
        />
      </div>
    </Card>
  );
};

export default RiskAssessmentPanel;
