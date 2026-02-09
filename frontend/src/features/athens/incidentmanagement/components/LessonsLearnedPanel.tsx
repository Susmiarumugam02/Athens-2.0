import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Tag,
  Select,
  Checkbox,
} from 'antd';
import {
  BookOutlined,
  BulbOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { IncidentLearning } from '../types';
import api from '../services/api';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
const { Option } = Select;

interface LessonsLearnedPanelProps {
  incidentId: string;
  canManage?: boolean;
}

const LessonsLearnedPanel: React.FC<LessonsLearnedPanelProps> = ({
  incidentId,
  canManage = false,
}) => {
  const [learning, setLearning] = useState<IncidentLearning | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  // Load lessons learned data
  const loadLearning = async () => {
    setLoading(true);
    try {
      const data = await api.learning.getLearning(incidentId);
      setLearning(data);
      if (data) {
        form.setFieldsValue(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLearning();
  }, [incidentId]);

  // Handle form submission
  const handleSubmit = async (values: any) => {
    setSaving(true);
    try {
      let savedLearning;
      if (learning) {
        savedLearning = await api.learning.updateLearning(learning.id, values);
        message.success('Lessons learned updated successfully');
      } else {
        savedLearning = await api.learning.createLearning(incidentId, values);
        message.success('Lessons learned saved successfully');
      }
      setLearning(savedLearning);
      setEditing(false);
    } catch (error) {
      message.error('Failed to save lessons learned');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading lessons learned...</div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <BookOutlined />
          Lessons Learned
        </Space>
      }
      extra={
        canManage && (
          <Space>
            {!editing && learning && (
              <Button onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {!editing && !learning && (
              <Button type="primary" onClick={() => setEditing(true)}>
                Add Lessons Learned
              </Button>
            )}
          </Space>
        )
      }
    >
      {editing ? (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            communication_method: 'email',
            requires_training: false,
            requires_policy_update: false,
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="key_findings"
                label="Key Findings"
                rules={[{ required: true, message: 'Please enter key findings' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="What were the key findings from this incident investigation?"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="lessons_learned"
                label="Lessons Learned"
                rules={[{ required: true, message: 'Please enter lessons learned' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="What lessons were learned from this incident?"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="best_practices"
                label="Best Practices Identified"
              >
                <TextArea
                  rows={3}
                  placeholder="What best practices were identified or reinforced?"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="communication_method"
                label="Communication Method"
                rules={[{ required: true, message: 'Please select communication method' }]}
              >
                <Select placeholder="How will this be communicated?">
                  <Option value="email">Email</Option>
                  <Option value="meeting">Team Meeting</Option>
                  <Option value="training">Training Session</Option>
                  <Option value="bulletin">Safety Bulletin</Option>
                  <Option value="newsletter">Newsletter</Option>
                  <Option value="toolbox_talk">Toolbox Talk</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="target_audience"
                label="Target Audience"
              >
                <Select
                  mode="multiple"
                  placeholder="Who should receive this information?"
                >
                  <Option value="all_staff">All Staff</Option>
                  <Option value="management">Management</Option>
                  <Option value="supervisors">Supervisors</Option>
                  <Option value="operators">Operators</Option>
                  <Option value="contractors">Contractors</Option>
                  <Option value="safety_team">Safety Team</Option>
                  <Option value="maintenance">Maintenance</Option>
                  <Option value="engineering">Engineering</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="requires_training"
                valuePropName="checked"
              >
                <Checkbox>Requires Additional Training</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="requires_policy_update"
                valuePropName="checked"
              >
                <Checkbox>Requires Policy Update</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="training_requirements"
            label="Training Requirements"
            dependencies={['requires_training']}
          >
            <TextArea
              rows={3}
              placeholder="Describe any additional training requirements..."
            />
          </Form.Item>

          <Form.Item
            name="policy_recommendations"
            label="Policy Recommendations"
            dependencies={['requires_policy_update']}
          >
            <TextArea
              rows={3}
              placeholder="Describe recommended policy updates..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {learning ? 'Update' : 'Save'} Lessons Learned
              </Button>
            </Space>
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Row gutter={16}>
            <Col span={24}>
              <Title level={5}>
                <FileTextOutlined /> Key Findings
              </Title>
              <Paragraph>{learning?.key_findings}</Paragraph>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Title level={5}>
                <BulbOutlined /> Lessons Learned
              </Title>
              <Paragraph>{learning?.lessons_learned}</Paragraph>
            </Col>
          </Row>

          {learning?.best_practices && (
            <Row gutter={16}>
              <Col span={24}>
                <Title level={5}>
                  <SafetyCertificateOutlined /> Best Practices
                </Title>
                <Paragraph>{learning.best_practices}</Paragraph>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Title level={5}>
                <TeamOutlined /> Communication
              </Title>
              <Space direction="vertical">
                <div>
                  <strong>Method:</strong>{' '}
                  <Tag color="blue">{learning?.communication_method}</Tag>
                </div>
                {learning?.applicable_to && learning.applicable_to.length > 0 && (
                  <div>
                    <strong>Audience:</strong>{' '}
                    {learning.applicable_to.map((audience: string) => (
                      <Tag key={audience} color="green">
                        {audience.replace('_', ' ').toUpperCase()}
                      </Tag>
                    ))}
                  </div>
                )}
              </Space>
            </Col>
            <Col xs={24} sm={12}>
              <Title level={5}>Action Items</Title>
              <Space direction="vertical">
                {learning?.training_required && (
                  <Tag color="orange" icon={<BookOutlined />}>
                    Training Required
                  </Tag>
                )}
                {learning?.policy_updates_required && (
                  <Tag color="red" icon={<EditOutlined />}>
                    Policy Update Required
                  </Tag>
                )}
                {!learning?.training_required && !learning?.policy_updates_required && (
                  <Tag color="green">No Additional Actions Required</Tag>
                )}
              </Space>
            </Col>
          </Row>

          {learning?.training_topics && (
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Title level={5}>Training Requirements</Title>
                <Paragraph>{learning.training_topics}</Paragraph>
              </Col>
            </Row>
          )}

          {learning?.policy_recommendations && (
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Title level={5}>Policy Recommendations</Title>
                <Paragraph>{learning.policy_recommendations}</Paragraph>
              </Col>
            </Row>
          )}

          {!learning && (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <BookOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999' }}>
                No lessons learned have been documented for this incident yet.
              </div>
              {canManage && (
                <Button
                  type="primary"
                  style={{ marginTop: 16 }}
                  onClick={() => setEditing(true)}
                >
                  Add Lessons Learned
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default LessonsLearnedPanel;
