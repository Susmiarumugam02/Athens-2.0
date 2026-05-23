import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import api from '../../lib/api';

interface PermissionRequestModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  permissionType: 'edit' | 'delete';
  objectId: number;
  contentType: string;
  objectName?: string;
}

const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  permissionType,
  objectId,
  contentType,
  objectName,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.post('/api/permissions/request/', {
        permission_type: permissionType,
        object_id: objectId,
        content_type: contentType,
        reason: values.reason,
      });
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      if (error?.errorFields) return; // validation error, don't show message
      message.error(error?.response?.data?.error || 'Failed to send permission request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={`Request ${permissionType === 'edit' ? 'Edit' : 'Delete'} Permission`}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          Send Request
        </Button>,
      ]}
      destroyOnHidden
    >
      <p>
        You don't have permission to <strong>{permissionType}</strong>{' '}
        {objectName ? <strong>"{objectName}"</strong> : 'this item'}.
        Submit a request to your administrator.
      </p>
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label="Reason for request"
          rules={[{ required: true, message: 'Please provide a reason' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Explain why you need this permission..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PermissionRequestModal;
