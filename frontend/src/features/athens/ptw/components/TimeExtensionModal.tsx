import React, { useState } from 'react';
import {
  Modal, Form, Input, DatePicker, Select, Switch, Alert, Row, Col,
  Checkbox, Button, Space, Typography, Card, Tag, Divider
} from 'antd';
import { ClockCircleOutlined, WarningOutlined, SafetyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface TimeExtensionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: any) => void;
  permit: any;
  loading?: boolean;
}

const TimeExtensionModal: React.FC<TimeExtensionModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  permit,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [extensionHours, setExtensionHours] = useState(0);
  const [workNatureChange, setWorkNatureChange] = useState(false);
  const [requiresSafetyReview, setRequiresSafetyReview] = useState(false);

  const handleNewEndTimeChange = (newEndTime: any) => {
    if (newEndTime && permit?.planned_end_time) {
      const originalEnd = dayjs(permit.planned_end_time);
      const hours = newEndTime.diff(originalEnd, 'hours');
      setExtensionHours(Math.max(0, hours));
      
      // Check if extension crosses work nature boundaries
      const newEndTimeHour = newEndTime.hour();
      const currentWorkNature = permit.work_nature || 'day';
      
      let needsNatureChange = false;
      if (currentWorkNature === 'day' && (newEndTimeHour >= 18 || newEndTimeHour < 8)) {
        needsNatureChange = true;
      } else if (currentWorkNature === 'night' && newEndTimeHour >= 8 && newEndTimeHour < 18) {
        needsNatureChange = true;
      }
      
      setWorkNatureChange(needsNatureChange);
      setRequiresSafetyReview(needsNatureChange || hours > 4);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const submitData = {
        new_end_time: values.new_end_time.toISOString(),
        new_work_nature: values.new_work_nature,
        reason: values.reason,
        business_justification: values.business_justification,
        safety_impact_assessment: values.safety_impact_assessment,
        additional_lighting_required: values.additional_lighting_required || false,
        additional_supervision_required: values.additional_supervision_required || false,
        additional_ppe_required: values.additional_ppe_required || [],
        emergency_contact_updated: values.emergency_contact_updated || false
      };
      
      onSubmit(submitData);
    } catch (error) {
    }
  };

  const getWorkHoursDisplay = (workNature: string) => {
    switch (workNature) {
      case 'day':
        return '8:00 AM - 6:00 PM';
      case 'night':
        return '8:00 PM - 6:00 AM';
      case 'both':
        return 'Day: 8:00 AM - 6:00 PM, Night: 8:00 PM - 6:00 AM';
      default:
        return 'Not specified';
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ClockCircleOutlined />
          Request Time Extension
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Submit Request
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        {/* Current Permit Information */}
        <Card size="small" title="Current Permit Information" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Permit Number: </Text>
              <Text>{permit?.permit_number}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Current Work Nature: </Text>
              <Tag color="blue">{permit?.work_nature?.toUpperCase()}</Tag>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={12}>
              <Text strong>Current End Time: </Text>
              <Text>{permit?.planned_end_time ? dayjs(permit.planned_end_time).format('YYYY-MM-DD HH:mm') : 'N/A'}</Text>
            </Col>
            <Col span={12}>
              <Text strong>Work Hours: </Text>
              <Text>{getWorkHoursDisplay(permit?.work_nature)}</Text>
            </Col>
          </Row>
        </Card>

        {/* Extension Request */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="new_end_time"
              label="New End Time"
              rules={[{ required: true, message: 'Please select new end time' }]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                disabledDate={(current) => current && current < dayjs()}
                onChange={handleNewEndTimeChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <div style={{ marginTop: 30 }}>
              <Text strong>Extension Hours: </Text>
              <Tag color={extensionHours > 4 ? 'red' : 'green'}>
                +{extensionHours} hours
              </Tag>
            </div>
          </Col>
        </Row>

        {/* Work Nature Change */}
        {workNatureChange && (
          <Alert
            message="Work Nature Change Required"
            description="The extension time crosses into different work hours. Please select the new work nature."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {workNatureChange && (
          <Form.Item
            name="new_work_nature"
            label="New Work Nature"
            rules={[{ required: true, message: 'Please select new work nature' }]}
          >
            <Select placeholder="Select new work nature">
              <Option value="day">Day Work (8:00 AM - 6:00 PM)</Option>
              <Option value="night">Night Work (8:00 PM - 6:00 AM)</Option>
              <Option value="both">Day & Night Work</Option>
            </Select>
          </Form.Item>
        )}

        {/* Safety Review Alert */}
        {requiresSafetyReview && (
          <Alert
            message="Safety Review Required"
            description={
              extensionHours > 4 
                ? "Extensions over 4 hours require safety officer review."
                : "Work nature changes require additional safety assessment."
            }
            type="error"
            showIcon
            icon={<SafetyOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Justification */}
        <Form.Item
          name="reason"
          label="Reason for Extension"
          rules={[{ required: true, message: 'Please provide reason for extension' }]}
        >
          <TextArea
            rows={3}
            placeholder="Explain why the time extension is needed"
          />
        </Form.Item>

        <Form.Item
          name="business_justification"
          label="Business Justification"
        >
          <TextArea
            rows={2}
            placeholder="Business impact if extension is not granted"
          />
        </Form.Item>

        {requiresSafetyReview && (
          <Form.Item
            name="safety_impact_assessment"
            label="Safety Impact Assessment"
            rules={[{ required: true, message: 'Safety impact assessment is required' }]}
          >
            <TextArea
              rows={3}
              placeholder="Assess the safety impact of the time extension and any additional measures needed"
            />
          </Form.Item>
        )}

        {/* Additional Safety Measures for Night Work */}
        {(workNatureChange || permit?.work_nature === 'night') && (
          <>
            <Divider orientation="left">Additional Safety Measures</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="additional_lighting_required" valuePropName="checked">
                  <Checkbox>Additional lighting required</Checkbox>
                </Form.Item>
                <Form.Item name="additional_supervision_required" valuePropName="checked">
                  <Checkbox>Additional supervision required</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="emergency_contact_updated" valuePropName="checked">
                  <Checkbox>Emergency contacts updated</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="additional_ppe_required" label="Additional PPE Required">
              <Checkbox.Group>
                <Row>
                  <Col span={8}>
                    <Checkbox value="high_vis_vest">High-vis vest</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="headlamp">Headlamp</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="reflective_tape">Reflective tape</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="radio_communication">Radio communication</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="emergency_whistle">Emergency whistle</Checkbox>
                  </Col>
                  <Col span={8}>
                    <Checkbox value="portable_lighting">Portable lighting</Checkbox>
                  </Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </>
        )}

        {/* Approval Information */}
        <Alert
          message="Approval Process"
          description={
            requiresSafetyReview
              ? "This extension requires supervisor approval followed by safety officer review."
              : extensionHours <= 2
              ? "This extension can be auto-approved by your supervisor."
              : "This extension requires supervisor approval."
          }
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Form>
    </Modal>
  );
};

export default TimeExtensionModal;