import React, { useEffect, useState } from 'react';
import { App, Card, Select, Checkbox, Input, Divider, Space, Tag, Row, Col, Form, Button } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { usePTWAI } from '../hooks/usePTWAI';
import { VoiceButton } from './AIAssistPanel';

const { TextArea } = Input;

const PROBABILITY_OPTIONS = [
  { value: 1, label: '1 – Rare',            desc: 'May occur in exceptional circumstances' },
  { value: 2, label: '2 – Unlikely',        desc: 'Could occur at some time' },
  { value: 3, label: '3 – Possible',        desc: 'Might occur at some time' },
  { value: 4, label: '4 – Likely',          desc: 'Will probably occur' },
  { value: 5, label: '5 – Almost Certain',  desc: 'Expected to occur' },
];

const SEVERITY_OPTIONS = [
  { value: 1, label: '1 – Insignificant', desc: 'No injury, minimal impact' },
  { value: 2, label: '2 – Minor',         desc: 'First aid treatment' },
  { value: 3, label: '3 – Moderate',      desc: 'Medical treatment required' },
  { value: 4, label: '4 – Major',         desc: 'Extensive injuries' },
  { value: 5, label: '5 – Catastrophic',  desc: 'Death or permanent disability' },
];

const HAZARD_GROUPS = [
  { label: 'Electrical Hazards',  items: ['Live electrical equipment', 'Arc flash potential'] },
  { label: 'Mechanical Hazards',  items: ['Moving machinery', 'Stored energy'] },
  { label: 'Chemical Hazards',    items: ['Toxic substances', 'Corrosive materials'] },
  { label: 'Working at Height',   items: ['Fall from height', 'Falling objects'] },
  { label: 'Confined Space',      items: ['Oxygen deficiency', 'Toxic atmosphere'] },
];

const RISK_FACTORS = [
  'Inadequate training', 'Poor housekeeping', 'Fatigue / shift work',
  'Extreme weather', 'Simultaneous operations', 'Unfamiliar task',
  'Time pressure', 'Inadequate supervision',
];

function getLevel(score: number) {
  if (score <= 4)  return { label: 'Low',     color: '#52c41a' };
  if (score <= 9)  return { label: 'Medium',  color: '#faad14' };
  if (score <= 16) return { label: 'High',    color: '#fa8c16' };
  return                  { label: 'Extreme', color: '#ff4d4f' };
}

export interface RiskAssessmentData {
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
  permitType?: { name: string; category: string; risk_level: string } | null;
  onChange: (data: RiskAssessmentData) => void;
}

const RiskAssessmentSection: React.FC<Props> = ({ permitType, onChange }) => {
  const { message } = App.useApp();
  const [probability,          setProbability]          = useState<number>(1);
  const [severity,             setSeverity]             = useState<number>(1);
  const [hazards,              setHazards]              = useState<string[]>([]);
  const [otherHazards,         setOtherHazards]         = useState('');
  const [riskFactors,          setRiskFactors]          = useState<string[]>([]);
  const [controlMeasures,      setControlMeasures]      = useState('');
  const [emergencyProcedures,  setEmergencyProcedures]  = useState('');
  const [activeVoiceField,     setActiveVoiceField]     = useState<string | null>(null);
  const ai = usePTWAI();

  // Real-time score
  const score = probability * severity;
  const { label: riskLabel } = getLevel(score);

  const appendEnglish = (current: string, professional: string) =>
    current ? `${current} ${professional}` : professional;

  const voiceProps = (field: string, label: string, apply: (professional: string) => void) => ({
    fieldLabel: label,
    voiceActive: activeVoiceField === field && ai.voiceActive,
    voiceProcessing: activeVoiceField === field && ai.voiceProcessing,
    conversionNote: activeVoiceField === field ? ai.voiceConversionNote : '',
    voiceError: ai.voiceError,
    onStart: () => {
      setActiveVoiceField(field);
      ai.startVoice((professional) => {
        apply(professional);
        message.success('Voice converted to professional English');
      }, field);
    },
    onStop: ai.stopVoice,
  });

  // Sync to parent on every change
  useEffect(() => {
    onChange({
      probability,
      severity,
      risk_score:           score,
      risk_level:           riskLabel.toLowerCase(),
      hazards,
      other_hazards:        otherHazards,
      risk_factors:         riskFactors,
      control_measures:     controlMeasures,
      emergency_procedures: emergencyProcedures,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probability, severity, hazards, otherHazards, riskFactors, controlMeasures, emergencyProcedures]);

  return (
    <Card
      title={
        <Space>
          <WarningOutlined />
          Risk Assessment
          {permitType && <Tag color="blue">{permitType.name}</Tag>}
        </Space>
      }
    >
      {/* Permit type context */}
      {permitType && (
        <div style={{
          padding: '8px 14px', marginBottom: 16, borderRadius: 6,
          background: '#e6f4ff', border: '1px solid #91caff',
        }}>
          <strong>{permitType.name}</strong>
          <span style={{ marginLeft: 12, color: '#888' }}>
            Category: {permitType.category?.replace(/_/g, ' ').toUpperCase()} &nbsp;|&nbsp;
            Base Risk: {permitType.risk_level?.toUpperCase()}
          </span>
        </div>
      )}

      {/* Probability & Severity */}
      <Row gutter={16}>
        <Col span={12}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Probability (Likelihood) <span style={{ color: 'red' }}>*</span>
          </label>
          <Select
            value={probability}
            onChange={setProbability}
            style={{ width: '100%' }}
          >
            {PROBABILITY_OPTIONS.map(o => (
              <Select.Option key={o.value} value={o.value}>
                <strong>{o.label}</strong>
                <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>{o.desc}</span>
              </Select.Option>
            ))}
          </Select>
        </Col>
        <Col span={12}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Severity (Consequence) <span style={{ color: 'red' }}>*</span>
          </label>
          <Select
            value={severity}
            onChange={setSeverity}
            style={{ width: '100%' }}
          >
            {SEVERITY_OPTIONS.map(o => (
              <Select.Option key={o.value} value={o.value}>
                <strong>{o.label}</strong>
                <span style={{ color: '#888', fontSize: 11, marginLeft: 6 }}>{o.desc}</span>
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* ── RISK MATRIX RESULT ── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Risk Matrix Result</div>
        <div>
          Risk Score: {score}/25 &nbsp;&nbsp;
          Risk Level: {riskLabel}
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Risk Score = Probability × Severity | Low: 1–4, Medium: 5–9, High: 10–16, Extreme: 17–25
        </div>
      </div>

      {/* ── HAZARD CHECKBOXES ── */}
      <Divider style={{ marginTop: 20, fontWeight: 600 }}>
        Hazard Identification
      </Divider>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginTop: 8 }}>
        {HAZARD_GROUPS.map(group => (
          <div key={group.label}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{group.label}</div>
            <Checkbox.Group
              value={hazards}
              onChange={vals => setHazards(vals as string[])}
            >
              <Space direction="vertical" size={6}>
                {group.items.map(item => (
                  <Checkbox key={item} value={item} style={{ fontSize: 12 }}>{item}</Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          Other Hazards
          <VoiceButton
            {...voiceProps('other_hazards', 'Hazard Description', (professional) => {
              setOtherHazards(current => appendEnglish(current, professional));
            })}
          />
        </label>
        <TextArea
          rows={2}
          value={otherHazards}
          onChange={e => setOtherHazards(e.target.value)}
          placeholder="Describe any additional hazards not listed above"
          maxLength={500}
          showCount
        />
      </div>

      {/* ── RISK CONTROLS ── */}
      <Divider style={{ marginTop: 20, fontWeight: 600 }}>Risk Controls</Divider>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Risk Factors</label>
        <Select
          mode="tags"
          value={riskFactors}
          onChange={setRiskFactors}
          placeholder="Select or type risk factors"
          options={RISK_FACTORS.map(r => ({ label: r, value: r }))}
          style={{ width: '100%' }}
        />
      </div>

      <Form.Item
        label={
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Control Measures
            <VoiceButton
              {...voiceProps('control_measures', 'Control Measures', (professional) => {
                setControlMeasures(current => appendEnglish(current, professional));
              })}
            />
          </span>
        }
        validateStatus={controlMeasures.length > 0 && controlMeasures.length < 10 ? 'error' : ''}
        help={controlMeasures.length > 0 && controlMeasures.length < 10 ? 'Minimum 10 characters required' : ''}
        required
        style={{ marginBottom: 12 }}
      >
        <TextArea
          rows={4}
          value={controlMeasures}
          onChange={e => setControlMeasures(e.target.value)}
          placeholder="Describe control measures to mitigate identified hazards"
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <div>
        <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          Emergency Procedures
          <VoiceButton
            {...voiceProps('emergency_procedures', 'Emergency Procedures', (professional) => {
              setEmergencyProcedures(current => appendEnglish(current, professional));
            })}
          />
        </label>
        <TextArea
          rows={3}
          value={emergencyProcedures}
          onChange={e => setEmergencyProcedures(e.target.value)}
          placeholder="Describe emergency procedures"
          maxLength={500}
          showCount
        />
      </div>
    </Card>
  );
};

export default RiskAssessmentSection;
