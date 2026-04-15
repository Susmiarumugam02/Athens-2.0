import React, { useState } from 'react';
import { Modal, Form, DatePicker, Button, message, Input } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import dayjs from 'dayjs';

interface CommitmentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  observationID: string;
  observationDetails: {
    typeOfObservation: string;
    severity: number;
    workLocation: string;
    safetyObservationFound: string;
  };
}

const CommitmentModal: React.FC<CommitmentModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  observationID,
  observationDetails
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      const commitmentDate = values.commitmentDate.format('YYYY-MM-DD');
      
      await api.post(`/api/v1/safetyobservation/${observationID}/update_commitment/`, {
        commitmentDate: commitmentDate,
        remarks: values.remarks || ''
      });

      message.success('Commitment date submitted successfully!');
      form.resetFields();
      onSuccess();
      
    } catch (error) {
      message.error('Failed to submit commitment date');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 1: return 'Low';
      case 2: return 'Medium';
      case 3: return 'High';
      case 4: return 'Critical';
      default: return 'Unknown';
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined />
          <span>Provide Commitment Date - {observationID}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <h4>Observation Details:</h4>
        <p><strong>Type:</strong> {observationDetails.typeOfObservation?.replace('_', ' ')}</p>
        <p><strong>Severity:</strong> {getSeverityText(observationDetails.severity)}</p>
        <p><strong>Location:</strong> {observationDetails.workLocation}</p>
        <p><strong>Description:</strong> {observationDetails.safetyObservationFound}</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          commitmentDate: dayjs().add(7, 'days') // Default to 7 days from now
        }}
      >
        <Form.Item
          name="commitmentDate"
          label="Commitment Date"
          rules={[
            { required: true, message: 'Please select a commitment date' },
            {
              validator: (_, value) => {
                if (value && value.isBefore(dayjs(), 'day')) {
                  return Promise.reject('Commitment date cannot be in the past');
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            placeholder="Select commitment date"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          name="remarks"
          label="Additional Comments (Optional)"
        >
          <Input.TextArea
            rows={3}
            placeholder="Any additional comments about your commitment..."
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Cancel
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<CalendarOutlined />}
          >
            {loading ? 'Submitting...' : 'Submit Commitment'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CommitmentModal;
