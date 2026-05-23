import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Modal, Form, Input, Select, DatePicker, Upload, Button, Card, Row, Col, Table, Space, Tabs,
  Tag, Progress, Timeline, Divider, Switch, Spin, Empty, Statistic, Tooltip, AutoComplete,
  Drawer, Badge, Rate, Steps
} from 'antd'
import {
  PlusOutlined, SearchOutlined, FilterOutlined, FileTextOutlined, TeamOutlined, ClockCircleOutlined,
  AlertOutlined, CheckCircleOutlined, ExclamationOutlined, LoadingOutlined, LineChartOutlined,
  AudioOutlined, BgColorsOutlined, PictureOutlined, FileOutlined, DeleteOutlined, EditOutlined,
  DownloadOutlined, PrinterOutlined, ShareAltOutlined, LockOutlined, UnlockOutlined, EnterOutlined,
  CheckOutlined, CloseOutlined, ReloadOutlined
} from '@ant-design/icons'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'

// ── Types ─────────────────────────────────────────────────────────────────────
interface RCARecord {
  id: number
  rca_id: string
  finding_reference: string
  incident_title: string
  root_cause_type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  department: string
  assigned_to: string
  due_date: string
  status: 'draft' | 'under_review' | 'investigation_ongoing' | 'capa_assigned' | 'verification_pending' | 'closed'
  progress: number
  problem_statement: string
  why_1: string; why_2: string; why_3: string; why_4: string; why_5: string
  fishbone_man: string; fishbone_machine: string; fishbone_material: string; fishbone_method: string; fishbone_environment: string; fishbone_measurement: string
  corrective_action: string
  preventive_action: string
  verification_method: string
  created_at: string
  updated_at: string
}

type RCAStatus = 'draft' | 'under_review' | 'investigation_ongoing' | 'capa_assigned' | 'verification_pending' | 'closed'
type Severity = 'critical' | 'high' | 'medium' | 'low'

// ── Status and Severity Metadata ───────────────────────────────────────────
const statusMeta: Record<RCAStatus, { label: string; color: string; icon?: React.ReactNode }> = {
  draft: { label: 'Draft', color: 'default', icon: <FileTextOutlined /> },
  under_review: { label: 'Under Review', color: 'processing', icon: <LoadingOutlined /> },
  investigation_ongoing: { label: 'Investigation Ongoing', color: 'warning', icon: <ExclamationOutlined /> },
  capa_assigned: { label: 'CAPA Assigned', color: 'cyan', icon: <CheckCircleOutlined /> },
  verification_pending: { label: 'Verification Pending', color: 'purple', icon: <ClockCircleOutlined /> },
  closed: { label: 'Closed', color: 'success', icon: <CheckCircleOutlined /> },
}

const severityMeta: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'gold' },
  low: { label: 'Low', color: 'green' },
}

const rootCauseTypes = ['Design Flaw', 'Manufacturing Defect', 'Material Issue', 'Process Failure', 'Human Error', 'Environmental Factor', 'Equipment Failure', 'Supplier Quality', 'Unknown']
const departments = ['Quality', 'Production', 'Engineering', 'HR', 'Supply Chain', 'Maintenance', 'Logistics', 'Other']

// ── RCA Dashboard Summary Cards ───────────────────────────────────────────
function RCADashboardCards({ data }: { data: RCARecord[] }) {
  const totalCases = data.length
  const openCases = data.filter(r => !['closed', 'verification_pending'].includes(r.status)).length
  const closedCases = data.filter(r => r.status === 'closed').length
  const criticalIssues = data.filter(r => r.severity === 'critical').length
  const capaPending = data.filter(r => r.status === 'capa_assigned').length
  const overdueActions = data.filter(r => new Date(r.due_date) < new Date() && !['closed', 'verification_pending'].includes(r.status)).length

  const cards = [
    { title: 'Total RCA Cases', value: totalCases, color: 'blue' },
    { title: 'Open RCA', value: openCases, color: 'orange' },
    { title: 'Closed RCA', value: closedCases, color: 'green' },
    { title: 'Critical Issues', value: criticalIssues, color: 'red' },
    { title: 'CAPA Pending', value: capaPending, color: 'purple' },
    { title: 'Overdue Actions', value: overdueActions, color: 'volcano' },
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {cards.map((card, idx) => (
        <Col xs={24} sm={12} lg={4} key={idx}>
          <Card bordered={false} style={{ backgroundColor: `rgba(24, 144, 255, 0.06)`, borderLeft: `4px solid ${card.color}` }}>
            <Statistic title={card.title} value={card.value} styles={{ content: { color: card.color, fontWeight: 'bold', fontSize: 28 } }} />
          </Card>
        </Col>
      ))}
    </Row>
  )
}

// ── New/Edit RCA Modal Form ───────────────────────────────────────────────
function NewRCAModal({ visible, onClose, onSave, editingRCA, loading }: {
  visible: boolean
  onClose: () => void
  onSave: (data: any) => void
  editingRCA?: RCARecord | null
  loading?: boolean
}) {
  const [form] = Form.useForm()
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (editingRCA) {
      form.setFieldsValue(editingRCA)
    } else {
      form.resetFields()
    }
  }, [editingRCA, visible, form])

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported')
      return
    }
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onstart = () => setVoiceActive(true)
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' '
      }
      setVoiceTranscript(transcript)
    }
    recognition.onerror = () => toast.error('Voice capture error')
    recognition.onend = () => setVoiceActive(false)
    recognition.start()
  }

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop()
    setVoiceActive(false)
  }

  const handleSubmit = (values: any) => {
    const payload = {
      ...values,
      ...(voiceTranscript && { voice_transcript: voiceTranscript }),
      problem_statement: voiceTranscript || values.problem_statement || '',
    }
    onSave(payload)
  }

  return (
    <Drawer
      title={`${editingRCA ? 'Edit' : 'New'} Root Cause Analysis`}
      placement="right"
      width={900}
      onClose={onClose}
      open={visible}
      bodyStyle={{ paddingBottom: 80 }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>Save RCA</Button>
        </div>
      }
    >
      <Spin spinning={loading ?? false}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          {/* ISSUE DETAILS */}
          <Card title="Issue Details" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="RCA ID (Auto)" name="rca_id" disabled>
                  <Input disabled placeholder="Auto-generated" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Linked Finding/NCR" name="finding_reference">
                  <Input placeholder="e.g., QF-2026-001" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item label="Incident Title" name="incident_title" rules={[{ required: true }]}>
                  <Input placeholder="Brief description of the incident" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Observation Date" name="observation_date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Department" name="department">
                  <Select placeholder="Select department" options={departments.map(d => ({ label: d, value: d }))} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Severity" name="severity">
                  <Select placeholder="Select severity" options={['critical', 'high', 'medium', 'low'].map(s => ({ label: severityMeta[s as Severity].label, value: s }))} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Assigned To" name="assigned_to">
                  <Input placeholder="Employee name or ID" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Due Date" name="due_date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* ROOT CAUSE ANALYSIS */}
          <Card title="Root Cause Analysis" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Root Cause Type" name="root_cause_type">
                  <Select placeholder="Select type" options={rootCauseTypes.map(t => ({ label: t, value: t }))} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Reported By" name="reported_by">
                  <Input placeholder="Name of reporter" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Problem Statement" name="problem_statement">
              <Input.TextArea rows={4} placeholder="Describe the problem in detail..." />
            </Form.Item>
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button icon={voiceActive ? <AudioOutlined /> : <AudioOutlined />} onClick={voiceActive ? stopVoiceCapture : startVoiceCapture} danger={voiceActive}>
                {voiceActive ? 'Stop Recording' : 'Start Voice Input'}
              </Button>
              {voiceTranscript && <Tag color="cyan">{voiceTranscript.substring(0, 50)}...</Tag>}
            </div>
          </Card>

          {/* 5-WHY ANALYSIS */}
          <Card title="5-Why Analysis" style={{ marginBottom: 16 }}>
            <Form.Item label="Why 1" name="why_1">
              <Input.TextArea rows={2} placeholder="Why did the problem occur?" />
            </Form.Item>
            <Form.Item label="Why 2" name="why_2">
              <Input.TextArea rows={2} placeholder="Why did the first cause occur?" />
            </Form.Item>
            <Form.Item label="Why 3" name="why_3">
              <Input.TextArea rows={2} placeholder="Why did the second cause occur?" />
            </Form.Item>
            <Form.Item label="Why 4" name="why_4">
              <Input.TextArea rows={2} placeholder="Why did the third cause occur?" />
            </Form.Item>
            <Form.Item label="Why 5" name="why_5">
              <Input.TextArea rows={2} placeholder="Why did the fourth cause occur? (Final root cause)" />
            </Form.Item>
          </Card>

          {/* FISHBONE ANALYSIS */}
          <Card title="Fishbone (Ishikawa) Analysis" style={{ marginBottom: 16 }}>
            <Form.Item label="Man (People)" name="fishbone_man">
              <Input.TextArea rows={2} placeholder="Related to people, training, communication..." />
            </Form.Item>
            <Form.Item label="Machine (Equipment)" name="fishbone_machine">
              <Input.TextArea rows={2} placeholder="Related to machinery, tools, equipment..." />
            </Form.Item>
            <Form.Item label="Material" name="fishbone_material">
              <Input.TextArea rows={2} placeholder="Related to raw materials, components..." />
            </Form.Item>
            <Form.Item label="Method (Process)" name="fishbone_method">
              <Input.TextArea rows={2} placeholder="Related to procedures, processes, standards..." />
            </Form.Item>
            <Form.Item label="Environment" name="fishbone_environment">
              <Input.TextArea rows={2} placeholder="Related to temperature, humidity, space..." />
            </Form.Item>
            <Form.Item label="Measurement" name="fishbone_measurement">
              <Input.TextArea rows={2} placeholder="Related to testing, inspection, measurement..." />
            </Form.Item>
          </Card>

          {/* CAPA INTEGRATION */}
          <Card title="Corrective & Preventive Actions (CAPA)" style={{ marginBottom: 16 }}>
            <Form.Item label="Corrective Action" name="corrective_action">
              <Input.TextArea rows={3} placeholder="What immediate actions to fix the issue?" />
            </Form.Item>
            <Form.Item label="Preventive Action" name="preventive_action">
              <Input.TextArea rows={3} placeholder="What actions to prevent recurrence?" />
            </Form.Item>
            <Form.Item label="Verification Method" name="verification_method">
              <Input placeholder="How will the corrective action be verified?" />
            </Form.Item>
          </Card>

          {/* IMPACT ANALYSIS */}
          <Card title="Impact Analysis" style={{ marginBottom: 16 }}>
            <Form.Item label="Immediate Cause" name="immediate_cause">
              <Input.TextArea rows={2} placeholder="Direct cause of the problem..." />
            </Form.Item>
            <Form.Item label="Underlying Cause" name="underlying_cause">
              <Input.TextArea rows={2} placeholder="Deeper systemic issues..." />
            </Form.Item>
            <Form.Item label="Contributing Factors" name="contributing_factors">
              <Input.TextArea rows={2} placeholder="Other factors that contributed..." />
            </Form.Item>
            <Form.Item label="Impact Analysis" name="impact_analysis">
              <Input.TextArea rows={2} placeholder="Potential impact if not fixed..." />
            </Form.Item>
          </Card>

          {/* EVIDENCE UPLOAD */}
          <Card title="Evidence & Documentation" style={{ marginBottom: 16 }}>
            <Form.Item label="Upload Evidence" name="evidence">
              <Upload.Dragger multiple accept="image/*,video/*,.pdf,.doc,.docx">
                <PictureOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                <p>Drag and drop files or click to upload</p>
                <p style={{ fontSize: 12, color: '#8c8c8c' }}>Images, videos, PDFs supported</p>
              </Upload.Dragger>
            </Form.Item>
          </Card>

          {/* WORKFLOW STATUS */}
          <Card title="Workflow Status" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item label="Status" name="status">
                  <Select placeholder="Select status" options={Object.entries(statusMeta).map(([k, v]) => ({ label: v.label, value: k }))} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Progress (%)" name="progress">
                  <Input type="number" min={0} max={100} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="Closure Notes" name="closure_notes">
              <Input.TextArea rows={2} placeholder="Notes for closure..." />
            </Form.Item>
          </Card>
        </Form>
      </Spin>
    </Drawer>
  )
}

// ── Main RCA Component ─────────────────────────────────────────────────────
const RootCauseAnalysis: React.FC = () => {
  const [rcaData, setRcaData] = useState<RCARecord[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRCA, setEditingRCA] = useState<RCARecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [viewingRCA, setViewingRCA] = useState<RCARecord | null>(null)

  const fetchRCAs = useCallback(async () => {
    setLoading(true)
    try {
      // In production, fetch from API endpoint
      // For now, generate mock data
      const mockData: RCARecord[] = [
        {
          id: 1,
          rca_id: 'RCA-2026-001',
          finding_reference: 'QF-2026-001',
          incident_title: 'Solder Joint Defect in PCB Assembly',
          root_cause_type: 'Design Flaw',
          severity: 'critical',
          department: 'Production',
          assigned_to: 'John Smith',
          due_date: '2026-06-15',
          status: 'investigation_ongoing',
          progress: 60,
          problem_statement: 'Solder joints showing cracks after thermal cycling',
          why_1: 'Design has insufficient clearance', why_2: 'PCB layout not optimized', why_3: 'Thermal stress during assembly',
          why_4: 'Process temperature too high', why_5: 'Training on reflow profile not updated',
          fishbone_man: 'Operators not trained on new reflow profile',
          fishbone_machine: 'Reflow oven temperature calibration off by 5°C',
          fishbone_material: 'Solder paste viscosity inconsistent',
          fishbone_method: 'Reflow profile not validated for new board design',
          fishbone_environment: 'Humidity levels fluctuating',
          fishbone_measurement: 'Temperature measurement points inadequate',
          corrective_action: 'Adjust reflow profile and recalibrate oven',
          preventive_action: 'Update training and implement automated monitoring',
          verification_method: 'Thermal cycling test on 50 samples',
          created_at: '2026-05-10',
          updated_at: '2026-05-16',
        },
        {
          id: 2,
          rca_id: 'RCA-2026-002',
          finding_reference: 'QF-2026-002',
          incident_title: 'Dimensional Out of Spec - Shaft Length',
          root_cause_type: 'Manufacturing Defect',
          severity: 'high',
          department: 'Engineering',
          assigned_to: 'Sarah Johnson',
          due_date: '2026-05-30',
          status: 'capa_assigned',
          progress: 45,
          problem_statement: 'Shaft length measuring 2.1mm instead of 2.0mm',
          why_1: 'CNC tool wear', why_2: 'No tool wear compensation', why_3: 'Maintenance interval missed',
          why_4: 'Schedule not followed', why_5: 'No accountability for maintenance tasks',
          fishbone_man: 'Maintenance technician missed schedule',
          fishbone_machine: 'CNC cutting tool worn',
          fishbone_material: 'Raw material stock inconsistency',
          fishbone_method: 'No tool wear compensation logic',
          fishbone_environment: 'Workshop temperature variation affects metal expansion',
          fishbone_measurement: 'Gauge calibration overdue by 2 weeks',
          corrective_action: 'Replace cutting tool and implement tool wear compensation',
          preventive_action: 'Automate maintenance scheduling and add real-time tool monitoring',
          verification_method: 'SPC control chart for next 500 parts',
          created_at: '2026-05-12',
          updated_at: '2026-05-16',
        },
      ]
      setRcaData(mockData)
    } catch (err: any) {
      toast.error('Failed to load RCA data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRCAs()
  }, [fetchRCAs])

  const handleSaveRCA = async (values: any) => {
    setSaving(true)
    try {
      // In production, POST/PATCH to API
      const newRCA: RCARecord = {
        id: rcaData.length + 1,
        rca_id: `RCA-2026-${String(rcaData.length + 1).padStart(3, '0')}`,
        finding_reference: values.finding_reference || '',
        incident_title: values.incident_title,
        root_cause_type: values.root_cause_type,
        severity: values.severity || 'medium',
        department: values.department,
        assigned_to: values.assigned_to,
        due_date: values.due_date?.format('YYYY-MM-DD') || '',
        status: values.status || 'draft',
        progress: values.progress || 0,
        problem_statement: values.problem_statement || '',
        why_1: values.why_1 || '',
        why_2: values.why_2 || '',
        why_3: values.why_3 || '',
        why_4: values.why_4 || '',
        why_5: values.why_5 || '',
        fishbone_man: values.fishbone_man || '',
        fishbone_machine: values.fishbone_machine || '',
        fishbone_material: values.fishbone_material || '',
        fishbone_method: values.fishbone_method || '',
        fishbone_environment: values.fishbone_environment || '',
        fishbone_measurement: values.fishbone_measurement || '',
        corrective_action: values.corrective_action || '',
        preventive_action: values.preventive_action || '',
        verification_method: values.verification_method || '',
        created_at: editingRCA?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      if (editingRCA) {
        setRcaData(rcaData.map(r => r.id === editingRCA.id ? newRCA : r))
      } else {
        setRcaData([...rcaData, newRCA])
      }
      
      toast.success(`RCA ${editingRCA ? 'updated' : 'created'} successfully`)
      setModalOpen(false)
      setEditingRCA(null)
    } catch (err: any) {
      toast.error('Failed to save RCA')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRCA = (id: number) => {
    Modal.confirm({
      title: 'Delete RCA',
      content: 'Are you sure you want to delete this RCA record?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        setRcaData(rcaData.filter(r => r.id !== id))
        toast.success('RCA deleted')
      },
    })
  }

  const filteredData = rcaData.filter(r => {
    const matchSearch = !search || r.incident_title.toLowerCase().includes(search.toLowerCase()) || r.rca_id.includes(search)
    const matchStatus = !statusFilter || r.status === statusFilter
    const matchSeverity = !severityFilter || r.severity === severityFilter
    return matchSearch && matchStatus && matchSeverity
  })

  const tableColumns = [
    {
      title: 'RCA ID',
      dataIndex: 'rca_id',
      key: 'rca_id',
      width: 100,
      render: (text: string) => <strong>{text}</strong>,
    },
    {
      title: 'Finding Ref',
      dataIndex: 'finding_reference',
      key: 'finding_reference',
      width: 100,
    },
    {
      title: 'Incident Title',
      dataIndex: 'incident_title',
      key: 'incident_title',
      ellipsis: true,
      render: (text: string) => <span title={text}>{text}</span>,
    },
    {
      title: 'Root Cause Type',
      dataIndex: 'root_cause_type',
      key: 'root_cause_type',
      width: 120,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: (severity: Severity) => <Tag color={severityMeta[severity].color}>{severityMeta[severity].label}</Tag>,
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to',
      key: 'assigned_to',
      width: 100,
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 100,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: RCAStatus) => <Badge status={status === 'closed' ? 'success' : 'processing'} text={statusMeta[status].label} />,
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (progress: number) => <Progress percent={progress} size="small" />,
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_: any, record: RCARecord) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => setViewingRCA(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingRCA(record); setModalOpen(true) }} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteRCA(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Dashboard Cards */}
      <RCADashboardCards data={rcaData} />

      {/* Header & Actions */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col xs={24} sm={12}>
            <Input.Search
              placeholder="Search by RCA ID or incident title..."
              prefix={<SearchOutlined />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <Space>
              <Select
                placeholder="Filter by Status"
                style={{ width: 150 }}
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                options={[
                  ...Object.entries(statusMeta).map(([k, v]) => ({ label: v.label, value: k }))
                ]}
              />
              <Select
                placeholder="Filter by Severity"
                style={{ width: 150 }}
                value={severityFilter}
                onChange={setSeverityFilter}
                allowClear
                options={Object.entries(severityMeta).map(([k, v]) => ({ label: v.label, value: k }))}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRCA(null); setModalOpen(true) }}>
                New RCA
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* RCA Table */}
      <Card loading={loading}>
        <Table
          columns={tableColumns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} records` }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: <Empty description="No RCA records found" /> }}
        />
      </Card>

      {/* New/Edit RCA Modal */}
      <NewRCAModal
        visible={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRCA(null) }}
        onSave={handleSaveRCA}
        editingRCA={editingRCA}
        loading={saving}
      />

      {/* View Details Drawer */}
      {viewingRCA && (
        <Drawer
          title={`RCA Details - ${viewingRCA.rca_id}`}
          placement="right"
          width={800}
          onClose={() => setViewingRCA(null)}
          open={!!viewingRCA}
          extra={
            <Space>
              <Button icon={<DownloadOutlined />} />
              <Button icon={<PrinterOutlined />} />
              <Button icon={<ShareAltOutlined />} />
            </Space>
          }
        >
          <Tabs items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><strong>RCA ID:</strong> {viewingRCA.rca_id}</div>
                  <div><strong>Status:</strong> <Tag color={statusMeta[viewingRCA.status].color}>{statusMeta[viewingRCA.status].label}</Tag></div>
                  <div><strong>Incident:</strong> {viewingRCA.incident_title}</div>
                  <div><strong>Severity:</strong> <Tag color={severityMeta[viewingRCA.severity].color}>{severityMeta[viewingRCA.severity].label}</Tag></div>
                  <div><strong>Department:</strong> {viewingRCA.department}</div>
                  <div><strong>Assigned To:</strong> {viewingRCA.assigned_to}</div>
                  <div><strong>Due Date:</strong> {dayjs(viewingRCA.due_date).format('DD/MM/YYYY')}</div>
                  <div><strong>Progress:</strong> <Progress percent={viewingRCA.progress} status={viewingRCA.progress === 100 ? 'success' : 'active'} /></div>
                </div>
              ),
            },
            {
              key: 'analysis',
              label: '5-Why Analysis',
              children: (
                <Timeline items={[
                  { children: <><strong>Why 1:</strong> {viewingRCA.why_1}</>, dot: '1' },
                  { children: <><strong>Why 2:</strong> {viewingRCA.why_2}</>, dot: '2' },
                  { children: <><strong>Why 3:</strong> {viewingRCA.why_3}</>, dot: '3' },
                  { children: <><strong>Why 4:</strong> {viewingRCA.why_4}</>, dot: '4' },
                  { children: <><strong>Why 5 (Final Root Cause):</strong> {viewingRCA.why_5}</>, dot: '✓', color: 'green' },
                ]} />
              ),
            },
            {
              key: 'fishbone',
              label: 'Fishbone',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div><strong>👤 Man:</strong> {viewingRCA.fishbone_man}</div>
                  <div><strong>⚙️ Machine:</strong> {viewingRCA.fishbone_machine}</div>
                  <div><strong>📦 Material:</strong> {viewingRCA.fishbone_material}</div>
                  <div><strong>📋 Method:</strong> {viewingRCA.fishbone_method}</div>
                  <div><strong>🌍 Environment:</strong> {viewingRCA.fishbone_environment}</div>
                  <div><strong>📊 Measurement:</strong> {viewingRCA.fishbone_measurement}</div>
                </div>
              ),
            },
            {
              key: 'capa',
              label: 'CAPA',
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <div><strong>Corrective Action:</strong> {viewingRCA.corrective_action}</div>
                  <div><strong>Preventive Action:</strong> {viewingRCA.preventive_action}</div>
                  <div><strong>Verification Method:</strong> {viewingRCA.verification_method}</div>
                </div>
              ),
            },
          ]} />
        </Drawer>
      )}
    </div>
  )
}

export default RootCauseAnalysis
