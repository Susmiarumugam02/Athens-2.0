import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, Space, InputNumber, DatePicker, Upload, Row, Col, Switch, Divider, Timeline, Progress, AutoComplete } from 'antd';
import { PlusOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { getQualityDefects, createQualityDefect, resolveDefect, getQualityInspections } from '../api';
import PageLayout from '../../../components/ui/PageLayout';

const DefectManagement: React.FC = () => {
  const [defects, setDefects] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadDefects();
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      const { data } = await getQualityInspections();
      setInspections(data?.results || data || []);
    } catch (error) {
    }
  };

  const loadDefects = async () => {
    setLoading(true);
    try {
      const { data } = await getQualityDefects();
      setDefects(data?.results || data || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Don't handle 401 here, let axios interceptor handle it
        return;
      }
      toast.error('Failed to load defects');
      setDefects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefect = async (values: any) => {
    try {
      await createQualityDefect(values);
      toast.success('Quality defect created successfully');
      setModalVisible(false);
      form.resetFields();
      loadDefects();
    } catch (error: any) {
      toast.error('Failed to create defect');
    }
  };

  const handleResolveDefect = async (id: number) => {
    try {
      await resolveDefect(id);
      toast.success('Quality defect resolved successfully');
      loadDefects();
    } catch (error: any) {
      toast.error('Failed to resolve defect');
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      minor: 'green',
      major: 'orange',
      critical: 'red'
    };
    return colors[severity as keyof typeof colors] || 'default';
  };

  const columns = [
    { title: 'Finding ID', dataIndex: 'defect_code', key: 'defect_code', render: (v: any, r: any) => v || r.id },
    { title: 'Finding Title', dataIndex: 'title', key: 'title', render: (_: any, r: any) => r.defect_title || r.title || r.description?.slice(0, 80) },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (category: string) => <Tag>{(category || '').replace('_', ' ').toUpperCase()}</Tag> },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (severity: string) => <Tag color={getSeverityColor(severity)}>{(severity || '').toUpperCase()}</Tag> },
    { title: 'Risk Level', dataIndex: 'risk_level', key: 'risk_level' },
    { title: 'Assigned To', dataIndex: 'assigned_to', key: 'assigned_to' },
    { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', render: (v: string) => v ? new Date(v).toLocaleDateString() : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'closed' ? 'green' : 'orange'}>{String(s).replace(/_/g, ' ').toUpperCase()}</Tag> },
    { title: 'Progress', dataIndex: 'progress', key: 'progress', render: (p: number) => <Progress percent={Number(p) || 0} size="small" /> },
    { title: 'Actions', key: 'actions', render: (_: any, record: any) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedDefect(record); setViewModalVisible(true); }}>View</Button>
        {!record.is_resolved && <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleResolveDefect(record.id)}>Resolve</Button>}
      </Space>
    ) }
  ];

  return (
    <PageLayout
      title="Defect Management"
      subtitle="Track and manage quality defects"
    >
      <Card
        title="Quality Defects"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Add Defect
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={defects}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Quality Findings & Corrective Actions"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1200}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateDefect} initialValues={{ priority: 'normal', severity: 'minor', status: 'draft' }}>
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Finding ID" name="defect_code"><Input disabled placeholder="Auto-generated" /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Inspection Reference" name="inspection"><Select placeholder="Select inspection" showSearch optionFilterProp="children">{inspections.map((ins: any) => <Select.Option key={ins.id} value={ins.id}>{ins.inspection_id?.slice(0,8)} - {ins.reference_number}</Select.Option>)}</Select></Form.Item></Col>
              <Col xs={24} sm={24} md={8}><Form.Item label="Audit Type" name="audit_type"><Select placeholder="Audit type"><Select.Option value="internal">Internal</Select.Option><Select.Option value="external">External</Select.Option><Select.Option value="customer">Customer</Select.Option></Select></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Finding Category" name="category" rules={[{ required: true }]}><AutoComplete options={[{value:'Dimensional'},{value:'Visual'},{value:'Material'},{value:'Functional'}]} /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Department" name="department"><AutoComplete options={[{value:'Quality'},{value:'Production'},{value:'Maintenance'}]} /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Location" name="location"><Input placeholder="Work location" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Observation Date & Time" name="observation_datetime"><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Reported By" name="reported_by"><Input placeholder="Inspector name" /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Assigned To" name="assigned_to"><Input placeholder="Engineer or user" /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Priority Level" name="priority"><Select><Select.Option value="low">Low</Select.Option><Select.Option value="normal">Normal</Select.Option><Select.Option value="high">High</Select.Option><Select.Option value="urgent">Urgent</Select.Option></Select></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Severity Level" name="severity"><Select><Select.Option value="minor">Minor</Select.Option><Select.Option value="major">Major</Select.Option><Select.Option value="critical">Critical</Select.Option></Select></Form.Item></Col>
            </Row>
          </Card>

          <Card title="Quality Finding" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button onClick={() => {/* AI suggest placeholder */}}>AI Smart Suggestion</Button>
                  <Button onClick={() => {/* voice placeholder */}}>Voice Input</Button>
                </Space>
              </Col>
              <Col xs={24} md={16}>
                <Form.Item label="Finding Title" name="defect_title" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item label="Detailed Observation" name="description"><Input.TextArea rows={4} /></Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={12}><Form.Item label="Root Cause Analysis" name="root_cause"><Input.TextArea rows={3} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item label="Impact Analysis" name="impact_analysis"><Input.TextArea rows={3} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}><Form.Item label="Risk Level" name="risk_level"><Select><Select.Option value="low">Low</Select.Option><Select.Option value="medium">Medium</Select.Option><Select.Option value="high">High</Select.Option></Select></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item label="Compliance Reference" name="compliance_reference"><Input /></Form.Item></Col>
                </Row>
              </Col>
            </Row>
          </Card>

          <Card title="Evidence Management" style={{ marginBottom: 16 }}>
            <Upload.Dragger multiple beforeUpload={() => false} accept="image/*,video/*,application/pdf">
              <p className="ant-upload-drag-icon">Drag files here or click to upload</p>
              <p className="ant-upload-text">Upload images, videos or documents (before/after evidence supported)</p>
            </Upload.Dragger>
          </Card>

          <Card title="Corrective Actions" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}><Form.Item label="Corrective Action Required" name="corrective_action"><Input.TextArea rows={3} /></Form.Item></Col>
              <Col xs={24} md={12}><Form.Item label="Preventive Action" name="preventive_action"><Input.TextArea rows={3} /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}><Form.Item label="Responsible Person" name="responsible_person"><Input /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Target Completion Date" name="due_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
              <Col xs={24} sm={12} md={8}><Form.Item label="Verification Method" name="verification_method"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}><Form.Item label="Closure Criteria" name="closure_criteria"><Input /></Form.Item></Col>
              <Col xs={24} md={8}><Form.Item label="Escalation Level" name="escalation_level"><Select><Select.Option value="none">None</Select.Option><Select.Option value="manager">Manager</Select.Option><Select.Option value="safety">Safety</Select.Option></Select></Form.Item></Col>
            </Row>
          </Card>

          <Card title="Approval Workflow" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} md={8}><Form.Item label="Status" name="status"><Select><Select.Option value="draft">Draft</Select.Option><Select.Option value="under_review">Under Review</Select.Option><Select.Option value="approved">Approved</Select.Option><Select.Option value="rejected">Rejected</Select.Option><Select.Option value="closed">Closed</Select.Option></Select></Form.Item></Col>
              <Col xs={24} md={16}><Form.Item label="Reviewer Comments" name="reviewer_comments"><Input.TextArea rows={3} /></Form.Item></Col>
            </Row>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { form.submit(); }}>Save Draft</Button>
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">Submit Finding</Button>
          </div>
        </Form>
      </Modal>

      {/* View Defect Modal */}
      <Modal
        title="Defect Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {selectedDefect && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold">Defect Code:</label>
                <p>{selectedDefect.defect_code}</p>
              </div>
              <div>
                <label className="font-semibold">Category:</label>
                <p><Tag>{selectedDefect.category?.replace('_', ' ').toUpperCase()}</Tag></p>
              </div>
              <div>
                <label className="font-semibold">Severity:</label>
                <p><Tag color={getSeverityColor(selectedDefect.severity)}>{selectedDefect.severity?.toUpperCase()}</Tag></p>
              </div>
              <div>
                <label className="font-semibold">Cost Impact:</label>
                <p>{selectedDefect.cost_impact ? `$${selectedDefect.cost_impact.toLocaleString()}` : 'N/A'}</p>
              </div>
              <div>
                <label className="font-semibold">Status:</label>
                <p><Tag color={selectedDefect.is_resolved ? 'green' : 'orange'}>
                  {selectedDefect.is_resolved ? 'Resolved' : 'Open'}
                </Tag></p>
              </div>
              <div>
                <label className="font-semibold">Created:</label>
                <p>{selectedDefect.created_at ? new Date(selectedDefect.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div>
              <label className="font-semibold">Description:</label>
              <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.description}</p>
            </div>
            {selectedDefect.location_details && (
              <div>
                <label className="font-semibold">Location Details:</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.location_details}</p>
              </div>
            )}
            {selectedDefect.corrective_action && (
              <div>
                <label className="font-semibold">Corrective Action:</label>
                <p className="mt-1 p-2 bg-gray-50 rounded">{selectedDefect.corrective_action}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default DefectManagement;