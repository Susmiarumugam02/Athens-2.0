import React from 'react';
import { Modal, Descriptions, Tag, Space } from 'antd';
import type { JobTrainingData } from '../types';
import JobTrainingRecordPrintPreview from './JobTrainingRecordPrintPreview';

interface JobTrainingViewProps {
  jobTraining: JobTrainingData;
  visible: boolean;
  onClose: () => void;
}

const JobTrainingView: React.FC<JobTrainingViewProps> = ({ jobTraining, visible, onClose }) => {
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
      title="Job Training Details"
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <JobTrainingRecordPrintPreview trainingData={jobTraining} />
      </Space>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label="Title">{jobTraining.title}</Descriptions.Item>
        {/* Description field removed as per request */}
        <Descriptions.Item label="Date">{jobTraining.date}</Descriptions.Item>
        <Descriptions.Item label="Location">{jobTraining.location}</Descriptions.Item>
        <Descriptions.Item label="Conducted By">{jobTraining.conducted_by}</Descriptions.Item>
        <Descriptions.Item label="Status">
          {getStatusTag(jobTraining.status)}
        </Descriptions.Item>
        <Descriptions.Item label="Created At">
          {jobTraining.created_at}
        </Descriptions.Item>
        <Descriptions.Item label="Updated At">
          {jobTraining.updated_at}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default JobTrainingView;
