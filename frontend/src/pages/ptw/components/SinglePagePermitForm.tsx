import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, InputNumber, Button, Select, DatePicker, Switch, Card, Row, Col, App, Spin, Space, Checkbox, Alert, Divider, Typography, Tag } from 'antd';
import { EnvironmentOutlined, QrcodeOutlined, SaveOutlined, CloseOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';
import { useAuthStore } from '../../../store/authStore';
import { createPermit, updatePermit, getPermitTypes, getPermit, getPermitTypeResolvedTemplate, generatePermitQrCode } from '../api';
import PersonnelSelect from './PersonnelSelect';

const { Option } = Select;
const { Text } = Typography;

type ChecklistItem = { key: string; label: string; required: boolean; default_checked: boolean };

const RISK_MATRIX = {
  probability: [
    { value: 1, label: 'Rare', description: 'May occur in exceptional circumstances' },
    { value: 2, label: 'Unlikely', description: 'Could occur at some time' },
    { value: 3, label: 'Possible', description: 'Might occur at some time' },
    { value: 4, label: 'Likely', description: 'Will probably occur' },
    { value: 5, label: 'Almost Certain', description: 'Expected to occur' }
  ],
  severity: [
    { value: 1, label: 'Insignificant', description: 'No injury, minimal impact' },
    { value: 2, label: 'Minor', description: 'First aid treatment' },
    { value: 3, label: 'Moderate', description: 'Medical treatment required' },
    { value: 4, label: 'Major', description: 'Extensive injuries' },
    { value: 5, label: 'Catastrophic', description: 'Death or permanent disability' }
  ]
};

const SinglePagePermitForm: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { projectId } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('');
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [permitTypes, setPermitTypes] = useState<any[]>([]);
  const [resolvedTemplate, setResolvedTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    loadPermitTypes();
    if (isEditing && id) {
      loadPermitData();
    } else {
      const permitNumber = `PTW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      form.setFieldsValue({ permit_number: permitNumber, work_nature: 'day' });
    }
  }, [id]);

  const loadPermitTypes = async () => {
    try {
      const response = await getPermitTypes();
      setPermitTypes(response.data?.results || response.data || []);
    } catch (error) {
      setPermitTypes([
        { id: 1, name: 'Hot Work - Arc Welding', category: 'hot_work' },
        { id: 5, name: 'Confined Space - Entry', category: 'confined_space' },
        { id: 7, name: 'Electrical - High Voltage', category: 'electrical' },
        { id: 10, name: 'Work at Height - Scaffolding', category: 'height' }
      ]);
    }
  };

  const loadPermitData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await getPermit(parseInt(id));
      const permit = response.data;
      form.setFieldsValue({
        ...permit,
        permit_type: Number(permit.permit_type),
        planned_start_time: permit.planned_start_time ? dayjs(permit.planned_start_time) : null,
        planned_end_time: permit.planned_end_time ? dayjs(permit.planned_end_time) : null,
        probability: Number(permit.probability),
        severity: Number(permit.severity),
        safety_checklist: permit.safety_checklist || {}
      });
      if (permit.probability && permit.severity) {
        calculateRisk(Number(permit.probability), Number(permit.severity));
      }
    } catch (error) {
      message.error('Failed to load permit');
    } finally {
      setLoading(false);
    }
  };

  const calculateRisk = (probability: number, severity: number) => {
    const score = probability * severity;
    setRiskScore(score);
    const level = score <= 4 ? 'Low' : score <= 9 ? 'Medium' : score <= 16 ? 'High' : 'Extreme';
    setRiskLevel(level);
    return { score, level };
  };

  const handlePermitTypeChange = async (value: number) => {
    form.setFieldValue('permit_type', value);
    if (!value) return;
    
    setTemplateLoading(true);
    try {
      const response = await getPermitTypeResolvedTemplate(value, projectId);
      const template = response.data;
      const prefill = template.resolved_prefill || {};
      
      if (prefill.ppe_requirements?.length > 0) {
        form.setFieldValue('ppe_requirements', prefill.ppe_requirements);
      }
      if (prefill.control_measures) {
        const controls = Array.isArray(prefill.control_measures) ? prefill.control_measures.join('\n') : prefill.control_measures;
        form.setFieldValue('control_measures', controls);
      }
      if (prefill.safety_checklist?.length > 0) {
        const items = prefill.safety_checklist.map((item: any, idx: number) => ({
          key: typeof item === 'string' ? item : item.key || `item_${idx}`,
          label: typeof item === 'string' ? item : item.label || item,
          required: true,
          default_checked: true
        }));
        setChecklistItems(items);
        const checklistValues: Record<string, boolean> = {};
        items.forEach((item: ChecklistItem) => { checklistValues[item.key] = true; });
        form.setFieldValue('safety_checklist', checklistValues);
      }
      message.success('Template loaded');
    } catch (error) {
      console.warn('Template load failed, using defaults');
    } finally {
      setTemplateLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!id) {
      message.info('Save permit first');
      return;
    }
    setQrLoading(true);
    try {
      const response = await generatePermitQrCode(Number(id));
      setQrImage(response.data.qr_image);
      message.success('QR Code generated');
    } catch (error) {
      message.error('Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const submitData = {
        ...values,
        permit_type: Number(values.permit_type),
        planned_start_time: values.planned_start_time?.toISOString(),
        planned_end_time: values.planned_end_time?.toISOString(),
        probability: Number(values.probability) || 1,
        severity: Number(values.severity) || 1,
        ppe_requirements: values.ppe_requirements || [],
        safety_checklist: values.safety_checklist || {},
        permit_parameters: values.permit_parameters || {}
      };

      let response;
      if (isEditing) {
        response = await updatePermit(parseInt(id!), submitData);
        message.success('Permit updated');
      } else {
        response = await createPermit(submitData);
        message.success('Permit created');
      }
      
      setTimeout(() => navigate('/app/ptw'), 1000);
    } catch (error: any) {
      message.error(error?.response?.data?.detail || 'Failed to save permit');
    } finally {
      setSubmitting(false);
    }
  };

  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      key: `custom_${Date.now()}`,
      label: 'New checklist item',
      required: false,
      default_checked: false
    };
    setChecklistItems(prev => [...prev, newItem]);
  };

  const updateChecklistItemLabel = (key: string, label: string) => {
    setChecklistItems(prev => prev.map(item => item.key === key ? { ...item, label } : item));
  };

  const removeChecklistItem = (key: string) => {
    setChecklistItems(prev => prev.filter(item => item.key !== key));
    const checklistValues = { ...form.getFieldValue('safety_checklist') };
    delete checklistValues[key];
    form.setFieldValue('safety_checklist', checklistValues);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Spin size="large" /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Edit' : 'Create'} Permit to Work</h1>
          <Text type="secondary">All fields in one page - scroll to complete</Text>
        </div>
        <Space>
          {autoSaving && <Spin size="small" />}
          {isEditing && (
            <Button icon={<QrcodeOutlined />} onClick={generateQRCode} loading={qrLoading}>
              Generate QR
            </Button>
          )}
        </Space>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Basic Information */}
        <Card title="1. Basic Information" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="permit_number" label="Permit Number" rules={[{ required: true }]}>
                <Input disabled style={{ backgroundColor: '#f5f5f5', color: '#000' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="permit_type" label="Permit Type" rules={[{ required: true }]}>
                <Select placeholder="Select permit type" onChange={handlePermitTypeChange} loading={permitTypes.length === 0}>
                  {permitTypes.map(type => (
                    <Option key={type.id} value={type.id}>{type.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Work Description" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={3} placeholder="Detailed work description (minimum 10 characters)" showCount maxLength={1000} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="Location" rules={[{ required: true, min: 3 }]}>
                <Input placeholder="Work location" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gps_coordinates" label="GPS Coordinates">
                <Input 
                  placeholder="Lat, Long" 
                  addonAfter={
                    <Button 
                      type="primary" 
                      icon={<EnvironmentOutlined />}
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const coords = `${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
                              form.setFieldValue('gps_coordinates', coords);
                              message.success('Location captured');
                            },
                            () => message.error('Failed to get location')
                          );
                        }
                      }}
                    >
                      Get Location
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="planned_start_time" label="Start Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="planned_end_time" label="End Time" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="work_nature" label="Work Nature" rules={[{ required: true }]}>
                <Select>
                  <Option value="day">Day Work</Option>
                  <Option value="night">Night Work</Option>
                  <Option value="both">Day & Night</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Risk Assessment */}
        <Card title="2. Risk Assessment" className="mb-4">
          {riskScore > 0 && (
            <Alert
              message={`Risk Level: ${riskLevel}`}
              description={`Risk Score: ${riskScore}/25 (Probability × Severity)`}
              type={riskLevel === 'Low' ? 'success' : riskLevel === 'Medium' ? 'warning' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="probability" label="Probability (Likelihood)" rules={[{ required: true }]}>
                <Select 
                  placeholder="Select probability"
                  onChange={(value) => {
                    const severity = form.getFieldValue('severity') || 1;
                    calculateRisk(value, severity);
                  }}
                >
                  {RISK_MATRIX.probability.map(item => (
                    <Option key={item.value} value={item.value}>
                      {item.value} - {item.label}: {item.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="severity" label="Severity (Consequence)" rules={[{ required: true }]}>
                <Select 
                  placeholder="Select severity"
                  onChange={(value) => {
                    const probability = form.getFieldValue('probability') || 1;
                    calculateRisk(probability, value);
                  }}
                >
                  {RISK_MATRIX.severity.map(item => (
                    <Option key={item.value} value={item.value}>
                      {item.value} - {item.label}: {item.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="control_measures" label="Control Measures" rules={[{ required: true, min: 10 }]}>
            <TextArea rows={4} placeholder="Describe control measures (minimum 10 characters)" showCount maxLength={1000} />
          </Form.Item>
        </Card>

        {/* Safety Measures */}
        <Card title="3. Safety Measures" className="mb-4">
          <Form.Item name="ppe_requirements" label="PPE Requirements" rules={[{ required: true }]}>
            <Select mode="tags" placeholder="Select or add PPE">
              <Option value="helmet">Safety Helmet</Option>
              <Option value="gloves">Safety Gloves</Option>
              <Option value="shoes">Safety Shoes</Option>
              <Option value="goggles">Safety Goggles</Option>
              <Option value="harness">Fall Protection</Option>
              <Option value="respirator">Respirator</Option>
              <Option value="coveralls">Protective Coveralls</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Safety Checklist">
            {checklistItems.length === 0 ? (
              <Text type="secondary">No checklist items. Select a permit type or add custom items.</Text>
            ) : (
              checklistItems.map(item => (
                <Row key={item.key} gutter={8} align="middle" style={{ marginBottom: 8 }}>
                  <Col flex="none">
                    <Form.Item name={['safety_checklist', item.key]} valuePropName="checked" noStyle>
                      <Checkbox />
                    </Form.Item>
                  </Col>
                  <Col flex="auto">
                    <Input value={item.label} onChange={(e) => updateChecklistItemLabel(item.key, e.target.value)} />
                  </Col>
                  <Col flex="none">
                    {item.required && <Tag color="red">Required</Tag>}
                    <Button type="text" icon={<CloseOutlined />} onClick={() => removeChecklistItem(item.key)} disabled={item.required} />
                  </Col>
                </Row>
              ))
            )}
            <Button type="dashed" icon={<PlusOutlined />} onClick={addChecklistItem} style={{ marginTop: 8 }}>
              Add Checklist Item
            </Button>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="requires_isolation" valuePropName="checked" label="LOTO Required">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="risk_assessment_completed" valuePropName="checked" label="Risk Assessment Done">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="special_instructions" label="Special Instructions">
            <TextArea rows={3} placeholder="Any special safety instructions or precautions" />
          </Form.Item>
        </Card>

        {/* Personnel */}
        <Card title="4. Personnel & Documentation" className="mb-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Requestor/Receiver">
                <Input value={useAuthStore.getState().name || 'Current User'} disabled style={{ backgroundColor: '#f5f5f5' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="verifier" label="Verifier" rules={[{ required: true }]}>
                <PersonnelSelect placeholder="Select verifier" userType="epcuser,clientuser" grade="B,C" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="emergency_contacts" label="Emergency Contacts">
            <TextArea rows={2} placeholder="Emergency contact numbers and procedures" />
          </Form.Item>
        </Card>

        {/* QR Code */}
        {qrImage && (
          <Card title="QR Code" className="mb-4">
            <div style={{ textAlign: 'center' }}>
              <img src={qrImage} alt="Permit QR Code" style={{ maxWidth: 220, border: '1px solid #d9d9d9', padding: 12 }} />
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button onClick={() => navigate('/app/ptw')}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
            {isEditing ? 'Update' : 'Create'} Permit
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SinglePagePermitForm;
