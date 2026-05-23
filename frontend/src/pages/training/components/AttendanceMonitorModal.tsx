import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal, Progress, Space, Statistic, Table, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { TrainingAttendanceService } from '../TrainingAttendanceService';

interface AttendanceMonitorModalProps {
  training: any;
  open: boolean;
  onClose: () => void;
}

const AttendanceMonitorModal: React.FC<AttendanceMonitorModalProps> = ({ training, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const fetchSummary = useCallback(async () => {
    if (!training?.id || !open) return;
    setLoading(true);
    try {
      const data = await TrainingAttendanceService.getLiveAttendance(training.id);
      setSummary(data);
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [open, training?.id]);

  useEffect(() => {
    fetchSummary();
    if (!open) return undefined;
    const interval = window.setInterval(fetchSummary, 15000);
    return () => window.clearInterval(interval);
  }, [fetchSummary, open]);

  const methodRows = Object.entries(summary?.by_method || {}).map(([method, count]) => ({
    key: method,
    method,
    count,
  }));

  return (
    <Modal
      title={`Attendance - ${training?.title || ''}`}
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width={720}
    >
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <Space wrap size="large">
          <Statistic title="Assigned Users" value={summary?.total || 0} />
          <Statistic title="Verified" value={summary?.verified || 0} />
          <Statistic title="Pending" value={summary?.pending || 0} />
          <Statistic title="Absent" value={summary?.absent || 0} />
        </Space>

        <div>
          <Progress percent={summary?.completion_percentage || 0} status="active" />
          <Tag color={summary?.otp_active ? 'green' : 'default'}>
            OTP {summary?.otp_active ? 'Active' : 'Inactive'}
          </Tag>
        </div>

        <Button icon={<ReloadOutlined />} onClick={fetchSummary} loading={loading}>
          Refresh Attendance
        </Button>

        <Table
          size="small"
          pagination={false}
          dataSource={methodRows}
          columns={[
            { title: 'Verification Method', dataIndex: 'method', render: (value) => String(value).toUpperCase() },
            { title: 'Count', dataIndex: 'count' },
          ]}
        />
      </Space>
    </Modal>
  );
};

export default AttendanceMonitorModal;
