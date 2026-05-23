import React from 'react';
import { Modal, Descriptions, Typography, Tag } from 'antd';
import type { ToolboxTalkData } from '../types';

interface ToolboxTalkViewProps {
  toolboxTalk: ToolboxTalkData;
  visible: boolean;
  onClose: () => void;
}

const ToolboxTalkView: React.FC<ToolboxTalkViewProps> = ({ toolboxTalk, visible, onClose }) => {
  const getStatusTag = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'planned':
        return <Tag color="blue">Planned</Tag>;
      case 'completed':
        return <Tag color="green">Completed</Tag>;
      case 'cancelled':
        return <Tag color="red">Cancelled</Tag>;
      default:
        return <Tag color="default">{status || 'Unknown'}</Tag>;
    }
  };

  return (
    <Modal
      open={visible}
      title="Toolbox Talk Details"
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label="Title">{toolboxTalk.title}</Descriptions.Item>
        {/* Description field removed as per request */}
        <Descriptions.Item label="Date">{toolboxTalk.date}</Descriptions.Item>
        <Descriptions.Item label="Location">{toolboxTalk.location}</Descriptions.Item>
        <Descriptions.Item label="Conducted By">{toolboxTalk.conducted_by}</Descriptions.Item>
        <Descriptions.Item label="Status">
          {getStatusTag(toolboxTalk.status)}
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {new Date(toolboxTalk.created_at).toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          {new Date(toolboxTalk.updated_at).toLocaleString()}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default ToolboxTalkView;
