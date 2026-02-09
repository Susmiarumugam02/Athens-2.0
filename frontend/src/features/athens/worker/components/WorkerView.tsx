import React, { useCallback } from 'react';
import { Modal, Descriptions, Badge, Image, Typography, Space, Tag } from 'antd';
import { UserOutlined, IdcardOutlined, HomeOutlined, SolutionOutlined, InfoCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import moment from 'moment';
import type { WorkerData } from '../types';

const { Title, Text } = Typography;

// --- Interface Definition (Unchanged) ---
interface WorkerViewProps {
  worker: WorkerData;
  visible: boolean;
  onClose: () => void;
}

// --- Styled Components for a Themed UI ---
const ViewContainer = styled.div`
  padding: 8px 16px;
  max-height: 70vh;
  overflow-y: auto;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
`;

const ProfileAvatar = styled.div`
  .ant-image-img, .placeholder-avatar {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 50%;
    border: 4px solid var(--color-border);
  }
  .placeholder-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-ui-hover);
    color: var(--color-text-muted);
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const DetailSection = styled.div`
  margin-top: 24px;
`;

const SectionTitle = styled(Title)`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px !important;
  font-size: 1.1rem !important;
  color: var(--color-text-base) !important;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
`;

const StyledDescriptions = styled(Descriptions)`
  .ant-descriptions-item-label {
    font-weight: 500;
    color: var(--color-text-muted);
  }
  .ant-descriptions-item-content {
    color: var(--color-text-base);
  }
`;

// --- Component Definition ---
const WorkerView: React.FC<WorkerViewProps> = ({ worker, visible, onClose }) => {

  const getStatusBadge = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return <Badge status="success" text="Active" />;
      case 'inactive': return <Badge status="error" text="Inactive" />;
      case 'on_leave': return <Badge status="warning" text="On Leave" />;
      default: return <Badge status="default" text={status || 'Unknown'} />;
    }
  }, []);
  
  // ** ADDED HELPER FOR EMPLOYMENT STATUS **
  const getEmploymentStatusTag = useCallback((status: string) => {
    switch (status?.toLowerCase()) {
        case 'initiated': return <Tag color="processing">Initiated</Tag>;
        case 'deployed': return <Tag color="success">Deployed</Tag>;
        case 'terminated': return <Tag color="error">Terminated</Tag>;
        case 'site_transferred': return <Tag color="warning">Site Transferred</Tag>;
        default: return <Tag>{status || 'Unknown'}</Tag>;
    }
  }, []);

  const formatDate = (dateStr: string | undefined) => {
    return dateStr ? moment(dateStr).format('MMMM D, YYYY') : 'N/A';
  };

  return (
    <Modal
      title={<Title level={4} style={{color: 'var(--color-text-base)'}}>Worker Details</Title>}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <ViewContainer>
        <ProfileHeader>
          <ProfileAvatar>
            {worker.photo ? (
              <Image src={worker.photo} alt={`${worker.name}'s photo`} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" />
            ) : (
              <div className="placeholder-avatar"><UserOutlined style={{ fontSize: '48px' }} /></div>
            )}
          </ProfileAvatar>
          <ProfileInfo>
            <Title level={3} style={{ margin: 0, color: 'var(--color-text-base)' }}>
              {worker.name} {worker.surname || ''}
            </Title>
            <Text type="secondary" style={{ fontSize: '1rem' }}>{worker.designation}</Text>
            {/* The primary "Active/Inactive" status remains in the header */}
            <div style={{ marginTop: '8px' }}>{getStatusBadge(worker.status)}</div>
          </ProfileInfo>
        </ProfileHeader>

        <StyledDescriptions bordered column={2} size="small">
            <Descriptions.Item label="Worker ID">{worker.worker_id}</Descriptions.Item>
            <Descriptions.Item label="Department">{worker.department}</Descriptions.Item>
        </StyledDescriptions>

        <DetailSection>
          <SectionTitle level={5}><UserOutlined />Personal Information</SectionTitle>
          <StyledDescriptions bordered column={2} size="small">
            <Descriptions.Item label="Father's/Spouse Name">{worker.father_or_spouse_name || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Date of Birth">{formatDate(worker.date_of_birth)}</Descriptions.Item>
            <Descriptions.Item label="Gender">{worker.gender || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Nationality">{worker.nationality || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Education">{worker.education_level === 'Other' ? worker.education_other : worker.education_level || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Mark of Identification" span={2}>{worker.mark_of_identification || 'N/A'}</Descriptions.Item>
          </StyledDescriptions>
        </DetailSection>

        <DetailSection>
          <SectionTitle level={5}><HomeOutlined />Contact Information</SectionTitle>
          <StyledDescriptions bordered column={2} size="small">
            <Descriptions.Item label="Phone Number">{worker.phone_number}</Descriptions.Item>
            <Descriptions.Item label="Email">{worker.email || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Present Address" span={2}>{worker.present_address || worker.address || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Permanent Address" span={2}>{worker.permanent_address || 'N/A'}</Descriptions.Item>
          </StyledDescriptions>
        </DetailSection>

        <DetailSection>
          <SectionTitle level={5}><SolutionOutlined />Employment & Identity</SectionTitle>
          <StyledDescriptions bordered column={2} size="small">
            <Descriptions.Item label="Joining Date">{formatDate(worker.date_of_joining || worker.joining_date)}</Descriptions.Item>
            <Descriptions.Item label="Employment Type">{worker.employment_type || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Category">{worker.category || 'N/A'}</Descriptions.Item>
            {/* ** ADDED EMPLOYMENT STATUS ** */}
            <Descriptions.Item label="Employment Status" span={2}>{getEmploymentStatusTag(worker.employment_status || '')}</Descriptions.Item>
            <Descriptions.Item label="PAN">{worker.pan || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="Aadhaar">{worker.aadhaar || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="UAN">{worker.uan || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="ESIC IP">{worker.esic_ip || 'N/A'}</Descriptions.Item>
            <Descriptions.Item label="LWF">{worker.lwf || 'N/A'}</Descriptions.Item>
          </StyledDescriptions>
        </DetailSection>
      </ViewContainer>
    </Modal>
  );
};

export default WorkerView;