import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Space, Badge, List, Avatar, Tag, Modal, Form,
  Input, Select, DatePicker, Upload, Alert, Spin, Result,
  FloatButton, Drawer, Steps, Progress, Typography, Divider,
  Switch, Checkbox, Rate, InputNumber, message, QRCode, notification
} from 'antd';
import {
  CameraOutlined, QrcodeOutlined, ScanOutlined, WifiOutlined,
  CloudSyncOutlined, BellOutlined, UserOutlined, SafetyOutlined,
  EnvironmentOutlined, ClockCircleOutlined, CheckCircleOutlined,
  WarningOutlined, PlusOutlined, ReloadOutlined, SendOutlined,
  FileTextOutlined, TeamOutlined, ToolOutlined, PhoneOutlined,
  SyncOutlined, DisconnectOutlined
} from '@ant-design/icons';
import { Html5QrcodeScanner } from 'html5-qrcode';
import dayjs from 'dayjs';
import api from '@common/utils/axiosetup';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface OfflinePermit {
  id: string;
  data: any;
  timestamp: string;
  synced: boolean;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const MobilePermitApp: React.FC = () => {
  // Core state
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing'>('synced');
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'permits' | 'create' | 'scan' | 'profile'>('permits');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrStartRequested, setQrStartRequested] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  
  // Data state
  const [permits, setPermits] = useState<any[]>([]);
  const [offlinePermits, setOfflinePermits] = useState<OfflinePermit[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  // Form state
  const [form] = Form.useForm();
  const [quickFormVisible, setQuickFormVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Refs
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize app
  useEffect(() => {
    initializeApp();
    checkNetworkStatus();
    getCurrentLocation();
    loadOfflineData();
    startStatusUpdates();
  }, []);

  const initializeApp = async () => {
    setLoading(true);
    try {
      // Check system status first
      await checkSystemHealth();
      // Load permits from API or offline storage
      await loadPermits();
      await loadNotifications();
    } catch (error) {
      setOfflineMode(true);
      message.warning('Working in offline mode');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const response = await api.get('/api/v1/ptw/status/system/');
      if (response.data.status === 'healthy') {
        setOfflineMode(false);
        return true;
      }
    } catch (error) {
      setOfflineMode(true);
      return false;
    }
  };

  const startStatusUpdates = () => {
    // Update online status every 30 seconds
    const interval = setInterval(async () => {
      if (!offlineMode) {
        try {
          await api.post('/api/v1/ptw/status/update/', {
            status: 'online',
            device_info: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language
            },
            location: currentLocation
          });
        } catch (error) {
          // Silently handle - user might have gone offline
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  };

  const checkNetworkStatus = () => {
    const updateOnlineStatus = async () => {
      const isOnline = navigator.onLine;
      
      if (isOnline && offlineMode) {
        // Coming back online
        const systemHealthy = await checkSystemHealth();
        if (systemHealthy) {
          setOfflineMode(false);
          notification.success({
            message: 'Back Online',
            description: 'Connection restored. Syncing data...',
            placement: 'topRight'
          });
          if (offlinePermits.length > 0) {
            syncOfflineData();
          }
        }
      } else if (!isOnline) {
        // Going offline
        setOfflineMode(true);
        notification.warning({
          message: 'Offline Mode',
          description: 'No internet connection. Working offline.',
          placement: 'topRight'
        });
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  const loadOfflineData = () => {
    const stored = localStorage.getItem('offline_permits');
    if (stored) {
      setOfflinePermits(JSON.parse(stored));
    }
  };

  const saveOfflineData = (data: OfflinePermit[]) => {
    localStorage.setItem('offline_permits', JSON.stringify(data));
    setOfflinePermits(data);
  };

  const loadPermits = async () => {
    try {
      if (!offlineMode) {
        // Load from API
        const response = await api.get('/api/v1/ptw/permits/', {
          params: {
            status: 'active,pending_approval,approved',
            limit: 20
          }
        });
        const apiPermits = response.data.results || response.data;
        setPermits(apiPermits);
        
        // Cache for offline use
        localStorage.setItem('cached_permits', JSON.stringify(apiPermits));
      } else {
        // Load from cache
        const cached = localStorage.getItem('cached_permits');
        if (cached) {
          setPermits(JSON.parse(cached));
        }
      }
    } catch (error) {
      // Fallback to cached data
      const cached = localStorage.getItem('cached_permits');
      if (cached) {
        setPermits(JSON.parse(cached));
      } else {
        // Use mock data as last resort
        const mockPermits = [
          {
            id: '1',
            number: 'PTW-2025-001',
            type: 'Hot Work',
            location: 'Unit A - Reactor Area',
            status: 'active',
            startTime: '2025-01-07 08:00',
            endTime: '2025-01-07 17:00',
            issuer: 'John Doe',
            receiver: 'Mike Johnson',
            riskLevel: 'Medium'
          }
        ];
        setPermits(mockPermits);
      }
    }
  };

  const loadNotifications = async () => {
    const mockNotifications = [
      {
        id: '1',
        title: 'Permit Approval Required',
        message: 'PTW-2025-003 requires your approval',
        type: 'approval',
        timestamp: '2025-01-07 10:30',
        read: false
      },
      {
        id: '2',
        title: 'Permit Expiring Soon',
        message: 'PTW-2025-001 expires in 2 hours',
        type: 'warning',
        timestamp: '2025-01-07 15:00',
        read: false
      }
    ];
    setNotifications(mockNotifications);
  };

  const syncOfflineData = async () => {
    if (offlinePermits.length === 0) return;

    setSyncStatus('syncing');
    try {
      // Prepare sync data
      const changes = offlinePermits.map(offlinePermit => ({
        entity: 'permit',
        op: 'create',
        offline_id: offlinePermit.id,
        data: offlinePermit.data
      }));

      const response = await api.post('/api/v1/ptw/sync-offline-data/', {
        device_id: getDeviceId(),
        changes
      });

      const { applied, conflicts, rejected } = response.data;
      
      // Update local storage - mark synced items
      const updatedOfflinePermits = offlinePermits.map(permit => {
        const appliedItem = applied.find((item: any) => item.offline_id === permit.id);
        if (appliedItem) {
          return { ...permit, synced: true, server_id: appliedItem.server_id };
        }
        return permit;
      });
      
      saveOfflineData(updatedOfflinePermits);
      setSyncStatus('synced');
      
      // Show sync results
      if (applied.length > 0) {
        notification.success({
          message: 'Sync Complete',
          description: `${applied.length} permits synced successfully`,
          placement: 'topRight'
        });
      }
      
      if (conflicts.length > 0 || rejected.length > 0) {
        notification.warning({
          message: 'Sync Issues',
          description: `${conflicts.length} conflicts, ${rejected.length} rejected`,
          placement: 'topRight'
        });
      }
      
      // Reload permits from server
      await loadPermits();
      
    } catch (error) {
      setSyncStatus('pending');
      notification.error({
        message: 'Sync Failed',
        description: 'Failed to sync offline data. Will retry when connection improves.',
        placement: 'topRight'
      });
    }
  };

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const createOfflinePermit = (data: any) => {
    const offlinePermit: OfflinePermit = {
      id: `offline_${Date.now()}`,
      data: {
        ...data,
        location: currentLocation,
        photos: capturedPhotos,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      synced: false
    };

    const updated = [...offlinePermits, offlinePermit];
    saveOfflineData(updated);
    setSyncStatus('pending');
    message.success('Permit saved offline');
  };

  const startQRScanner = () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      message.error('Camera access requires HTTPS.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      message.error('Camera access is not available on this device.');
      return;
    }
    setActiveTab('scan');
    setQrStartRequested(true);
  };

  const stopQRScanner = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(() => {});
      qrScannerRef.current = null;
    }
    setQrScannerVisible(false);
    setQrStartRequested(false);
  };

  const handleQRScan = async (data: string) => {
    try {
      // Enhanced QR code handling
      let permitData;
      
      if (data.startsWith('http')) {
        // Direct URL - extract permit ID
        const urlParts = data.split('/');
        const permitId = urlParts[urlParts.length - 1];
        
        // Try to load permit details
        if (!offlineMode) {
          const response = await api.get(`/api/v1/ptw/mobile-permit/${permitId}/`);
          permitData = response.data;
        } else {
          // Check cached permits
          const cachedPermit = permits.find(p => p.id === permitId);
          if (cachedPermit) {
            permitData = cachedPermit;
          } else {
            throw new Error('Permit not available offline');
          }
        }
      } else {
        // Base64 encoded QR data
        const response = await api.get(`/api/v1/ptw/qr-scan/${data}/`);
        permitData = response.data;
      }
      
      notification.success({
        message: 'Permit Scanned',
        description: `Permit ${permitData.permit_number} loaded successfully`,
        placement: 'topRight'
      });
      
      // Show permit details in modal or navigate
      Modal.info({
        title: `Permit: ${permitData.permit_number}`,
        width: '90%',
        content: (
          <div>
            <p><strong>Type:</strong> {permitData.permit_type?.name || permitData.type}</p>
            <p><strong>Location:</strong> {permitData.location}</p>
            <p><strong>Status:</strong> <Tag color={getStatusColor(permitData.status)}>{permitData.status.toUpperCase()}</Tag></p>
            <p><strong>Risk Level:</strong> <Tag color={getRiskColor(permitData.risk_level)}>{permitData.risk_level?.toUpperCase()}</Tag></p>
            {permitData.description && <p><strong>Description:</strong> {permitData.description}</p>}
            {permitData.control_measures && <p><strong>Control Measures:</strong> {permitData.control_measures}</p>}
          </div>
        )
      });
      
    } catch (error: any) {
      notification.error({
        message: 'QR Scan Failed',
        description: error?.response?.data?.error || 'Invalid QR code or network error',
        placement: 'topRight'
      });
    }
  };

  useEffect(() => {
    if (activeTab !== 'scan' || !qrStartRequested) {
      return;
    }

    const startScanner = async () => {
      const container = document.getElementById('qr-reader');
      if (!container) {
        message.error('QR scanner is not ready yet. Please try again.');
        setQrStartRequested(false);
        return;
      }

      if (qrScannerRef.current) {
        await qrScannerRef.current.clear().catch(() => {});
        qrScannerRef.current = null;
      }

      setQrScannerVisible(true);
      qrScannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      qrScannerRef.current.render(
        (decodedText) => {
          handleQRScan(decodedText);
          stopQRScanner();
        },
        () => {}
      );
      setQrStartRequested(false);
    };

    startScanner();
  }, [activeTab, qrStartRequested]);

  useEffect(() => {
    if (activeTab !== 'scan' && qrScannerVisible) {
      stopQRScanner();
    }
  }, [activeTab, qrScannerVisible]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default',
      submitted: 'processing',
      pending_verification: 'processing', 
      pending_approval: 'orange',
      approved: 'green',
      active: 'blue',
      completed: 'cyan',
      rejected: 'red',
      cancelled: 'magenta',
      expired: 'red'
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

  const startCamera = async () => {
    setCameraModalVisible(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      message.error('Failed to access camera');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      if (context) {
        context.drawImage(videoRef.current, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg');
        setCapturedPhotos([...capturedPhotos, photoData]);
        message.success('Photo captured');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraModalVisible(false);
  };

  const submitQuickForm = async (values: any) => {
    try {
      const formData = {
        ...values,
        location: currentLocation,
        photos: capturedPhotos,
        timestamp: new Date().toISOString()
      };

      if (offlineMode) {
        createOfflinePermit(formData);
      } else {
        // Submit to API
        message.success('Permit submitted successfully');
      }

      setQuickFormVisible(false);
      form.resetFields();
      setCapturedPhotos([]);
    } catch (error) {
      message.error('Failed to submit permit');
    }
  };

  const renderPermitCard = (permit: any) => (
    <Card
      key={permit.id}
      size="small"
      style={{ marginBottom: 8 }}
      actions={[
        <Button type="text" icon={<FileTextOutlined />} size="small">View</Button>,
        <Button type="text" icon={<QrcodeOutlined />} size="small">QR</Button>,
        <Button type="text" icon={<SendOutlined />} size="small">Update</Button>
      ]}
    >
      <Card.Meta
        avatar={
          <Avatar 
            icon={<SafetyOutlined />} 
            style={{ 
              backgroundColor: permit.riskLevel === 'High' ? '#ff4d4f' : 
                              permit.riskLevel === 'Medium' ? '#faad14' : '#52c41a' 
            }} 
          />
        }
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>{permit.number}</Text>
            <Tag color={
              permit.status === 'active' ? 'green' : 
              permit.status === 'pending' ? 'orange' : 'blue'
            }>
              {permit.status.toUpperCase()}
            </Tag>
          </div>
        }
        description={
          <div>
            <div><Text type="secondary">{permit.type} - {permit.location}</Text></div>
            <div style={{ marginTop: 4 }}>
              <Space size="small">
                <ClockCircleOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {permit.startTime} - {permit.endTime}
                </Text>
              </Space>
            </div>
            <div style={{ marginTop: 4 }}>
              <Space size="small">
                <UserOutlined />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {permit.issuer} → {permit.receiver}
                </Text>
              </Space>
            </div>
          </div>
        }
      />
    </Card>
  );

  const renderQuickForm = () => (
    <Form form={form} layout="vertical" onFinish={submitQuickForm}>
      <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}>
        <Steps.Step title="Basic" />
        <Steps.Step title="Safety" />
        <Steps.Step title="Submit" />
      </Steps>

      {currentStep === 0 && (
        <>
          <Form.Item name="type" label="Permit Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="hot_work">Hot Work</Select.Option>
              <Select.Option value="electrical">Electrical</Select.Option>
              <Select.Option value="confined_space">Confined Space</Select.Option>
              <Select.Option value="height">Work at Height</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="description" label="Work Description" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="Brief description" />
          </Form.Item>
          
          <Form.Item name="location" label="Location" rules={[{ required: true }]}>
            <Input placeholder="Work location" />
          </Form.Item>
          
          {currentLocation && (
            <Alert
              message="Location Detected"
              description={`Lat: ${currentLocation.latitude.toFixed(6)}, Lng: ${currentLocation.longitude.toFixed(6)}`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
        </>
      )}

      {currentStep === 1 && (
        <>
          <Form.Item name="risk_level" label="Risk Level" rules={[{ required: true }]}>
            <Rate count={5} />
          </Form.Item>
          
          <Form.Item name="ppe" label="PPE Required" rules={[{ required: true }]}>
            <Checkbox.Group>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Checkbox value="helmet">Safety Helmet</Checkbox>
                <Checkbox value="gloves">Safety Gloves</Checkbox>
                <Checkbox value="shoes">Safety Shoes</Checkbox>
                <Checkbox value="goggles">Safety Goggles</Checkbox>
                <Checkbox value="harness">Fall Protection</Checkbox>
              </div>
            </Checkbox.Group>
          </Form.Item>
          
          <Form.Item name="duration" label="Duration (hours)" rules={[{ required: true }]}>
            <InputNumber min={1} max={24} style={{ width: '100%' }} />
          </Form.Item>
        </>
      )}

      {currentStep === 2 && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4}>Review & Submit</Title>
            <Text type="secondary">Please review your permit details</Text>
          </div>
          
          {capturedPhotos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Captured Photos: {capturedPhotos.length}</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                {capturedPhotos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Captured ${index + 1}`}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </div>
            </div>
          )}
          
          <Alert
            message={offlineMode ? "Offline Mode" : "Online Mode"}
            description={
              offlineMode 
                ? "Permit will be saved locally and synced when online"
                : "Permit will be submitted immediately"
            }
            type={offlineMode ? "warning" : "success"}
            showIcon
          />
        </>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            Previous
          </Button>
        )}
        
        {currentStep < 2 ? (
          <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
            Next
          </Button>
        ) : (
          <Button type="primary" htmlType="submit">
            Submit Permit
          </Button>
        )}
      </div>
    </Form>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', backgroundColor: '#f0f2f5' }}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Title level={4} style={{ margin: 0 }}>PTW Mobile</Title>
        <Space>
          <Badge count={notifications.filter(n => !n.read).length}>
            <Button 
              type="text" 
              icon={<BellOutlined />} 
              onClick={() => setDrawerVisible(true)}
            />
          </Badge>
          <Badge 
            status={offlineMode ? 'error' : syncStatus === 'syncing' ? 'processing' : 'success'} 
            text={
              <Space size={4}>
                {offlineMode ? (
                  <><DisconnectOutlined /> Offline</>
                ) : syncStatus === 'syncing' ? (
                  <><SyncOutlined spin /> Syncing</>
                ) : (
                  <><WifiOutlined /> Online</>
                )}
              </Space>
            }
          />
          {syncStatus === 'pending' && (
            <Button 
              type="text" 
              icon={<CloudSyncOutlined />} 
              onClick={syncOfflineData}
              disabled={offlineMode}
              title="Sync pending changes"
            />
          )}
        </Space>
      </div>

      {/* Main Content */}
      <div style={{ padding: 16, paddingBottom: 80, height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        {activeTab === 'permits' && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Title level={5}>My Permits</Title>
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={() => setQuickFormVisible(true)}
              >
                Quick Create
              </Button>
            </div>
            
            {offlinePermits.length > 0 && (
              <Alert
                message={`${offlinePermits.filter(p => !p.synced).length} permits pending sync`}
                type="warning"
                showIcon
                action={
                  <Button size="small" onClick={syncOfflineData} disabled={offlineMode}>
                    Sync Now
                  </Button>
                }
                style={{ marginBottom: 16 }}
              />
            )}
            
            <div>
              {permits.map(renderPermitCard)}
              {permits.length === 0 && (
                <Result
                  icon={<FileTextOutlined />}
                  title="No Permits Found"
                  subTitle="Create your first permit to get started"
                  extra={
                    <Button type="primary" onClick={() => setQuickFormVisible(true)}>
                      Create Permit
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'scan' && (
          <div style={{ textAlign: 'center' }}>
            <Title level={5}>QR Code Scanner</Title>
            <div id="qr-reader" style={{ width: '100%', minHeight: 280 }}></div>
            {!qrScannerVisible && (
              <Button 
                type="primary" 
                size="large" 
                icon={<ScanOutlined />}
                onClick={startQRScanner}
                style={{ marginTop: 20 }}
              >
                Start Scanning
              </Button>
            )}
            {qrScannerVisible && (
              <Button 
                type="default" 
                onClick={stopQRScanner}
                style={{ marginTop: 20 }}
              >
                Stop Scanner
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        padding: '8px 0',
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <Button 
          type={activeTab === 'permits' ? 'primary' : 'text'}
          icon={<FileTextOutlined />}
          onClick={() => setActiveTab('permits')}
        >
          Permits
        </Button>
        <Button 
          type={activeTab === 'scan' ? 'primary' : 'text'}
          icon={<QrcodeOutlined />}
          onClick={() => setActiveTab('scan')}
        >
          Scan
        </Button>
        <Button 
          type="text"
          icon={<CameraOutlined />}
          onClick={startCamera}
        >
          Camera
        </Button>
        <Button 
          type={activeTab === 'profile' ? 'primary' : 'text'}
          icon={<UserOutlined />}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </Button>
      </div>

      {/* Floating Action Buttons */}
      <FloatButton.Group
        trigger="click"
        type="primary"
        style={{ right: 24 }}
        icon={<PlusOutlined />}
      >
        <FloatButton 
          icon={<FileTextOutlined />} 
          tooltip="Quick Permit"
          onClick={() => setQuickFormVisible(true)}
        />
        <FloatButton 
          icon={<CameraOutlined />} 
          tooltip="Take Photo"
          onClick={startCamera}
        />
        <FloatButton 
          icon={<QrcodeOutlined />} 
          tooltip="Scan QR"
          onClick={startQRScanner}
        />
        <FloatButton 
          icon={<CloudSyncOutlined />} 
          tooltip="Sync Data"
          onClick={syncOfflineData}
          disabled={offlineMode}
        />
      </FloatButton.Group>

      {/* Quick Form Modal */}
      <Modal
        title="Quick Permit Creation"
        open={quickFormVisible}
        onCancel={() => setQuickFormVisible(false)}
        footer={null}
        width="90%"
        style={{ top: 20 }}
      >
        {renderQuickForm()}
      </Modal>

      {/* Camera Modal */}
      <Modal
        title="Capture Photo"
        open={cameraModalVisible}
        onCancel={stopCamera}
        footer={[
          <Button key="capture" type="primary" onClick={capturePhoto}>
            Capture
          </Button>,
          <Button key="close" onClick={stopCamera}>
            Close
          </Button>
        ]}
        width="90%"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: 'auto' }}
        />
      </Modal>

      {/* Notifications Drawer */}
      <Drawer
        title="Notifications"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width="90%"
      >
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    icon={item.type === 'approval' ? <CheckCircleOutlined /> : <WarningOutlined />}
                    style={{ 
                      backgroundColor: item.type === 'approval' ? '#52c41a' : '#faad14' 
                    }}
                  />
                }
                title={item.title}
                description={
                  <div>
                    <div>{item.message}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.timestamp}
                    </Text>
                  </div>
                }
              />
              {!item.read && <Badge status="processing" />}
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
};

export default MobilePermitApp;
