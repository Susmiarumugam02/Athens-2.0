import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  AudioOutlined,
  BulbOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  PlusOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  createDefectFromObservation,
  createQualityObservation,
  getQualityObservationStats,
  getQualityObservationSuggestions,
  getQualityObservations,
  transitionQualityObservation,
} from '../api';
import { analyzeSafetyImage, translateVoice } from '../../../services/aiService';

const { Text, Title } = Typography;
const { TextArea } = Input;

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const defectCategories = [
  { value: 'surface_defect', label: 'Surface Defect' },
  { value: 'paint_defect', label: 'Paint Defect' },
  { value: 'welding_defect', label: 'Welding Defect' },
  { value: 'dimensional', label: 'Dimensional Issue' },
  { value: 'alignment', label: 'Alignment Issue' },
  { value: 'corrosion', label: 'Corrosion' },
  { value: 'leakage', label: 'Leakage' },
  { value: 'material', label: 'Material Non-Conformance' },
  { value: 'documentation', label: 'Documentation Issue' },
  { value: 'process_deviation', label: 'Process Deviation' },
  { value: 'functional', label: 'Functional Failure' },
  { value: 'packaging', label: 'Packaging / Handling' },
];

const statusOptions = [
  { value: 'reported', label: 'Reported' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'root_cause_analysis', label: 'Root Cause Analysis' },
  { value: 'corrective_action', label: 'Corrective Action' },
  { value: 'verified', label: 'Verified' },
  { value: 'closed', label: 'Closed' },
];

const severityOptions = [
  { value: 'low', label: 'Low', score: 2, color: 'green' },
  { value: 'medium', label: 'Medium', score: 5, color: 'gold' },
  { value: 'high', label: 'High', score: 9, color: 'orange' },
  { value: 'critical', label: 'Critical', score: 12, color: 'red' },
];

const qualityRules = [
  {
    keys: ['surface', 'crack', 'scratch', 'dent', 'contamination', 'uneven'],
    category: 'surface_defect',
    severity: 'high',
    risk: 9,
    rootCauses: ['Handling damage', 'Improper surface preparation', 'Inadequate process control'],
    corrective: 'Segregate affected item, inspect adjacent parts, repair or reject as per acceptance criteria.',
    preventive: 'Improve handling method, update visual inspection checklist, and brief operators on defect prevention.',
    recommendations: ['Perform 100% visual inspection for the batch', 'Record defect photographs', 'Verify acceptance criteria before release'],
  },
  {
    keys: ['paint', 'peeling', 'bubble', 'thickness', 'mismatch', 'coating'],
    category: 'paint_defect',
    severity: 'medium',
    risk: 6,
    rootCauses: ['Poor surface preparation', 'Incorrect paint mix ratio', 'Inadequate curing time'],
    corrective: 'Hold affected material, measure coating thickness, rework paint defect, and verify finish after curing.',
    preventive: 'Check paint batch, verify surface preparation, and monitor coating thickness during application.',
    recommendations: ['Use DFT gauge verification', 'Check humidity and curing conditions', 'Review paint process parameters'],
  },
  {
    keys: ['weld', 'welding', 'joint', 'porosity', 'undercut', 'slag'],
    category: 'welding_defect',
    severity: 'critical',
    risk: 12,
    rootCauses: ['Improper heat settings', 'Poor welding technique', 'Contaminated weld surface', 'Operator training issue'],
    corrective: 'Stop release, mark NCR, conduct weld inspection/NDT, grind and rework under approved WPS.',
    preventive: 'Review WPS compliance, calibrate welding parameters, and retrain welders for repeated defects.',
    recommendations: ['Escalate to QA manager', 'Perform NDT if structural weld', 'Verify welder qualification'],
  },
  {
    keys: ['dimension', 'alignment', 'fitment', 'tolerance', 'gap', 'level'],
    category: 'dimensional',
    severity: 'high',
    risk: 9,
    rootCauses: ['Incorrect fixture setting', 'Measurement error', 'Drawing revision mismatch'],
    corrective: 'Measure against latest drawing, quarantine non-conforming item, and rework alignment or dimension deviation.',
    preventive: 'Verify fixture calibration, control drawing revision, and add in-process dimensional checkpoints.',
    recommendations: ['Attach measurement record', 'Check calibration status', 'Review tolerance stack-up'],
  },
  {
    keys: ['corrosion', 'rust', 'oxidation'],
    category: 'corrosion',
    severity: 'high',
    risk: 8,
    rootCauses: ['Improper storage', 'Coating damage', 'Moisture exposure'],
    corrective: 'Quarantine affected item, remove corrosion if permitted, restore protection, and re-inspect.',
    preventive: 'Improve storage conditions, add protective covering, and inspect coating before dispatch.',
    recommendations: ['Check environmental exposure', 'Verify coating protection', 'Inspect nearby inventory'],
  },
  {
    keys: ['leak', 'leakage', 'seepage', 'pressure'],
    category: 'leakage',
    severity: 'critical',
    risk: 12,
    rootCauses: ['Seal failure', 'Incorrect torque', 'Material defect', 'Pressure test failure'],
    corrective: 'Stop testing/release, depressurize safely, replace seal or defective part, and repeat pressure test.',
    preventive: 'Verify torque procedure, inspect seals before assembly, and add pressure hold verification.',
    recommendations: ['Escalate to QA and maintenance', 'Document pressure test evidence', 'Inspect all similar joints'],
  },
];

const departments = ['Quality', 'Production', 'Assembly', 'Welding', 'Paint Shop', 'Civil', 'Electrical', 'Mechanical', 'Stores'];
const products = ['Assembly frame', 'Welded structure', 'Painted panel', 'Electrical panel', 'Cable tray', 'Steel component', 'Concrete element', 'Pump skid'];
const areas = ['Assembly section', 'Welding bay', 'Paint booth', 'Incoming inspection', 'Final inspection', 'Storage yard', 'Shop floor', 'Site installation area'];

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
const normalizeSentence = (value: string) => {
  const text = (value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const punctuated = /[.!?]$/.test(text) ? text : `${text}.`;
  return punctuated.charAt(0).toUpperCase() + punctuated.slice(1);
};
const findRules = (text: string) => {
  const source = (text || '').toLowerCase();
  return qualityRules.filter(rule => rule.keys.some(key => source.includes(key)));
};
const riskMeta = (score: number) => {
  if (score >= 12) return { label: 'Critical', color: '#cf1322', percent: 100 };
  if (score >= 8) return { label: 'High', color: '#d46b08', percent: 75 };
  if (score >= 4) return { label: 'Medium', color: '#d4b106', percent: 50 };
  return { label: 'Low', color: '#389e0d', percent: 25 };
};
const speechLanguageMap: Record<string, string> = {
  auto: 'en-IN',
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ml: 'ml-IN',
};

const QualityObservations: React.FC = () => {
  const [form] = Form.useForm();
  const [observations, setObservations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [rootCauses, setRootCauses] = useState<string[]>([]);
  const [imageInsights, setImageInsights] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('auto');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSource, setAiSource] = useState<'rules' | 'ai' | 'fallback'>('rules');
  const recognitionRef = useRef<any | null>(null);
  const aiDebounceRef = useRef<number | null>(null);
  const defectDescription = Form.useWatch('defect_description', form) || '';
  const defectTitle = Form.useWatch('defect_title', form) || '';
  const productAsset = Form.useWatch('product_asset', form) || '';
  const inspectionArea = Form.useWatch('inspection_area', form) || '';
  const riskScore = Number(Form.useWatch('quality_risk_score', form) || 1);
  const currentRisk = riskMeta(riskScore);

  const smartOptions = useMemo(() => {
    const text = `${defectTitle} ${defectDescription} ${productAsset} ${inspectionArea}`;
    const matched = findRules(text);
    return {
      products,
      areas,
      departments,
      rootCauses: unique([...matched.flatMap(rule => rule.rootCauses), 'Process variation', 'Material handling issue', 'Inspection method gap', 'Operator training issue']),
      recommendations: unique(matched.flatMap(rule => rule.recommendations)),
    };
  }, [defectDescription, defectTitle, inspectionArea, productAsset]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [listResponse, statsResponse] = await Promise.all([
        getQualityObservations(),
        getQualityObservationStats(),
      ]);
      setObservations(listResponse.data?.results || listResponse.data || []);
      setStats(statsResponse.data || {});
    } catch {
      toast.error('Failed to load quality observations');
      setObservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => () => {
    try {
      recognitionRef.current?.abort();
    } catch {}
  }, []);

  const applyRules = (text: string, overwrite = false) => {
    const matched = findRules(text);
    if (!matched.length) return;
    const primary = matched[0];
    const current = form.getFieldsValue();
    const patch: Record<string, any> = {};
    if (overwrite || !current.defect_category) patch.defect_category = primary.category;
    if (overwrite || !current.severity) patch.severity = primary.severity;
    if (overwrite || Number(current.quality_risk_score || 0) < primary.risk) patch.quality_risk_score = primary.risk;
    if (!current.root_cause) patch.root_cause = primary.rootCauses[0];
    if (!current.corrective_action) patch.corrective_action = primary.corrective;
    if (!current.preventive_action) patch.preventive_action = primary.preventive;
    form.setFieldsValue(patch);
    setRecommendations(unique(matched.flatMap(rule => rule.recommendations)));
    setRootCauses(unique(matched.flatMap(rule => rule.rootCauses)));
    setAiSource('rules');
  };

  useEffect(() => {
    const text = `${defectTitle} ${defectDescription} ${productAsset} ${inspectionArea}`;
    applyRules(text);
    if (aiDebounceRef.current) window.clearTimeout(aiDebounceRef.current);
    if (text.trim().length < 10) return;

    aiDebounceRef.current = window.setTimeout(async () => {
      setAiBusy(true);
      try {
        const response = await getQualityObservationSuggestions({
          defect_title: defectTitle,
          defect_description: defectDescription,
          product_asset: productAsset,
          inspection_area: inspectionArea,
        });
        const data = response.data || {};
        form.setFieldsValue({
          defect_category: form.getFieldValue('defect_category') || data.defect_category,
          severity: form.getFieldValue('severity') || data.severity,
          quality_risk_score: Math.max(Number(form.getFieldValue('quality_risk_score') || 1), Number(data.quality_risk_score || 1)),
          corrective_action: form.getFieldValue('corrective_action') || data.corrective_action,
          preventive_action: form.getFieldValue('preventive_action') || data.preventive_action,
        });
        setRootCauses(data.root_causes || []);
        setRecommendations(data.recommendations || []);
        setAiSource(data.source === 'gemini' ? 'ai' : 'rules');
      } catch {
        setAiSource('fallback');
      } finally {
        setAiBusy(false);
      }
    }, 700);
  }, [defectDescription, defectTitle, form, inspectionArea, productAsset]);

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    try {
      recognitionRef.current?.abort();
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLanguageMap[voiceLanguage] || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      let finalText = '';
      recognition.onstart = () => setVoiceActive(true);
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalText += `${transcript} `;
          else interim += transcript;
        }
        setVoiceTranscript(normalizeSentence(`${finalText} ${interim}`));
      };
      recognition.onerror = () => {
        setVoiceActive(false);
        toast.error('Voice capture stopped. You can continue typing.');
      };
      recognition.onend = async () => {
        setVoiceActive(false);
        recognitionRef.current = null;
        const raw = normalizeSentence(finalText || voiceTranscript);
        if (!raw) return;
        setVoiceProcessing(true);
        let professionalText = raw;
        try {
          const translated = await translateVoice(raw, 'auto', 'quality_observation', 'defect_description');
          professionalText = normalizeSentence(translated.professional_english || raw);
          setAiSource(translated.source === 'gemini' ? 'ai' : 'fallback');
        } catch {
          setAiSource('fallback');
        } finally {
          setVoiceProcessing(false);
        }
        const currentDescription = form.getFieldValue('defect_description');
        form.setFieldsValue({
          defect_description: currentDescription ? `${currentDescription}\n${professionalText}` : professionalText,
          defect_title: form.getFieldValue('defect_title') || professionalText.replace(/[.!?]$/, '').slice(0, 80),
        });
        setVoiceTranscript(professionalText);
        applyRules(professionalText);
      };
      recognition.start();
    } catch {
      setVoiceActive(false);
      toast.error('Voice assistant could not start');
    }
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      setVoiceActive(false);
    }
  };

  const handlePhotoUpload = async (info: any) => {
    const fileList = info.fileList || [];
    setPhotos(fileList);
    const latestFile = fileList[fileList.length - 1]?.originFileObj;
    if (!latestFile) return;

    const localMatches = findRules(`${latestFile.name || ''} ${defectDescription}`);
    if (localMatches.length) {
      setImageInsights(unique(localMatches.flatMap(rule => [
        `Possible ${defectCategories.find(item => item.value === rule.category)?.label || rule.category}`,
        ...rule.recommendations.slice(0, 2),
      ])));
    }

    try {
      const imageData = new FormData();
      imageData.append('image', latestFile);
      imageData.append('module', 'quality_observation');
      imageData.append('description', defectDescription || defectTitle || '');
      const result: any = await analyzeSafetyImage(imageData);
      const detected = unique([
        ...(result.detected_hazards || []),
        ...(result.classifications || []),
        ...(result.recommendations || []),
        ...(result.controls || []),
      ]).slice(0, 8);
      if (detected.length) setImageInsights(detected);
    } catch {
      // Image AI is optional; keep upload flow stable.
    }
  };

  const submitObservation = async (values: any) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]: [string, any]) => {
        if (value === undefined || value === null) return;
        if (key === 'observation_datetime') formData.append(key, value.toISOString());
        else if (key === 'target_completion_date') formData.append(key, value.format('YYYY-MM-DD'));
        else formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
      formData.append('ai_recommendations', JSON.stringify(recommendations));
      formData.append('ai_analysis', JSON.stringify({ source: aiSource, root_causes: rootCauses, image_insights: imageInsights }));
      formData.append('voice_transcript', voiceTranscript);
      photos.forEach(file => {
        if (file.originFileObj) formData.append('image_uploads', file.originFileObj);
      });
      await createQualityObservation(formData);
      toast.success('Quality observation reported');
      setModalOpen(false);
      form.resetFields();
      setPhotos([]);
      setRecommendations([]);
      setRootCauses([]);
      setImageInsights([]);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create quality observation');
    } finally {
      setSubmitting(false);
    }
  };

  const transition = async (record: any, status: string) => {
    try {
      await transitionQualityObservation(record.id, { status });
      toast.success('Observation status updated');
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const convertToDefect = async (record: any) => {
    try {
      await createDefectFromObservation(record.id);
      toast.success('NCR / defect created from observation');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Unable to create defect from observation');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'observation_id', key: 'observation_id', width: 150 },
    { title: 'Defect Title', dataIndex: 'defect_title', key: 'defect_title', ellipsis: true },
    { title: 'Product / Asset', dataIndex: 'product_asset', key: 'product_asset', ellipsis: true },
    {
      title: 'Category',
      dataIndex: 'defect_category',
      key: 'defect_category',
      render: (value: string) => <Tag>{defectCategories.find(item => item.value === value)?.label || value}</Tag>,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (value: string) => <Tag color={severityOptions.find(item => item.value === value)?.color}>{value?.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={value === 'closed' ? 'green' : value === 'reported' ? 'blue' : 'orange'}>{value?.replaceAll('_', ' ').toUpperCase()}</Tag>,
    },
    {
      title: 'Risk',
      dataIndex: 'quality_risk_score',
      key: 'quality_risk_score',
      render: (value: number) => {
        const meta = riskMeta(value || 1);
        return <Tag color={meta.color}>{meta.label} ({value || 1})</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space wrap>
          <Select
            size="small"
            value={record.status}
            style={{ width: 160 }}
            onChange={(value) => transition(record, value)}
            options={statusOptions}
          />
          <Button size="small" icon={<FileProtectOutlined />} onClick={() => convertToDefect(record)}>
            NCR
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Quality Observations" value={stats.total || 0} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Open Workflow" value={stats.open || 0} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Critical" value={stats.critical || 0} styles={{ content: { color: '#cf1322' } }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="Closure Rate" value={stats.closure_rate || 0} suffix="%" /></Card>
        </Col>
      </Row>

      <Card
        title="Quality Observations"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Observation</Button>}
      >
        <Table columns={columns} dataSource={observations} rowKey="id" loading={loading} scroll={{ x: 1100 }} />
      </Card>

      <Modal
        title="AI Quality Observation"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={1100}
        destroyOnClose
      >
        <Card style={{ marginBottom: 16, background: '#fafafa' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4}>
                <Text strong><RobotOutlined /> Quality AI Assistant</Text>
                <Text type="secondary">Voice, autofill, RCA, CAPA and defect image intelligence.</Text>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space wrap>
                <Button
                  icon={<AudioOutlined />}
                  danger={voiceActive}
                  type={voiceActive ? 'primary' : 'default'}
                  loading={voiceProcessing}
                  onClick={voiceActive ? stopVoice : startVoice}
                >
                  {voiceActive ? 'Stop Listening' : 'Start Voice'}
                </Button>
                <Select
                  value={voiceLanguage}
                  onChange={setVoiceLanguage}
                  style={{ width: 150 }}
                  options={[
                    { value: 'auto', label: 'Auto detect' },
                    { value: 'en', label: 'English' },
                    { value: 'ta', label: 'Tamil' },
                    { value: 'hi', label: 'Hindi' },
                    { value: 'te', label: 'Telugu' },
                    { value: 'ml', label: 'Malayalam' },
                  ]}
                />
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <ThunderboltOutlined />
                  <Text strong>Quality Risk: {currentRisk.label}</Text>
                  <Badge status={aiBusy ? 'processing' : 'success'} text={aiBusy ? 'AI analyzing' : `AI ${aiSource}`} />
                </Space>
                <Progress percent={currentRisk.percent} strokeColor={currentRisk.color} showInfo={false} />
              </Space>
            </Col>
          </Row>
          {voiceTranscript && <Alert style={{ marginTop: 12 }} type="info" showIcon message="Live transcription" description={voiceTranscript} />}
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={8}>
              <Text strong><BulbOutlined /> AI Recommendations</Text>
              <div style={{ marginTop: 8 }}>
                {(recommendations.length ? recommendations : smartOptions.recommendations).slice(0, 6).map(item => (
                  <Tag key={item} color="green" style={{ marginBottom: 6 }}>{item}</Tag>
                ))}
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Text strong>RCA Suggestions</Text>
              <div style={{ marginTop: 8 }}>
                {(rootCauses.length ? rootCauses : smartOptions.rootCauses).slice(0, 6).map(item => (
                  <Tag key={item} color="blue" style={{ marginBottom: 6 }}>{item}</Tag>
                ))}
              </div>
            </Col>
            <Col xs={24} md={8}>
              <Text strong>Image Insights</Text>
              <div style={{ marginTop: 8 }}>
                {imageInsights.length
                  ? imageInsights.slice(0, 6).map(item => <Tag key={item} color="purple" style={{ marginBottom: 6 }}>{item}</Tag>)
                  : <Text type="secondary">Upload defect photos to analyze cracks, paint defects, dents, corrosion and leakage.</Text>}
              </div>
            </Col>
          </Row>
        </Card>

        <Form
          form={form}
          layout="vertical"
          onFinish={submitObservation}
          initialValues={{
            observation_datetime: dayjs(),
            severity: 'medium',
            status: 'reported',
            quality_risk_score: 4,
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Defect Title" name="defect_title" rules={[{ required: true }]}>
                <Input size="large" placeholder="Crack found near welding joint" onBlur={(event) => applyRules(event.target.value)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Product / Asset" name="product_asset" rules={[{ required: true }]}>
                <AutoComplete size="large" options={smartOptions.products.map(value => ({ value }))} placeholder="Assembly frame / welded structure" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Department" name="department" rules={[{ required: true }]}>
                <AutoComplete size="large" options={smartOptions.departments.map(value => ({ value }))} placeholder="Department" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Inspection Area" name="inspection_area" rules={[{ required: true }]}>
                <AutoComplete size="large" options={smartOptions.areas.map(value => ({ value }))} placeholder="Inspection area" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Date & Time" name="observation_datetime" rules={[{ required: true }]}>
                <DatePicker showTime size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Severity" name="severity" rules={[{ required: true }]}>
                <Select size="large" options={severityOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Defect Category" name="defect_category" rules={[{ required: true }]}>
                <Select size="large" showSearch options={defectCategories} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Quality Risk Score" name="quality_risk_score" rules={[{ required: true }]}>
                <Select
                  size="large"
                  options={[
                    { value: 2, label: 'Low (2)' },
                    { value: 4, label: 'Medium (4)' },
                    { value: 8, label: 'High (8)' },
                    { value: 12, label: 'Critical (12)' },
                    { value: 16, label: 'Severe (16)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Defect Description" name="defect_description" rules={[{ required: true }]}>
            <TextArea rows={4} size="large" placeholder="Describe defect, location, visual evidence and acceptance criteria impact" />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Root Cause" name="root_cause">
                <AutoComplete options={smartOptions.rootCauses.map(value => ({ value }))}>
                  <TextArea rows={3} placeholder="Root cause analysis" />
                </AutoComplete>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Corrective Action" name="corrective_action">
                <TextArea rows={3} placeholder="Immediate correction / containment" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Preventive Action" name="preventive_action">
                <TextArea rows={3} placeholder="Prevent recurrence" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Target Completion" name="target_completion_date">
                <DatePicker size="large" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="NCR Required" name="ncr_required">
                <Select size="large" options={[{ value: false, label: 'No' }, { value: true, label: 'Yes' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Status" name="status">
                <Select size="large" options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Defect Images">
            <Upload
              listType="picture-card"
              fileList={photos}
              onChange={handlePhotoUpload}
              beforeUpload={() => false}
              accept="image/*"
              multiple
              maxCount={6}
            >
              {photos.length >= 6 ? null : (
                <div>
                  <CameraOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                  <div>Upload</div>
                </div>
              )}
            </Upload>
          </Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Tooltip title="Creates a Quality Observation workflow record">
              <Button type="primary" htmlType="submit" loading={submitting} icon={<CheckCircleOutlined />}>
                Submit Observation
              </Button>
            </Tooltip>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default QualityObservations;
