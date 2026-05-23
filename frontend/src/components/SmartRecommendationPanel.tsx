/**
 * SmartRecommendationPanel
 * Side panel showing AI suggestions, risk alerts, similar records,
 * related CAPA, recommended training, and auto-generated notes.
 */
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Empty,
  List,
  Progress,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  BulbOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  RobotOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { apiClient } from '../lib/api';
import type { ConsideringParameters, AutoFillResult } from '../hooks/useConsideringParameters';

const { Text, Paragraph } = Typography;

interface SimilarRecord {
  id: string | number;
  title: string;
  module: string;
  date: string;
  status: string;
  similarity?: number;
}

interface SmartRecommendationPanelProps {
  module: string;
  parameters: ConsideringParameters;
  autoFillResult: AutoFillResult;
  /** Free-text from the form (description, title, etc.) for similarity search */
  contextText?: string;
  onApplySuggestion?: (field: string, value: string) => void;
}

const MODULE_LABELS: Record<string, string> = {
  incident: 'Incident',
  safety_observation: 'Safety Observation',
  ptw: 'PTW',
  inspection: 'Inspection',
  training: 'Training',
  quality: 'Quality Finding',
  task: 'Task',
  tbt: 'Toolbox Talk',
};

const SmartRecommendationPanel: React.FC<SmartRecommendationPanelProps> = ({
  module,
  parameters,
  autoFillResult,
  contextText = '',
  onApplySuggestion,
}) => {
  const [similarRecords, setSimilarRecords] = useState<SimilarRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiNotes, setAiNotes] = useState<string[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasContext = contextText.trim().length > 15 || Object.values(parameters).some(Boolean);
    if (!hasContext) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.post('/api/system/smart-recommendations/', {
          module,
          parameters,
          context_text: contextText,
        });
        setSimilarRecords(res.data?.similar_records || []);
        setAiNotes(res.data?.ai_notes || []);
      } catch {
        // Derive local recommendations
        setSimilarRecords([]);
        setAiNotes(deriveLocalNotes(parameters, autoFillResult, module));
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [contextText, parameters, module, autoFillResult]);

  const riskScore = autoFillResult.risk_score;
  const riskLevel = autoFillResult.risk_level || autoFillResult.severity;
  const riskColor =
    riskLevel === 'Critical' || riskLevel === 'critical'
      ? '#cf1322'
      : riskLevel === 'High' || riskLevel === 'high'
      ? '#d46b08'
      : riskLevel === 'Medium' || riskLevel === 'medium'
      ? '#d4b106'
      : '#389e0d';

  const hazards = autoFillResult.hazards || [];
  const safetyRules = autoFillResult.safety_rules || [];
  const ppeItems = autoFillResult.ppe_requirements || [];
  const checklist = autoFillResult.checklist || [];

  const hasContent =
    riskScore !== undefined ||
    hazards.length > 0 ||
    safetyRules.length > 0 ||
    ppeItems.length > 0 ||
    checklist.length > 0 ||
    aiNotes.length > 0 ||
    similarRecords.length > 0;

  if (!hasContent && !loading) {
    return (
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: '#1677ff' }} />
            <Text strong>Smart Recommendations</Text>
          </Space>
        }
        style={{ border: '1px solid #f0f0f0' }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary" style={{ fontSize: 12 }}>
              Select parameters or enter details to see AI recommendations.
            </Text>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined style={{ color: '#1677ff' }} />
          <Text strong>Smart Recommendations</Text>
          {loading && <Spin size="small" />}
        </Space>
      }
      style={{ border: '1px solid #e6f4ff', background: '#fafeff' }}
      bodyStyle={{ padding: '8px 12px' }}
    >
      {/* Risk Score */}
      {riskScore !== undefined && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            Predicted Risk Score
          </Text>
          <Progress
            percent={riskScore}
            strokeColor={riskColor}
            format={() => (
              <Text style={{ color: riskColor, fontSize: 12 }}>
                {riskLevel || `${riskScore}%`}
              </Text>
            )}
            size="small"
          />
        </div>
      )}

      <Collapse
        ghost
        size="small"
        defaultActiveKey={['hazards', 'notes']}
        items={[
          ...(hazards.length > 0
            ? [
                {
                  key: 'hazards',
                  label: (
                    <Space>
                      <WarningOutlined style={{ color: '#ff4d4f' }} />
                      <Text style={{ fontSize: 12 }}>Identified Hazards</Text>
                      <Badge count={hazards.length} style={{ backgroundColor: '#ff4d4f' }} />
                    </Space>
                  ),
                  children: (
                    <div>
                      {hazards.map((h) => (
                        <Tag key={h} color="red" style={{ marginBottom: 4 }}>
                          {h}
                        </Tag>
                      ))}
                    </div>
                  ),
                },
              ]
            : []),

          ...(safetyRules.length > 0
            ? [
                {
                  key: 'safety',
                  label: (
                    <Space>
                      <SafetyOutlined style={{ color: '#52c41a' }} />
                      <Text style={{ fontSize: 12 }}>Safety Rules</Text>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={safetyRules}
                      renderItem={(rule) => (
                        <List.Item style={{ padding: '2px 0', border: 'none' }}>
                          <Space align="start">
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 11, marginTop: 2 }} />
                            <Text style={{ fontSize: 12 }}>{rule}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]
            : []),

          ...(ppeItems.length > 0
            ? [
                {
                  key: 'ppe',
                  label: (
                    <Space>
                      <ThunderboltOutlined style={{ color: '#722ed1' }} />
                      <Text style={{ fontSize: 12 }}>Required PPE</Text>
                      <Badge count={ppeItems.length} style={{ backgroundColor: '#722ed1' }} />
                    </Space>
                  ),
                  children: (
                    <div>
                      {ppeItems.map((item) => (
                        <Tag key={item} color="purple" style={{ marginBottom: 4 }}>
                          {item}
                        </Tag>
                      ))}
                    </div>
                  ),
                },
              ]
            : []),

          ...(checklist.length > 0
            ? [
                {
                  key: 'checklist',
                  label: (
                    <Space>
                      <BulbOutlined style={{ color: '#1677ff' }} />
                      <Text style={{ fontSize: 12 }}>Auto-loaded Checklist</Text>
                      <Badge count={checklist.length} style={{ backgroundColor: '#1677ff' }} />
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={checklist}
                      renderItem={(item) => (
                        <List.Item style={{ padding: '2px 0', border: 'none' }}>
                          <Space align="start">
                            <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 11, marginTop: 2 }} />
                            <Text style={{ fontSize: 12 }}>{item}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]
            : []),

          ...(aiNotes.length > 0
            ? [
                {
                  key: 'notes',
                  label: (
                    <Space>
                      <RobotOutlined style={{ color: '#fa8c16' }} />
                      <Text style={{ fontSize: 12 }}>AI Suggested Actions</Text>
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={aiNotes}
                      renderItem={(note, idx) => (
                        <List.Item
                          style={{ padding: '4px 0', border: 'none' }}
                          extra={
                            onApplySuggestion ? (
                              <Tooltip title="Apply to form">
                                <Button
                                  size="small"
                                  type="link"
                                  style={{ fontSize: 11, padding: 0 }}
                                  onClick={() => onApplySuggestion('corrective_action', note)}
                                >
                                  Apply
                                </Button>
                              </Tooltip>
                            ) : null
                          }
                        >
                          <Space align="start">
                            <ExclamationCircleOutlined
                              style={{ color: '#fa8c16', fontSize: 11, marginTop: 2 }}
                            />
                            <Text style={{ fontSize: 12 }}>{note}</Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]
            : []),

          ...(similarRecords.length > 0
            ? [
                {
                  key: 'similar',
                  label: (
                    <Space>
                      <HistoryOutlined style={{ color: '#13c2c2' }} />
                      <Text style={{ fontSize: 12 }}>Similar Records</Text>
                      <Badge count={similarRecords.length} style={{ backgroundColor: '#13c2c2' }} />
                    </Space>
                  ),
                  children: (
                    <List
                      size="small"
                      dataSource={similarRecords.slice(0, 5)}
                      renderItem={(record) => (
                        <List.Item style={{ padding: '4px 0', border: 'none' }}>
                          <Space direction="vertical" size={0} style={{ width: '100%' }}>
                            <Text style={{ fontSize: 12 }} strong>
                              {record.title}
                            </Text>
                            <Space>
                              <Tag color="blue" style={{ fontSize: 10 }}>
                                {MODULE_LABELS[record.module] || record.module}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 10 }}>
                                {record.date}
                              </Text>
                              <Tag
                                color={record.status === 'closed' ? 'green' : 'orange'}
                                style={{ fontSize: 10 }}
                              >
                                {record.status}
                              </Tag>
                            </Space>
                          </Space>
                        </List.Item>
                      )}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </Card>
  );
};

// ─── Local note derivation ────────────────────────────────────────────────────

function deriveLocalNotes(
  params: ConsideringParameters,
  autoFill: AutoFillResult,
  module: string,
): string[] {
  const notes: string[] = [];
  const { department, work_type, risk_category } = params;

  if (risk_category === 'Critical') {
    notes.push('CRITICAL RISK: Stop work immediately and notify the safety officer.');
    notes.push('Conduct emergency risk assessment before any work resumes.');
  } else if (risk_category === 'High') {
    notes.push('HIGH RISK: Ensure all controls are in place before starting work.');
    notes.push('Supervisor must be present during the entire operation.');
  }

  if (work_type === 'Hot Work') {
    notes.push('Verify hot work permit is valid and displayed at the work location.');
    notes.push('Assign a dedicated fire watch for the duration of hot work.');
  } else if (work_type === 'Confined Space') {
    notes.push('Conduct atmospheric testing before entry. O2: 19.5–23.5%, LEL < 10%.');
    notes.push('Rescue team must be on standby before confined space entry.');
  } else if (work_type === 'Work at Height') {
    notes.push('Inspect fall protection equipment before use.');
    notes.push('Establish exclusion zone below the work area.');
  }

  if (department === 'Electrical') {
    notes.push('Apply LOTO procedure before any electrical work begins.');
    notes.push('Verify de-energisation with an approved voltage tester.');
  }

  if (module === 'incident' && autoFill.severity === 'critical') {
    notes.push('Critical incident: Notify regulatory authority within 24 hours.');
    notes.push('Preserve the incident scene for investigation.');
  }

  if (notes.length === 0) {
    notes.push('Review applicable SOPs and risk assessments before starting work.');
    notes.push('Ensure all personnel are briefed on the hazards and controls.');
  }

  return notes;
}

export default SmartRecommendationPanel;
