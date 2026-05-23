import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Upload,
} from 'antd';
import {
  AudioOutlined,
  AuditOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  HistoryOutlined,
  PlusOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  assignQualityFixing,
  createDefectFromObservation,
  createQualityObservation,
  getQualityActivityLogs,
  getQualityFixings,
  getQualityObservationStats,
  getQualityObservationSuggestions,
  getQualityObservations,
  transitionQualityFixing,
  transitionQualityObservation,
} from '../api';
import { translateVoice } from '../../../services/aiService';
import { useConsideringParameters } from '../../../hooks/useConsideringParameters';
import ConsideringParametersPanel from '../../../components/ConsideringParametersPanel';

const { Text, Title } = Typography;
const { TextArea } = Input;

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

const findingStatuses = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_verification', label: 'Pending Verification' },
  { value: 'closed', label: 'Closed' },
];

const fixingStatuses = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
];

const observationTypes = [
  { value: 'defect', label: 'Defect' },
  { value: 'non_conformance', label: 'Non-Conformance' },
  { value: 'process_deviation', label: 'Process Deviation' },
  { value: 'inspection_finding', label: 'Inspection Finding' },
  { value: 'customer_complaint', label: 'Customer Complaint' },
  { value: 'supplier_issue', label: 'Supplier Issue' },
  { value: 'audit_finding', label: 'Audit Finding' },
];

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

const severityOptions = [
  { value: 'low', label: 'Low', color: 'green', risk: 2 },
  { value: 'medium', label: 'Medium', color: 'gold', risk: 4 },
  { value: 'high', label: 'High', color: 'orange', risk: 8 },
  { value: 'critical', label: 'Critical', color: 'red', risk: 12 },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
];

const departments = ['Quality', 'Production', 'Assembly', 'Welding', 'Paint Shop', 'Civil', 'Electrical', 'Mechanical', 'Stores'];
const areas = ['Incoming inspection', 'Welding bay', 'Paint booth', 'Assembly section', 'Final inspection', 'Storage yard', 'Site installation'];
const products = ['Welded structure', 'Painted panel', 'Assembly frame', 'Electrical panel', 'Pump skid', 'Steel component', 'Concrete element'];
const workLocations = ['Factory Floor', 'Field Site', 'Warehouse', 'Paint Shop', 'Assembly Line', 'Inspection Bay', 'Shipping Dock'];
const costImpacts = ['Low', 'Moderate', 'High', 'Critical'];
const downtimeImpactOptions = ['Minimal', 'Partial', 'Major', 'Shutdown'];
const complianceLevels = ['Compliant', 'At Risk', 'Non-Compliant', 'Regulatory Escalation'];

const qualityRules = [
  {
    keys: ['crack', 'weld', 'welding', 'joint'],
    category: 'welding_defect',
    severity: 'critical',
    rootCauses: ['Improper welding temperature', 'Weak material strength', 'Insufficient cooling', 'Operator technique issue'],
    corrective: 'Hold the item, raise NCR, perform weld inspection/NDT, and rework under approved WPS.',
    preventive: 'Review WPS compliance, verify welder qualification, and add in-process weld checkpoints.',
  },
  {
    keys: ['paint', 'peeling', 'bubble', 'coating'],
    category: 'paint_defect',
    severity: 'medium',
    rootCauses: ['Poor surface preparation', 'Incorrect paint mix ratio', 'Inadequate curing time'],
    corrective: 'Quarantine affected item, verify coating thickness, rework paint defect, and reinspect after curing.',
    preventive: 'Monitor humidity, paint mix ratio, surface preparation and DFT checks.',
  },
  {
    keys: ['surface', 'dent', 'scratch', 'contamination'],
    category: 'surface_defect',
    severity: 'high',
    rootCauses: ['Handling damage', 'Improper storage', 'Inadequate visual inspection'],
    corrective: 'Segregate affected item, inspect adjacent material, and repair or reject per acceptance criteria.',
    preventive: 'Improve material handling, storage protection, and final visual inspection controls.',
  },
  {
    keys: ['leak', 'leakage', 'pressure'],
    category: 'leakage',
    severity: 'critical',
    rootCauses: ['Seal failure', 'Incorrect torque', 'Pressure test failure'],
    corrective: 'Stop release, depressurize safely, replace seal or defective part, and repeat pressure test.',
    preventive: 'Verify torque procedure, inspect seals before assembly, and document pressure hold results.',
  },
];

const displayStatus = (value?: string) => (value || '').replace(/_/g, ' ').toUpperCase();
const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));
const numberOrUndefined = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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

const QualityFindingsFixingsSystem: React.FC = () => {
  const [findingForm] = Form.useForm();
  const [fixingForm] = Form.useForm();
  const [verificationForm] = Form.useForm();
  const [findings, setFindings] = useState<any[]>([]);
  const [fixings, setFixings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [fixingModalOpen, setFixingModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [selectedFixing, setSelectedFixing] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [rootCauses, setRootCauses] = useState<string[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('en-IN');
  const [generatedFindingId, setGeneratedFindingId] = useState<string>('QF-0001');
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const recognitionRef = useRef<any | null>(null);
  const debounceRef = useRef<number | null>(null);

  // ─── Considering Parameters ───────────────────────────────────────────────
  const {
    parameters: cpParams,
    setParameters: setCpParams,
    resetParameters: resetCpParams,
    saveAsDefaults: saveCpDefaults,
    options: cpOptions,
    autoFillResult,
    autoFillLoading,
  } = useConsideringParameters('quality');

  // Sync parameters into the finding form when modal opens
  useEffect(() => {
    if (!findingModalOpen) return;
    const patch: Record<string, string> = {};
    if (cpParams.department && !findingForm.getFieldValue('department')) patch.department = cpParams.department;
    if (cpParams.work_area && !findingForm.getFieldValue('inspection_area')) patch.inspection_area = cpParams.work_area;
    if (cpParams.work_area && !findingForm.getFieldValue('work_location')) patch.work_location = cpParams.work_area;
    if (autoFillResult.severity && !findingForm.getFieldValue('severity')) patch.severity = autoFillResult.severity;
    if (autoFillResult.corrective_action && !findingForm.getFieldValue('corrective_action')) patch.corrective_action = autoFillResult.corrective_action;
    if (Object.keys(patch).length > 0) findingForm.setFieldsValue(patch);
  }, [findingModalOpen, cpParams, autoFillResult, findingForm]);

  const watchedTitle = Form.useWatch('defect_title', findingForm) || '';
  const watchedDescription = Form.useWatch('defect_description', findingForm) || '';
  const watchedRisk = Number(Form.useWatch('quality_risk_score', findingForm) || 4);
  const watchedStatus = Form.useWatch('status', findingForm) || 'open';
  const currentRisk = riskMeta(watchedRisk);

  const analytics = useMemo(() => {
    const openFindings = findings.filter(item => item.status !== 'closed').length;
    const pendingFixings = fixings.filter(item => !['approved', 'closed'].includes(item.approval_status)).length;
    const overdueFixings = fixings.filter(item => item.due_date && !['approved', 'closed'].includes(item.approval_status) && dayjs(item.due_date).isBefore(dayjs(), 'day')).length;
    const recurringDefects = Object.values(
      findings.reduce((acc: Record<string, number>, item) => {
        acc[item.defect_category] = (acc[item.defect_category] || 0) + 1;
        return acc;
      }, {})
    ).filter((count: any) => count > 1).length;
    return { openFindings, pendingFixings, overdueFixings, recurringDefects };
  }, [findings, fixings]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [findingRes, fixingRes, logRes, statsRes] = await Promise.all([
        getQualityObservations(),
        getQualityFixings(),
        getQualityActivityLogs(),
        getQualityObservationStats(),
      ]);
      setFindings(findingRes.data?.results || findingRes.data || []);
      setFixings(fixingRes.data?.results || fixingRes.data || []);
      setLogs(logRes.data?.results || logRes.data || []);
      setStats(statsRes.data || {});
    } catch {
      toast.error('Failed to load quality workflow data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
    };
  }, []);

  const openFindingModal = () => {
    const freshId = `QF-${dayjs().format('YYMMDDHHmmss')}`;
    setGeneratedFindingId(freshId);
    findingForm.resetFields();
    findingForm.setFieldsValue({ finding_id: freshId, inspection_reference: '', status: 'open', quality_risk_score: 4, verification_required: false, qa_approval_status: 'assigned' });
    setUploads([]);
    setVoiceTranscript('');
    setFindingModalOpen(true);
  };

  const refreshAiRecommendations = async () => {
    try {
      const values = findingForm.getFieldsValue();
      const response = await getQualityObservationSuggestions({
        defect_title: values.defect_title,
        defect_description: values.defect_description,
      });
      const data = response.data || {};
      setRootCauses(data.root_causes || rootCauses);
      setRecommendations(data.recommendations || recommendations);
      toast.success('AI suggestions refreshed');
    } catch {
      toast.error('AI suggestion service unavailable');
    }
  };

  const translateDescription = async () => {
    try {
      const current = findingForm.getFieldValue('defect_description') || voiceTranscript;
      if (!current) {
        toast.error('Enter a description first');
        return;
      }
      const translated = await translateVoice(current, 'auto', 'quality_finding', 'defect_description');
      if (translated.professional_english) {
        findingForm.setFieldsValue({ defect_description: translated.professional_english });
        toast.success('Description translated for enterprise reporting');
      }
    } catch {
      toast.error('Translation unavailable');
    }
  };

  const handleUploadChange = ({ fileList }: any) => {
    setUploads(fileList);
    setUploadPreview(fileList.map((file: any) => ({ uid: file.uid, name: file.name, status: file.status, type: file.type })));
  };

  useEffect(() => {
    const text = `${watchedTitle} ${watchedDescription}`;
    const matched = findRules(text);
    if (matched.length) {
      const primary = matched[0];
      findingForm.setFieldsValue({
        defect_category: findingForm.getFieldValue('defect_category') || primary.category,
        severity: findingForm.getFieldValue('severity') || primary.severity,
        quality_risk_score: Math.max(Number(findingForm.getFieldValue('quality_risk_score') || 1), severityOptions.find(item => item.value === primary.severity)?.risk || 4),
        root_cause: findingForm.getFieldValue('root_cause') || primary.rootCauses[0],
        corrective_action: findingForm.getFieldValue('corrective_action') || primary.corrective,
        recommended_fix: findingForm.getFieldValue('recommended_fix') || primary.corrective,
        preventive_action: findingForm.getFieldValue('preventive_action') || primary.preventive,
      });
      setRootCauses(unique(matched.flatMap(rule => rule.rootCauses)));
      setRecommendations(unique(matched.flatMap(rule => [rule.corrective, rule.preventive])));
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (text.trim().length < 10) return;
    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await getQualityObservationSuggestions({
          defect_title: watchedTitle,
          defect_description: watchedDescription,
        });
        const data = response.data || {};
        setRootCauses(data.root_causes || rootCauses);
        setRecommendations(data.recommendations || recommendations);
      } catch {
        // Rule-based suggestions stay active when AI is unavailable.
      }
    }, 650);
  }, [findingForm, watchedDescription, watchedTitle]);

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = voiceLanguage;
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
      setVoiceTranscript(`${finalText} ${interim}`.trim());
    };
    recognition.onerror = () => {
      setVoiceActive(false);
      toast.error('Voice capture stopped');
    };
    recognition.onend = async () => {
      setVoiceActive(false);
      const raw = (finalText || voiceTranscript || '').trim();
      if (!raw) return;
      let text = raw;
      try {
        const translated = await translateVoice(raw, 'auto', 'quality_finding', 'defect_description');
        text = translated.professional_english || raw;
      } catch {
        // Keep the raw transcript if translation is unavailable.
      }
      const lower = text.toLowerCase();
      const patch: Record<string, any> = {};
      if (lower.includes('severity critical')) patch.severity = 'critical';
      if (lower.includes('severity high')) patch.severity = 'high';
      if (lower.includes('create new quality finding')) setFindingModalOpen(true);
      patch.defect_description = findingForm.getFieldValue('defect_description')
        ? `${findingForm.getFieldValue('defect_description')}\n${text}`
        : text;
      patch.defect_title = findingForm.getFieldValue('defect_title') || text.replace(/[.!?]$/, '').slice(0, 90);
      findingForm.setFieldsValue(patch);
      setVoiceTranscript(text);
    };
    recognition.start();
  };

  const stopVoice = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      setVoiceActive(false);
    }
  };

  const submitFinding = async (values: any) => {
    setSubmitting(true);
    try {
      const assignedTo = numberOrUndefined(values.assigned_to);
      const formData = new FormData();
      Object.entries(values).forEach(([key, rawValue]: [string, any]) => {
        if (rawValue === undefined || rawValue === null || rawValue === '') return;
        if (key === 'assigned_to' && !assignedTo) return;
        if (key === 'observation_datetime') formData.append(key, rawValue.toISOString());
        else if (key === 'target_completion_date') formData.append(key, rawValue.format('YYYY-MM-DD'));
        else formData.append(key, String(rawValue));
      });
      formData.append('voice_transcript', voiceTranscript);
      formData.append('ai_recommendations', JSON.stringify(recommendations));
      formData.append('ai_analysis', JSON.stringify({ root_causes: rootCauses, recommendations }));
      formData.append('media_evidence', JSON.stringify(
        uploads
          .filter(file => file.originFileObj && !String(file.originFileObj.type || '').startsWith('image/'))
          .map(file => ({ name: file.name, type: file.originFileObj.type, size: file.originFileObj.size }))
      ));
      uploads.forEach(file => {
        if (file.originFileObj && String(file.originFileObj.type || '').startsWith('image/')) {
          formData.append('image_uploads', file.originFileObj);
        }
      });
      await createQualityObservation(formData);
      toast.success('Quality finding created');
      setFindingModalOpen(false);
      findingForm.resetFields();
      setUploads([]);
      setVoiceTranscript('');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create quality finding');
    } finally {
      setSubmitting(false);
    }
  };

  const openFixingModal = (finding: any) => {
    setSelectedFinding(finding);
    fixingForm.setFieldsValue({
      corrective_action: finding.corrective_action || finding.recommended_fix,
      preventive_action: finding.preventive_action,
      due_date: finding.target_completion_date ? dayjs(finding.target_completion_date) : dayjs().add(7, 'day'),
      assigned_engineer: finding.assigned_to,
    });
    setFixingModalOpen(true);
  };

  const submitFixing = async (values: any) => {
    if (!selectedFinding) return;
    setSubmitting(true);
    try {
      await assignQualityFixing(selectedFinding.id, {
        assigned_engineer: numberOrUndefined(values.assigned_engineer),
        corrective_action: values.corrective_action,
        preventive_action: values.preventive_action,
        due_date: values.due_date?.format('YYYY-MM-DD'),
      });
      toast.success('Fixing assigned');
      setFixingModalOpen(false);
      fixingForm.resetFields();
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to assign fixing');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFindingStatus = async (record: any, statusValue: string) => {
    try {
      await transitionQualityObservation(record.id, { status: statusValue });
      toast.success('Finding status updated');
      await loadData();
    } catch {
      toast.error('Failed to update finding');
    }
  };

  const updateFixingStatus = async (record: any, approvalStatus: string) => {
    try {
      await transitionQualityFixing(record.id, { approval_status: approvalStatus });
      toast.success('Fixing status updated');
      await loadData();
    } catch {
      toast.error('Failed to update fixing');
    }
  };

  const submitVerification = async (values: any) => {
    if (!selectedFixing) return;
    try {
      await transitionQualityFixing(selectedFixing.id, {
        approval_status: values.approval_status,
        verification_notes: values.verification_notes,
        closure_remarks: values.closure_remarks,
      });
      toast.success('Verification updated');
      setVerificationModalOpen(false);
      verificationForm.resetFields();
      await loadData();
    } catch {
      toast.error('Failed to submit verification');
    }
  };

  const createNcr = async (record: any) => {
    try {
      await createDefectFromObservation(record.id);
      toast.success('NCR created from finding');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Unable to create NCR');
    }
  };

  const findingColumns = [
    { title: 'Finding ID', dataIndex: 'observation_id', width: 145 },
    { title: 'Finding Title', dataIndex: 'defect_title', ellipsis: true },
    { title: 'Department', dataIndex: 'department', width: 130 },
    { title: 'Work Area', dataIndex: 'inspection_area', ellipsis: true },
    {
      title: 'Severity',
      dataIndex: 'severity',
      width: 110,
      render: (value: string) => <Tag color={severityOptions.find(item => item.value === value)?.color}>{displayStatus(value)}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      width: 110,
      render: (value: string) => <Tag>{displayStatus(value)}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 185,
      render: (value: string, record: any) => (
        <Select size="small" value={value} style={{ width: 170 }} options={findingStatuses} onChange={(next) => updateFindingStatus(record, next)} />
      ),
    },
    {
      title: 'Actions',
      width: 210,
      render: (_: any, record: any) => (
        <Space wrap>
          <Button size="small" icon={<ToolOutlined />} onClick={() => openFixingModal(record)}>Assign Fix</Button>
          <Button size="small" icon={<FileProtectOutlined />} onClick={() => createNcr(record)}>NCR</Button>
        </Space>
      ),
    },
  ];

  const fixingColumns = [
    { title: 'Fixing ID', dataIndex: 'fixing_id', width: 145 },
    { title: 'Linked Finding', dataIndex: 'finding_code', width: 145 },
    { title: 'Finding Title', dataIndex: 'finding_title', ellipsis: true },
    { title: 'Assigned Engineer', dataIndex: 'assigned_engineer_name', width: 160 },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      width: 120,
      render: (value: string) => value ? dayjs(value).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Approval Status',
      dataIndex: 'approval_status',
      width: 175,
      render: (value: string, record: any) => (
        <Select size="small" value={value} style={{ width: 160 }} options={fixingStatuses} onChange={(next) => updateFixingStatus(record, next)} />
      ),
    },
    {
      title: 'Actions',
      width: 130,
      render: (_: any, record: any) => (
        <Button
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={() => {
            setSelectedFixing(record);
            verificationForm.setFieldsValue({ approval_status: record.approval_status });
            setVerificationModalOpen(true);
          }}
        >
          Verify
        </Button>
      ),
    },
  ];

  const renderDashboard = () => (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Open Findings" value={analytics.openFindings || stats.open || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Pending Fixings" value={analytics.pendingFixings || stats.pending_fixings || 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Recurring Defects" value={analytics.recurringDefects} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Overdue Actions" value={analytics.overdueFixings || stats.overdue_fixings || 0} styles={{ content: { color: '#cf1322' } }} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Severity Distribution">
            {severityOptions.map(item => {
              const count = findings.filter(finding => finding.severity === item.value).length;
              const percent = findings.length ? Math.round((count / findings.length) * 100) : 0;
              return (
                <div key={item.value} style={{ marginBottom: 14 }}>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>{item.label}</Text>
                    <Text strong>{count}</Text>
                  </Space>
                  <Progress percent={percent} strokeColor={item.color} showInfo={false} />
                </div>
              );
            })}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Workflow Health">
            <Timeline
              items={[
                { color: 'blue', children: `Findings reported: ${findings.length}` },
                { color: 'orange', children: `Fixings in progress: ${fixings.filter(item => item.approval_status === 'in_progress').length}` },
                { color: 'purple', children: `Pending verification: ${fixings.filter(item => item.approval_status === 'submitted').length}` },
                { color: 'green', children: `Closed findings: ${findings.filter(item => item.status === 'closed').length}` },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={12}>
            <Title level={4} style={{ marginBottom: 4 }}>Quality Findings & Fixings</Title>
            <Text type="secondary">AI-assisted QA/QC workflow for findings, NCR, CAPA, RCA, verification and closure.</Text>
          </Col>
          <Col xs={24} lg={12}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Badge status={voiceActive ? 'processing' : 'default'} text={voiceActive ? 'Voice assistant listening' : 'Voice assistant ready'} />
              <Button icon={<AudioOutlined />} danger={voiceActive} onClick={voiceActive ? stopVoice : startVoice}>
                {voiceActive ? 'Stop Voice' : 'Voice Assistant'}
              </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openFindingModal}>New Finding</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs
        items={[
          {
            key: 'findings',
            label: <span><SafetyCertificateOutlined /> Quality Findings</span>,
            children: (
              <Card title="Quality Findings" extra={<Button type="primary" icon={<PlusOutlined />} onClick={openFindingModal}>Create Finding</Button>}>
                <Table columns={findingColumns} dataSource={findings} rowKey="id" loading={loading} scroll={{ x: 1250 }} />
              </Card>
            ),
          },
          {
            key: 'fixings',
            label: <span><ToolOutlined /> Quality Fixings</span>,
            children: <Card title="Corrective & Preventive Fixings"><Table columns={fixingColumns} dataSource={fixings} rowKey="id" loading={loading} scroll={{ x: 1050 }} /></Card>,
          },
          {
            key: 'ncr',
            label: <span><FileProtectOutlined /> NCR</span>,
            children: <Card title="Non-Conformance Reports"><Table columns={findingColumns} dataSource={findings.filter(item => item.ncr_required)} rowKey="id" loading={loading} scroll={{ x: 1250 }} /></Card>,
          },
          {
            key: 'capa',
            label: <span><CheckCircleOutlined /> CAPA</span>,
            children: <Card title="CAPA Management"><Table columns={fixingColumns} dataSource={fixings} rowKey="id" loading={loading} scroll={{ x: 1050 }} /></Card>,
          },
          {
            key: 'rca',
            label: <span><RobotOutlined /> Root Cause Analysis</span>,
            children: (
              <Row gutter={[16, 16]}>
                {findings.map(finding => (
                  <Col xs={24} md={12} xl={8} key={finding.id}>
                    <Card title={finding.observation_id} size="small">
                      <Text strong>{finding.defect_title}</Text>
                      <div style={{ marginTop: 12 }}><Tag color="blue">{finding.defect_category}</Tag><Tag color="orange">{finding.severity}</Tag></div>
                      <Alert style={{ marginTop: 12 }} type="info" message="Root Cause" description={finding.root_cause || 'RCA pending'} />
                      <Alert style={{ marginTop: 12 }} type="success" message="Recommended Fix" description={finding.recommended_fix || finding.corrective_action || 'Recommended fix pending'} />
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
          {
            key: 'audit',
            label: <span><AuditOutlined /> Inspection Audit Logs</span>,
            children: (
              <Card title="Audit Trail">
                <Table
                  dataSource={logs}
                  rowKey="id"
                  loading={loading}
                  columns={[
                    { title: 'Time', dataIndex: 'created_at', render: (value: string) => value ? dayjs(value).format('DD MMM YYYY HH:mm') : '-' },
                    { title: 'Finding', dataIndex: 'finding_code' },
                    { title: 'Fixing', dataIndex: 'fixing_code' },
                    { title: 'Action', dataIndex: 'action', render: (value: string) => <Tag>{displayStatus(value)}</Tag> },
                    { title: 'From', dataIndex: 'from_status' },
                    { title: 'To', dataIndex: 'to_status' },
                    { title: 'Actor', dataIndex: 'actor_name' },
                    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
                  ]}
                  scroll={{ x: 1000 }}
                />
              </Card>
            ),
          },
          {
            key: 'analytics',
            label: <span><BarChartOutlined /> Quality Analytics Dashboard</span>,
            children: renderDashboard(),
          },
        ]}
      />

      <Modal
        title="Create Quality Finding"
        open={findingModalOpen}
        onCancel={() => setFindingModalOpen(false)}
        footer={null}
        width={1280}
        destroyOnHidden
        styles={{ body: { padding: 0 } }}
      >
        <Card style={{ borderRadius: 0, marginBottom: 0, boxShadow: 'none', borderBottom: '1px solid #f0f0f0' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={14}>
              <Title level={4} style={{ marginBottom: 4 }}>Quality Finding Details</Title>
              <Text type="secondary">Enterprise-grade workflow with AI recommendations, voice capture, evidence tracking and corrective action planning.</Text>
            </Col>
            <Col xs={24} md={10}>
              <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button icon={<RobotOutlined />} onClick={refreshAiRecommendations}>AI Suggest</Button>
                <Button icon={<AudioOutlined />} danger={voiceActive} onClick={voiceActive ? stopVoice : startVoice}>{voiceActive ? 'Stop Voice' : 'Voice Input'}</Button>
                <Button onClick={translateDescription}>Translate</Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Form
          form={findingForm}
          layout="vertical"
          onFinish={submitFinding}
          initialValues={{
            inspection_reference: '',
            observation_datetime: dayjs(),
            observation_type: 'defect',
            severity: 'medium',
            priority: 'normal',
            status: 'open',
            quality_risk_score: 4,
            verification_required: false,
            qa_approval_status: 'assigned',
            cost_impact: 'Moderate',
            risk_level: 'Medium',
            downtime_impact: 'Partial',
            compliance_impact: 'At Risk',
          }}
        >
          {/* ── Considering Parameters ── */}
          <div style={{ padding: '0 16px 8px' }}>
            <ConsideringParametersPanel
              parameters={cpParams}
              options={cpOptions}
              autoFillResult={autoFillResult}
              autoFillLoading={autoFillLoading}
              onChange={setCpParams}
              onReset={resetCpParams}
              onSaveDefaults={saveCpDefaults}
              visibleParams={['department', 'work_area', 'site', 'process_type', 'risk_category', 'asset']}
              collapsed
            />
          </div>
          <Card type="inner" title="Basic Finding Information" style={{ margin: '0 16px 16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Finding ID" name="finding_id" initialValue={generatedFindingId}><Input size="large" disabled /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Inspection Reference" name="inspection_reference"><Input size="large" placeholder="INS-2026-014" /></Form.Item></Col>
              <Col xs={24} sm={24} md={8}><Form.Item label="Reported By" name="reported_by"><AutoComplete size="large" options={departments.map(value => ({ value }))} placeholder="Inspector name" /></Form.Item></Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}><Form.Item label="Defect Title" name="defect_title" rules={[{ required: true }]}><Input size="large" placeholder="Defect title for dashboards" /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item label="Defect Category" name="defect_category" rules={[{ required: true }]}><AutoComplete size="large" options={defectCategories.map(item => ({ value: item.label }))} placeholder="Select or type category" /></Form.Item></Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}><Form.Item label="Severity" name="severity" rules={[{ required: true }]}><Select size="large" options={severityOptions} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Priority" name="priority" rules={[{ required: true }]}><Select size="large" options={priorityOptions} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Department" name="department" rules={[{ required: true }]}><AutoComplete size="large" options={departments.map(value => ({ value }))} placeholder="Department" /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Inspection Area" name="inspection_area" rules={[{ required: true }]}><AutoComplete size="large" options={areas.map(value => ({ value }))} placeholder="Inspection area" /></Form.Item></Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}><Form.Item label="Work Location" name="work_location"><AutoComplete size="large" options={workLocations.map(value => ({ value }))} placeholder="Location" /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Product / Asset" name="product_asset" rules={[{ required: true }]}><AutoComplete size="large" options={products.map(value => ({ value }))} placeholder="Asset or product" /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Date & Time" name="observation_datetime" rules={[{ required: true }]}><DatePicker showTime size="large" style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Status" name="status"><Select size="large" options={findingStatuses} /></Form.Item></Col>
            </Row>
          </Card>

          <Card type="inner" title="Defect Description" style={{ margin: '0 16px 16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={8}>
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Text strong>Observation Details</Text>
                  <Text type="secondary">Capture the key observation, evidence and inspection context.</Text>
                  <Button type="default" onClick={refreshAiRecommendations}>AI Suggestion</Button>
                  <Button type="default" icon={<AudioOutlined />} onClick={voiceActive ? stopVoice : startVoice}>{voiceActive ? 'Stop Voice' : 'Voice Input'}</Button>
                  <Button type="default" onClick={translateDescription}>Translate</Button>
                </Space>
              </Col>
              <Col xs={24} lg={16}>
                <Form.Item label="Observation Details" name="observation_details"><TextArea rows={3} placeholder="Summarize what was observed, location, process impact and any urgency" /></Form.Item>
                <Form.Item label="Defect Description" name="defect_description" rules={[{ required: true }]}><TextArea rows={4} placeholder="Describe the finding, evidence, acceptance criteria and impact" /></Form.Item>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}><Form.Item label="Root Cause" name="root_cause"><TextArea rows={3} placeholder="Primary causal factor" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item label="Immediate Action Taken" name="immediate_action"><TextArea rows={3} placeholder="Actions already taken to contain the issue" /></Form.Item></Col>
                </Row>
              </Col>
            </Row>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card type="inner" title="Quality Fixings & Corrective Actions" style={{ margin: '0 16px 16px' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}><Form.Item label="Corrective Action" name="corrective_action" rules={[{ required: true }]}><TextArea rows={4} placeholder="Corrective steps to resolve the defect" /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item label="Preventive Action" name="preventive_action"><TextArea rows={4} placeholder="Actions to prevent recurrence" /></Form.Item></Col>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={8}><Form.Item label="Assigned Engineer" name="assigned_engineer"><InputNumber min={1} size="large" style={{ width: '100%' }} placeholder="Engineer ID" /></Form.Item></Col>
                  <Col xs={24} sm={12} md={8}><Form.Item label="Due Date" name="due_date"><DatePicker size="large" style={{ width: '100%' }} /></Form.Item></Col>
                  <Col xs={24} sm={12} md={8}><Form.Item label="Verification Required" name="verification_required" valuePropName="checked"><Switch /></Form.Item></Col>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} md={12}><Form.Item label="QA Approval Status" name="qa_approval_status"><Select size="large" options={fixingStatuses} /></Form.Item></Col>
                  <Col xs={24} sm={12} md={12}><Form.Item label="Reported By" name="reporter_contact"><Input size="large" placeholder="QA Lead or Inspector" /></Form.Item></Col>
                </Row>
              </Card>

              <Card type="inner" title="Image & Video Evidence" style={{ margin: '0 16px 16px' }}>
                <Form.Item>
                  <Upload.Dragger
                    fileList={uploads}
                    beforeUpload={() => false}
                    onChange={handleUploadChange}
                    multiple
                    maxCount={8}
                    accept="image/*,video/*"
                  >
                    <p className="ant-upload-drag-icon"><HistoryOutlined /></p>
                    <p className="ant-upload-text">Drag and drop images or video evidence here</p>
                    <p className="ant-upload-hint">Upload before/after evidence, site photos, and disciplinary media.</p>
                  </Upload.Dragger>
                </Form.Item>
                {uploadPreview.length > 0 && (
                  <Row gutter={[12, 12]}>
                    {uploadPreview.map(file => (
                      <Col key={file.uid} xs={24} sm={12} md={8}>
                        <Card size="small" type="inner" title={file.name}>
                          <Text type="secondary">{file.type || 'Evidence file'}</Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card type="inner" title="AI Recommendation Panel" style={{ margin: '0 16px 16px' }}>
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  <Statistic title="Severity Prediction" value={currentRisk.label} styles={{ content: { color: currentRisk.color } }} />
                  <Statistic title="Risk Score" value={watchedRisk} suffix="/16" />
                  <Statistic title="Recurring Issue" value={analytics.recurringDefects || 0} />
                </Space>
                <Divider />
                <Text strong>Likely Root Causes</Text>
                <div style={{ marginTop: 10 }}>{rootCauses.map(item => <Tag key={item} color="blue" style={{ marginBottom: 6 }}>{item}</Tag>)}</div>
                <Divider />
                <Text strong>Suggested Fixes</Text>
                <div style={{ marginTop: 10 }}>{recommendations.map(item => <Tag key={item} color="green" style={{ marginBottom: 6 }}>{item}</Tag>)}</div>
              </Card>

              <Card type="inner" title="Workflow Status" style={{ margin: '0 16px 16px' }}>
                <Timeline>
                  <Timeline.Item color={watchedStatus === 'open' ? 'blue' : 'gray'}>Open</Timeline.Item>
                  <Timeline.Item color={watchedStatus === 'under_review' ? 'orange' : 'gray'}>Under Review</Timeline.Item>
                  <Timeline.Item color={watchedStatus === 'assigned' ? 'purple' : 'gray'}>Assigned</Timeline.Item>
                  <Timeline.Item color={watchedStatus === 'in_progress' ? 'cyan' : 'gray'}>In Progress</Timeline.Item>
                  <Timeline.Item color={watchedStatus === 'pending_verification' ? 'gold' : 'gray'}>Pending Verification</Timeline.Item>
                  <Timeline.Item color={watchedStatus === 'closed' ? 'green' : 'gray'}>Closed</Timeline.Item>
                </Timeline>
              </Card>

              <Card type="inner" title="Advanced Voice Assistant" style={{ margin: '0 16px 16px' }}>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                  <Button block icon={<AudioOutlined />} danger={voiceActive} onClick={voiceActive ? stopVoice : startVoice}>{voiceActive ? 'Stop Live Transcription' : 'Voice Capture'}</Button>
                  <Text type="secondary">Capture title, description or corrective action using speech input.</Text>
                  {voiceTranscript && <Alert type="info" showIcon message="Live Transcription" description={voiceTranscript} />}
                </Space>
              </Card>
            </Col>
          </Row>

          <Card type="inner" title="Cost & Risk Analysis" style={{ margin: '0 16px 16px' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}><Form.Item label="Cost Impact" name="cost_impact"><Select size="large" options={costImpacts.map(value => ({ value, label: value }))} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Risk Level" name="risk_level"><Select size="large" options={severityOptions.map(item => ({ value: item.label, label: item.label }))} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Downtime Impact" name="downtime_impact"><Select size="large" options={downtimeImpactOptions.map(value => ({ value, label: value }))} /></Form.Item></Col>
              <Col xs={24} sm={12} md={6}><Form.Item label="Compliance Impact" name="compliance_impact"><Select size="large" options={complianceLevels.map(value => ({ value, label: value }))} /></Form.Item></Col>
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}><Form.Item label="Estimated Repair Cost" name="estimated_repair_cost"><InputNumber min={0} formatter={value => value ? `$ ${value}` : ''} parser={value => Number(String(value || '').replace(/\$\s?|,/g, ''))} size="large" style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </Card>

          <div style={{ position: 'sticky', bottom: 0, zIndex: 20, background: '#fff', borderTop: '1px solid #f0f0f0', padding: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => findingForm.submit()}>Save Draft</Button>
              <Button onClick={() => { setFindingModalOpen(false); }}>Cancel</Button>
              <Button type="default" disabled>Assign Fixing</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Submit Finding</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal title="Assign Quality Fixing" open={fixingModalOpen} onCancel={() => setFixingModalOpen(false)} footer={null} width={760} destroyOnHidden>
        {selectedFinding && <Alert style={{ marginBottom: 16 }} type="info" message={selectedFinding.observation_id} description={selectedFinding.defect_title} />}
        <Form form={fixingForm} layout="vertical" onFinish={submitFixing}>
          <Form.Item label="Assigned Engineer User ID" name="assigned_engineer"><InputNumber min={1} size="large" style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Corrective Action" name="corrective_action" rules={[{ required: true }]}><TextArea rows={4} /></Form.Item>
          <Form.Item label="Preventive Action" name="preventive_action"><TextArea rows={3} /></Form.Item>
          <Form.Item label="Due Date" name="due_date"><DatePicker size="large" style={{ width: '100%' }} /></Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setFixingModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>Assign Fixing</Button>
          </Space>
        </Form>
      </Modal>

      <Modal title="Verification Approval" open={verificationModalOpen} onCancel={() => setVerificationModalOpen(false)} footer={null} width={720} destroyOnHidden>
        <Form form={verificationForm} layout="vertical" onFinish={submitVerification}>
          <Form.Item label="Approval Status" name="approval_status" rules={[{ required: true }]}><Select size="large" options={fixingStatuses} /></Form.Item>
          <Form.Item label="Verification Notes" name="verification_notes"><TextArea rows={4} /></Form.Item>
          <Form.Item label="Closure Remarks" name="closure_remarks"><TextArea rows={3} /></Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setVerificationModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit Verification</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default QualityFindingsFixingsSystem;
