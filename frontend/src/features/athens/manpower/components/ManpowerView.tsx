import React from 'react';
import {
  Modal, Typography, Row, Col, Card, Tag, Divider, Space, Descriptions, Badge
} from 'antd';
import {
  CalendarOutlined, TeamOutlined, ClockCircleOutlined, UserOutlined,
  ToolOutlined, CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// Interfaces - Updated to match DailyAttendanceForm structure
interface ManpowerRecord {
  id: number;
  date: string;
  category: string;
  gender: string;
  count: number;
  work_type_details?: {
    id: number;
    name: string;
    color_code: string;
  };
  shift: string;
  hours_worked: number;
  overtime_hours: number;
  total_hours: number;
  attendance_status: string;
  notes?: string;
  created_by_name: string;
  created_at: string;
  // Additional fields that might come from DailyAttendanceForm
  categories?: Record<string, Record<string, number>>; // For grouped data
  work_description?: string;
}

interface ManpowerViewProps {
  record: ManpowerRecord | null;
  open: boolean;
  onClose: () => void;
}

const ManpowerView: React.FC<ManpowerViewProps> = ({ record, open, onClose }) => {
  if (!record) return null;

  // Helper functions
  const getStatusColor = (status: string | undefined | null) => {
    if (!status) return 'default';
    const colors = {
      present: 'green',
      absent: 'red',
      late: 'orange',
      half_day: 'yellow'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getShiftColor = (shift: string | undefined | null) => {
    if (!shift) return 'blue';
    const colors = {
      day: 'orange',
      night: 'purple',
      general: 'blue'
    };
    return colors[shift as keyof typeof colors] || 'blue';
  };

  const getGenderIcon = (gender: string | undefined | null) => {
    if (!gender) return '👤';
    return gender === 'Male' ? '👨' : gender === 'Female' ? '👩' : '👤';
  };

  const getCategoryIcon = (category: string | undefined | null) => {
    if (!category) return '👤';
    const icons = {
      'Managers': '👔',
      'Engineers': '⚙️',
      'Supervisors': '👷',
      'Technicians': '🔧',
      'Operators': '🏭',
      'Helpers': '🤝',
      'Laborers': '💪'
    };
    return icons[category as keyof typeof icons] || '👤';
  };

  const getCategoryColor = (category: string | undefined | null) => {
    if (!category) return '#1890ff';
    const colors = {
      'Managers': '#722ed1',
      'Engineers': '#1890ff',
      'Supervisors': '#52c41a',
      'Technicians': '#fa8c16',
      'Operators': '#eb2f96',
      'Helpers': '#13c2c2',
      'Laborers': '#f5222d'
    };
    return colors[category as keyof typeof colors] || '#1890ff';
  };

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>Manpower Record Details</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Header Info */}
        <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <CalendarOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Date</Text>
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                    {dayjs(record.date).format('MMM DD, YYYY')}
                  </div>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <TeamOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Workers</Text>
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                    {record.count || 0} {record.gender || 'Workers'}
                  </div>
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <div>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Total Hours</Text>
                  <div style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                    {record.total_hours || 0}h
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Main Details */}
        <Descriptions
          title="Record Information"
          bordered
          column={2}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Descriptions.Item label="Record ID" span={1}>
            <Badge count={record.id} style={{ backgroundColor: '#52c41a' }} />
          </Descriptions.Item>
          
          <Descriptions.Item label="Date" span={1}>
            <Space>
              <CalendarOutlined />
              {dayjs(record.date).format('MMMM DD, YYYY')}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Category" span={1}>
            <Space>
              <span style={{ fontSize: 16 }}>{getCategoryIcon(record.category || '')}</span>
              <Tag color={getCategoryColor(record.category)}>{record.category || 'Not specified'}</Tag>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Gender" span={1}>
            <Space>
              <span style={{ fontSize: 16 }}>{getGenderIcon(record.gender || '')}</span>
              <Tag color={record.gender === 'Male' ? 'blue' : record.gender === 'Female' ? 'pink' : 'default'}>
                {record.gender || 'Not specified'}
              </Tag>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Worker Count" span={1}>
            <Badge count={record.count} style={{ backgroundColor: '#1890ff' }} />
          </Descriptions.Item>

          <Descriptions.Item label="Work Type" span={1}>
            {record.work_type_details ? (
              <Space>
                <ToolOutlined />
                <Tag color={record.work_type_details.color_code}>
                  {record.work_type_details.name}
                </Tag>
              </Space>
            ) : (
              <Text type="secondary">Not specified</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Shift" span={1}>
            <Tag color={getShiftColor(record.shift || 'general')}>
              {record.shift ?
                (record.shift.charAt(0).toUpperCase() + record.shift.slice(1) + ' Shift') :
                'General Shift'
              }
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label="Attendance Status" span={1}>
            <Tag color={getStatusColor(record.attendance_status || 'present')} icon={<CheckCircleOutlined />}>
              {record.attendance_status ?
                record.attendance_status.replace('_', ' ').toUpperCase() :
                'PRESENT'
              }
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* Time Details */}
        <Card title={<Space><ClockCircleOutlined />Time Details</Space>} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ textAlign: 'center', padding: 16, background: '#f0f9ff', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>{record.hours_worked || 0}h</div>
                <Text type="secondary">Regular Hours</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center', padding: 16, background: '#fff7e6', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#fa8c16' }}>{record.overtime_hours || 0}h</div>
                <Text type="secondary">Overtime Hours</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center', padding: 16, background: '#f6ffed', borderRadius: 8 }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{record.total_hours || 0}h</div>
                <Text type="secondary">Total Hours</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Work Description and Notes */}
        {record.notes && (
          <Card title={<Space><InfoCircleOutlined />Work Details</Space>} style={{ marginBottom: 16 }}>
            {(() => {
              // Extract work description from notes
              const workDescMatch = record.notes.match(/Work Description: (.*?)(?:\n|$)/);
              const workDescription = record.work_description || (workDescMatch ? workDescMatch[1] : '');

              // Extract additional notes (everything except work description)
              let additionalNotes = record.notes;
              if (workDescMatch) {
                additionalNotes = record.notes.replace(/Work Description: .*?(?:\n|$)/, '').trim();
              }

              return (
                <div>
                  {workDescription && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong style={{ color: '#1890ff' }}>Work Description:</Text>
                      <Paragraph style={{ margin: '8px 0 0 0', padding: '12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #d6f7ff' }}>
                        {workDescription}
                      </Paragraph>
                    </div>
                  )}

                  {additionalNotes && additionalNotes.trim() && (
                    <div>
                      <Text strong style={{ color: '#52c41a' }}>Additional Notes:</Text>
                      <Paragraph style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', padding: '12px', background: '#f6ffed', borderRadius: 6, border: '1px solid #d9f7be' }}>
                        {additionalNotes}
                      </Paragraph>
                    </div>
                  )}
                </div>
              );
            })()}
          </Card>
        )}

        {/* Creation Info */}
        <Card title="Record Information" size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Created By">
              <Space>
                <UserOutlined />
                {record.created_by_name}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {dayjs(record.created_at).format('MMMM DD, YYYY [at] HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </div>
    </Modal>
  );
};

export default ManpowerView;
