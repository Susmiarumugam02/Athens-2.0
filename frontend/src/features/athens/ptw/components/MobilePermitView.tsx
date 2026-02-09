import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Spin, Alert, Typography, Button, Space, Modal, notification } from 'antd';
import { useParams } from 'react-router-dom';
import { QrcodeOutlined, ReloadOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';

const { Title, Text } = Typography;

interface MobilePermitData {
  id: number;
  permit_number: string;
  permit_type: {
    name: string;
    category: string;
    color_code: string;
  } | string;
  status: string;
  location: string;
  description: string;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  risk_level: string;
  risk_score: number;
  created_by: {
    username: string;
    full_name: string;
  } | string;
  created_at: string;
  control_measures: string;
  ppe_requirements: string | string[];
  special_instructions?: string;
  work_nature: string;
  work_hours_display: string;
  is_expired: boolean;
  duration_hours: number;
  issuer?: {
    name: string;
    designation: string;
    contact: string;
  };
  receiver?: {
    name: string;
    designation: string;
    contact: string;
  };
  status_indicators?: {
    is_active: boolean;
    is_overdue: boolean;
    requires_attention: boolean;
    is_completed: boolean;
  };
  mobile_metadata?: {
    last_updated: string;
    version: number;
    can_update: boolean;
    offline_capable: boolean;
  };
  recent_photos?: Array<{
    id: number;
    photo_type: string;
    description: string;
    taken_at: string;
    taken_by: string;
  }>;
  recent_gas_readings?: Array<{
    gas_type: string;
    reading: number;
    unit: string;
    status: string;
    tested_at: string;
  }>;
}

const MobilePermitView: React.FC = () => {
  const { permitId } = useParams<{ permitId: string }>();
  const [permit, setPermit] = useState<MobilePermitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (permitId) {
        fetchPermit(true); // Force refresh when coming online
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [permitId]);

  useEffect(() => {
    if (permitId) {
      fetchPermit();
    }
  }, [permitId]);

  const fetchPermit = async (forceRefresh = false) => {
    if (!permitId) return;

    setLoading(true);
    setError(null);

    try {
      // Try to load from API first
      if (!isOffline || forceRefresh) {
        try {
          const response = await api.get(`/api/v1/ptw/mobile-permit/${permitId}/`);
          const data = response.data;
          setPermit(data);
          setLastUpdated(new Date().toISOString());
          
          // Cache the data for offline use
          localStorage.setItem(`permit_${permitId}`, JSON.stringify({
            data,
            cached_at: new Date().toISOString()
          }));
          
          return;
        } catch (apiError: any) {
          if (!isOffline) {
            // If we're online but API failed, show the error
            throw apiError;
          }
          // If offline, fall through to cache
        }
      }
      
      // Try to load from cache
      const cached = localStorage.getItem(`permit_${permitId}`);
      if (cached) {
        const { data, cached_at } = JSON.parse(cached);
        setPermit(data);
        setLastUpdated(cached_at);
        
        if (isOffline) {
          notification.info({
            message: 'Offline Mode',
            description: 'Showing cached permit data',
            placement: 'topRight'
          });
        }
      } else {
        throw new Error('Permit not available offline');
      }
      
    } catch (err: any) {
      console.error('Error fetching permit:', err);
      if (err?.response?.status === 401) {
        setError('Authentication expired. Please login again.');
      } else if (err?.response?.status === 403) {
        setError('You do not have permission to view this permit');
      } else if (err?.response?.status === 404) {
        setError('Permit not found');
      } else if (isOffline) {
        setError('Permit not available offline. Please connect to internet.');
      } else {
        setError('Network error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      submitted: 'processing',
      under_review: 'processing',
      pending_verification: 'processing',
      verified: 'success',
      pending_approval: 'orange',
      approved: 'green',
      rejected: 'red',
      active: 'blue',
      in_progress: 'blue',
      completed: 'cyan',
      closed: 'default',
      cancelled: 'magenta',
      expired: 'red',
      suspended: 'purple'
    };
    return colors[status] || 'default';
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      extreme: 'purple'
    };
    return colors[risk] || 'default';
  };

  const generateQRCode = () => {
    if (!permit) return;
    
    const qrData = {
      permit_id: permit.id,
      permit_number: permit.permit_number,
      mobile_url: window.location.href
    };
    
    Modal.info({
      title: 'QR Code for Sharing',
      width: 400,
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '20px 0' }}>
            <QrcodeOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </div>
          <Typography.Text type="secondary">
            Share this URL to give others access to this permit:
          </Typography.Text>
          <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <Typography.Text copyable={{ text: window.location.href }}>
              {window.location.href}
            </Typography.Text>
          </div>
        </div>
      )
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading permit details...</div>
      </div>
    );
  }

  if (error || !permit) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error"
          description={error || 'Permit not found'}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={() => fetchPermit(true)} icon={<ReloadOutlined />}>
                Retry
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  const permitType = typeof permit.permit_type === 'string' 
    ? permit.permit_type 
    : permit.permit_type?.name || 'Unknown';
    
  const createdBy = typeof permit.created_by === 'string'
    ? permit.created_by
    : permit.created_by?.full_name || permit.created_by?.username || 'Unknown';

  return (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Connection Status */}
      {isOffline && (
        <Alert
          message="Offline Mode"
          description={lastUpdated ? `Last updated: ${dayjs(lastUpdated).format('MMM DD, HH:mm')}` : 'Showing cached data'}
          type="warning"
          showIcon
          icon={<DisconnectOutlined />}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => fetchPermit(true)} icon={<ReloadOutlined />}>
              Refresh
            </Button>
          }
        />
      )}
      
      {/* Status Indicators */}
      {permit.status_indicators?.is_overdue && (
        <Alert
          message="Permit Overdue"
          description="This permit has exceeded its planned end time"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {permit.status_indicators?.requires_attention && (
        <Alert
          message="Action Required"
          description="This permit requires verification or approval"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0 }}>
            {permit.permit_number}
          </Title>
          <Text type="secondary">{permitType}</Text>
          
          <div style={{ marginTop: 8 }}>
            <Space>
              <Button 
                type="text" 
                icon={isOffline ? <DisconnectOutlined /> : <WifiOutlined />}
                size="small"
              >
                {isOffline ? 'Offline' : 'Online'}
              </Button>
              <Button 
                type="text" 
                icon={<QrcodeOutlined />}
                size="small"
                onClick={generateQRCode}
              >
                Share
              </Button>
              <Button 
                type="text" 
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => fetchPermit(true)}
                disabled={isOffline}
              >
                Refresh
              </Button>
            </Space>
          </div>
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Tag color={getStatusColor(permit.status)} style={{ fontSize: '14px', padding: '4px 12px' }}>
            {permit.status.replace('_', ' ').toUpperCase()}
          </Tag>
          {permit.status_indicators?.is_active && (
            <Tag color="blue" style={{ marginLeft: 8 }}>ACTIVE WORK</Tag>
          )}
        </div>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Location">
            {permit.location}
          </Descriptions.Item>
          
          <Descriptions.Item label="Risk Level">
            <Space>
              <Tag color={getRiskColor(permit.risk_level)}>
                {permit.risk_level.toUpperCase()}
              </Tag>
              {permit.risk_score && (
                <Text type="secondary">Score: {permit.risk_score}</Text>
              )}
            </Space>
          </Descriptions.Item>
          
          <Descriptions.Item label="Planned Start">
            {dayjs(permit.planned_start_time).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          <Descriptions.Item label="Planned End">
            {dayjs(permit.planned_end_time).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          {permit.actual_start_time && (
            <Descriptions.Item label="Actual Start">
              {dayjs(permit.actual_start_time).format('MMM DD, YYYY HH:mm')}
            </Descriptions.Item>
          )}
          
          {permit.actual_end_time && (
            <Descriptions.Item label="Actual End">
              {dayjs(permit.actual_end_time).format('MMM DD, YYYY HH:mm')}
            </Descriptions.Item>
          )}
          
          <Descriptions.Item label="Duration">
            {permit.duration_hours ? `${permit.duration_hours.toFixed(1)} hours` : 'Not calculated'}
          </Descriptions.Item>
          
          <Descriptions.Item label="Work Nature">
            {permit.work_nature} - {permit.work_hours_display}
          </Descriptions.Item>
          
          <Descriptions.Item label="Created By">
            {createdBy}
          </Descriptions.Item>
          
          <Descriptions.Item label="Created On">
            {dayjs(permit.created_at).format('MMM DD, YYYY HH:mm')}
          </Descriptions.Item>
          
          {permit.issuer && (
            <Descriptions.Item label="Issuer">
              <div>
                <div>{permit.issuer.name}</div>
                {permit.issuer.designation && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {permit.issuer.designation}
                  </Text>
                )}
                {permit.issuer.contact && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      📞 {permit.issuer.contact}
                    </Text>
                  </div>
                )}
              </div>
            </Descriptions.Item>
          )}
          
          {permit.receiver && (
            <Descriptions.Item label="Receiver">
              <div>
                <div>{permit.receiver.name}</div>
                {permit.receiver.designation && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {permit.receiver.designation}
                  </Text>
                )}
                {permit.receiver.contact && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      📞 {permit.receiver.contact}
                    </Text>
                  </div>
                )}
              </div>
            </Descriptions.Item>
          )}
          
          <Descriptions.Item label="Description">
            {permit.description}
          </Descriptions.Item>
          
          {permit.control_measures && (
            <Descriptions.Item label="Control Measures">
              {permit.control_measures}
            </Descriptions.Item>
          )}
          
          {permit.ppe_requirements && (
            <Descriptions.Item label="PPE Requirements">
              {Array.isArray(permit.ppe_requirements)
                ? permit.ppe_requirements.join(', ')
                : permit.ppe_requirements}
            </Descriptions.Item>
          )}
          
          {permit.special_instructions && (
            <Descriptions.Item label="Special Instructions">
              {permit.special_instructions}
            </Descriptions.Item>
          )}
        </Descriptions>
        
        {/* Recent Photos */}
        {permit.recent_photos && permit.recent_photos.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text strong>Recent Photos ({permit.recent_photos.length})</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {permit.recent_photos.map((photo, index) => (
                <Tag key={index} style={{ marginBottom: 4 }}>
                  {photo.photo_type} - {dayjs(photo.taken_at).format('MMM DD HH:mm')}
                </Tag>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Gas Readings */}
        {permit.recent_gas_readings && permit.recent_gas_readings.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text strong>Recent Gas Readings ({permit.recent_gas_readings.length})</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {permit.recent_gas_readings.map((reading, index) => (
                <div key={index} style={{ marginBottom: 4 }}>
                  <Tag color={reading.status === 'safe' ? 'green' : 'red'}>
                    {reading.gas_type}: {reading.reading}{reading.unit} - {reading.status.toUpperCase()}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {dayjs(reading.tested_at).format('MMM DD HH:mm')}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {isOffline ? '📱 Offline Mode' : '🌐 Online Mode'} • Mobile View
            {permit.mobile_metadata?.last_updated && (
              <> • Updated {dayjs(permit.mobile_metadata.last_updated).format('MMM DD HH:mm')}</>
            )}
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default MobilePermitView;
