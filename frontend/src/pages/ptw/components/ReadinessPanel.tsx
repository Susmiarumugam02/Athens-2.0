import React, { useState, useEffect } from 'react';
import { Card, Tag, Space, Spin, Alert, Typography, Divider } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { getPermitReadiness, type PermitReadiness } from '../api';

const { Text } = Typography;

interface ReadinessPanelProps {
  permitId: number;
  refreshTrigger?: number;
}

const ReadinessPanel: React.FC<ReadinessPanelProps> = ({ permitId, refreshTrigger = 0 }) => {
  const [readiness, setReadiness] = useState<PermitReadiness | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetchReadiness();
  }, [permitId, refreshTrigger]);

  const fetchReadiness = async () => {
    setLoading(true);
    setUnavailable(false);
    try {
      const response = await getPermitReadiness(permitId);
      setReadiness(response.data);
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 404) {
        setReadiness(null);
        setUnavailable(true);
        return;
      }
      console.error('Failed to fetch readiness:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin />;
  if (unavailable) {
    return <Alert message="Readiness data not available" type="info" />;
  }
  if (!readiness) return <Alert message="Unable to load readiness data" type="warning" />;

  const renderActionBlock = (action: string, canDo: boolean, missing: string[]) => (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Text strong>{action.toUpperCase()}</Text>
          {canDo ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Allowed</Tag>
          ) : (
            <Tag icon={<CloseCircleOutlined />} color="error">Blocked</Tag>
          )}
        </Space>
        {!canDo && missing.length > 0 && (
          <Alert
            message="Missing Requirements"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {missing.map((item, idx) => (
                  <li key={idx}>{item.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            }
            type="warning"
            showIcon
            icon={<WarningOutlined />}
          />
        )}
      </Space>
    </Card>
  );

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
        <Space size="large" wrap>
          <Text>Status: <strong>{readiness.status.toUpperCase()}</strong></Text>
          {readiness.details.gas.required && (
            <Text type={readiness.details.gas.safe ? 'success' : 'danger'}>
              Gas: {readiness.details.gas.safe ? '✓ Safe' : '✗ Unsafe'}
            </Text>
          )}
          {readiness.details.isolation.required && (
            <Text>
              Isolation: {readiness.details.isolation.verified_required}/{readiness.details.isolation.required_points} verified
            </Text>
          )}
          {readiness.details.ppe.required_items.length > 0 && (
            <Text type={readiness.details.ppe.missing_items.length === 0 ? 'success' : 'warning'}>
              PPE: {readiness.details.ppe.required_items.length - readiness.details.ppe.missing_items.length}/{readiness.details.ppe.required_items.length}
            </Text>
          )}
          {readiness.details.checklist.required.length > 0 && (
            <Text type={readiness.details.checklist.missing.length === 0 ? 'success' : 'warning'}>
              Checklist: {readiness.details.checklist.required.length - readiness.details.checklist.missing.length}/{readiness.details.checklist.required.length}
            </Text>
          )}
          {readiness.requires.closeout && (
            <Text type={readiness.details.closeout.is_complete ? 'success' : 'warning'}>
              Closeout: {readiness.details.closeout.is_complete ? '✓ Complete' : '✗ Incomplete'}
            </Text>
          )}
          {readiness.requires.signatures && (
            <Text>
              Signatures: 
              {readiness.details.signatures.requestor.present ? ' ✓R' : ' ✗R'}
              {readiness.details.signatures.verifier.required ? (readiness.details.signatures.verifier.present ? ' ✓V' : ' ✗V') : ''}
              {readiness.details.signatures.approver.required ? (readiness.details.signatures.approver.present ? ' ✓A' : ' ✗A') : ''}
            </Text>
          )}
        </Space>
      </Card>

      <Divider orientation="left">Transition Readiness</Divider>

      {readiness.requires.signatures && (
        <Card size="small" style={{ marginBottom: 12, background: '#fff7e6' }}>
          <Text strong>Digital Signatures Required:</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" size="small">
              <Space>
                <Text>Requestor:</Text>
                {readiness.details.signatures.requestor.present ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    Signed by {readiness.details.signatures.requestor.signed_by}
                  </Tag>
                ) : (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    Required from {readiness.details.signatures.requestor.required_user}
                  </Tag>
                )}
              </Space>
              {readiness.details.signatures.verifier.required && (
                <Space>
                  <Text>Verifier:</Text>
                  {readiness.details.signatures.verifier.present ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      Signed by {readiness.details.signatures.verifier.signed_by}
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="error">
                      Required from {readiness.details.signatures.verifier.required_user}
                    </Tag>
                  )}
                </Space>
              )}
              {readiness.details.signatures.approver.required && (
                <Space>
                  <Text>Approver:</Text>
                  {readiness.details.signatures.approver.present ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      Signed by {readiness.details.signatures.approver.signed_by}
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="error">
                      Required from {readiness.details.signatures.approver.required_user}
                    </Tag>
                  )}
                </Space>
              )}
            </Space>
          </div>
        </Card>
      )}

      {renderActionBlock('Verify', readiness.readiness.can_verify, [])}
      {renderActionBlock('Approve', readiness.readiness.can_approve, readiness.missing.approve)}
      {renderActionBlock('Activate', readiness.readiness.can_activate, readiness.missing.activate)}
      {renderActionBlock('Complete', readiness.readiness.can_complete, readiness.missing.complete)}
    </div>
  );
};

export default ReadinessPanel;
