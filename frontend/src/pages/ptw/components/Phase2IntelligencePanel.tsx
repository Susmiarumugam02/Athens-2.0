import React, { useState } from 'react';
import { Alert, Button, Card, Col, List, Progress, Row, Space, Spin, Tag, Upload } from 'antd';
import { FileSearchOutlined, SafetyOutlined, ThunderboltOutlined, UploadOutlined, UserSwitchOutlined, WarningOutlined } from '@ant-design/icons';
import {
  analyzeSafetyDocument,
  analyzeSafetyImage,
  validateCompliance,
  validateWorkers,
  type ComplianceValidationResult,
  type IncidentPredictionResult,
} from '../../../services/aiService';
import { aiAnalyzePTW, type AIPTWAnalysisResult } from '../../../services/mlService';

interface Props {
  permitId: number;
  permit?: any;
}

const severityColor = (value?: string) => {
  const v = (value || '').toLowerCase();
  if (v.includes('critical') || v.includes('extreme')) return 'red';
  if (v.includes('high') || v.includes('warning')) return 'orange';
  if (v.includes('medium') || v.includes('watch')) return 'gold';
  return 'green';
};

const Phase2IntelligencePanel: React.FC<Props> = ({ permitId, permit }) => {
  const [loading, setLoading] = useState<string>('');
  const [incident, setIncident] = useState<IncidentPredictionResult | null>(null);
  const [ptwAnalysis, setPtwAnalysis] = useState<AIPTWAnalysisResult | null>(null);
  const [compliance, setCompliance] = useState<ComplianceValidationResult | null>(null);
  const [workers, setWorkers] = useState<any>(null);
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<any>(null);

  const context = {
    permit_id: permitId,
    permit_type: permit?.permit_type_details?.category,
    description: permit?.description,
    location: permit?.location,
    risk_level: permit?.risk_level,
    risk_score: permit?.risk_score,
    work_nature: permit?.work_nature,
    hazards: permit?.other_hazards,
    control_measures: permit?.control_measures,
    ppe_requirements: permit?.ppe_requirements,
  };

  const runIncident = async () => {
    setLoading('incident');
    try {
      const analysis = await aiAnalyzePTW(permitId);
      setPtwAnalysis(analysis);
      setIncident({
        incident_probability_score: analysis.incident_probability,
        severity_prediction: analysis.risk_level,
        warning_level: analysis.risk_level === 'HIGH' ? 'critical' : analysis.risk_level === 'MEDIUM' ? 'warning' : 'normal',
        possible_incidents: analysis.predicted_hazards,
        recommendations: analysis.recommended_controls,
        confidence: 0,
      } as IncidentPredictionResult);
    } finally {
      setLoading('');
    }
  };

  const runCompliance = async () => {
    setLoading('compliance');
    try {
      setCompliance(await validateCompliance(context));
    } finally {
      setLoading('');
    }
  };

  const runWorkers = async () => {
    setLoading('workers');
    try {
      setWorkers(await validateWorkers({ permit_id: permitId }));
    } finally {
      setLoading('');
    }
  };

  const uploadForAnalysis = async (file: File, type: 'image' | 'document') => {
    setLoading(type);
    const data = new FormData();
    data.append(type, file);
    data.append('permit_id', String(permitId));
    try {
      const result = type === 'image' ? await analyzeSafetyImage(data) : await analyzeSafetyDocument(data);
      if (type === 'image') setImageAnalysis(result);
      else setDocumentAnalysis(result);
    } finally {
      setLoading('');
    }
    return false;
  };

  return (
    <Card
      title={<Space><ThunderboltOutlined /> Phase 2 AI Safety Intelligence</Space>}
      style={{ marginTop: 16 }}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Button icon={<WarningOutlined />} loading={loading === 'incident'} onClick={runIncident}>
          Predict Incidents
        </Button>
        <Button icon={<SafetyOutlined />} loading={loading === 'compliance'} onClick={runCompliance}>
          Validate Compliance
        </Button>
        <Button icon={<UserSwitchOutlined />} loading={loading === 'workers'} onClick={runWorkers}>
          Validate Workers
        </Button>
        <Upload showUploadList={false} beforeUpload={(file) => uploadForAnalysis(file, 'image')}>
          <Button icon={<UploadOutlined />} loading={loading === 'image'}>Analyze Image</Button>
        </Upload>
        <Upload showUploadList={false} beforeUpload={(file) => uploadForAnalysis(file, 'document')}>
          <Button icon={<FileSearchOutlined />} loading={loading === 'document'}>Analyze Document</Button>
        </Upload>
      </Space>

      {loading && <Spin size="small" style={{ marginBottom: 12 }} />}

      <Row gutter={[16, 16]}>
        {incident && (
          <Col xs={24} lg={12}>
            <Card size="small" title="AI Risk Analysis">
              <Alert
                type={incident.warning_level === 'critical' ? 'error' : incident.warning_level === 'warning' ? 'warning' : 'info'}
                showIcon
                message={`${incident.severity_prediction} incident potential`}
                description={`Probability ${incident.incident_probability_score}% | Confidence ${incident.confidence}%`}
                style={{ marginBottom: 12 }}
              />
              <Progress percent={incident.incident_probability_score} strokeColor={severityColor(incident.severity_prediction)} />
              <List size="small" header="Possible incidents" dataSource={incident.possible_incidents || []} renderItem={(item) => <List.Item>{item}</List.Item>} />
              <List size="small" header="Recommendations" dataSource={incident.recommendations || []} renderItem={(item) => <List.Item>{item}</List.Item>} />
              {ptwAnalysis && (
                <>
                  <List size="small" header="Recommended PPE" dataSource={ptwAnalysis.recommended_ppe || []} renderItem={(item) => <List.Item>{item}</List.Item>} />
                  <List size="small" header="Suggested Toolbox Talks" dataSource={ptwAnalysis.recommended_toolbox_talks || []} renderItem={(item) => <List.Item>{item}</List.Item>} />
                  <List
                    size="small"
                    header="Similar Previous Incidents"
                    dataSource={ptwAnalysis.similar_previous_incidents || []}
                    renderItem={(item: any) => <List.Item>{item.incident_id || item.id} - {item.title}</List.Item>}
                  />
                </>
              )}
            </Card>
          </Col>
        )}

        {compliance && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Compliance Validation">
              <Alert
                type={compliance.blocking ? 'error' : 'success'}
                showIcon
                message={compliance.blocking ? 'Blocking compliance issues found' : 'No blocking compliance issues'}
                description={`Compliance score ${compliance.compliance_score}%`}
                style={{ marginBottom: 12 }}
              />
              <Progress percent={compliance.compliance_score} />
              <List
                size="small"
                dataSource={compliance.violations || []}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color={severityColor(item.severity)}>{item.severity}</Tag>
                    {item.message} <span style={{ color: '#666' }}>- {item.correction}</span>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {workers && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Worker Eligibility">
              <Alert
                type={workers.blocking ? 'error' : 'success'}
                showIcon
                message={workers.blocking ? 'Worker validation blocked' : 'Workers eligible'}
                style={{ marginBottom: 12 }}
              />
              <List
                size="small"
                dataSource={workers.workers || []}
                renderItem={(item: any) => (
                  <List.Item>
                    <Tag color={item.eligible ? 'green' : 'red'}>{item.eligible ? 'Eligible' : 'Blocked'}</Tag>
                    {item.worker_name} {item.issues?.length ? `- ${item.issues.join(', ')}` : ''}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        )}

        {imageAnalysis && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Image Safety Analysis">
              <Tag color={severityColor(imageAnalysis.overall_severity)}>{imageAnalysis.overall_severity}</Tag>
              <List size="small" dataSource={imageAnalysis.detected_hazards || []} renderItem={(item: any) => <List.Item>{item.hazard || item}</List.Item>} />
            </Card>
          </Col>
        )}

        {documentAnalysis && (
          <Col xs={24} lg={12}>
            <Card size="small" title="Document AI Analysis">
              <p>{documentAnalysis.summary}</p>
              <List size="small" header="Compliance gaps" dataSource={documentAnalysis.compliance_gaps || []} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
              <List size="small" header="Checklist items" dataSource={documentAnalysis.checklist_items || []} renderItem={(item: string) => <List.Item>{item}</List.Item>} />
            </Card>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default Phase2IntelligencePanel;
