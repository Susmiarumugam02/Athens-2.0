import React, { useState } from 'react';
import { Button, message } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import { TrainingAttendanceService } from '../TrainingAttendanceService';
import type { QRSessionResponse } from '@/types/training';

interface TrainingQRButtonProps {
  training: any;
  onGenerated: (session: QRSessionResponse) => void;
}

const TrainingQRButton: React.FC<TrainingQRButtonProps> = ({ training, onGenerated }) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const session = await TrainingAttendanceService.generateQr(training.id, 24);
      message.success('QR generated successfully');
      onGenerated(session);
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to generate QR');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="link"
      size="small"
      icon={<QrcodeOutlined />}
      loading={loading}
      onClick={handleGenerate}
    >
      Generate QR
    </Button>
  );
};

export default TrainingQRButton;
