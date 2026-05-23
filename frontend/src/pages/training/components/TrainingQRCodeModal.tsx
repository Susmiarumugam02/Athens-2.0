import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, InputNumber, Modal, Space, Statistic, Typography, message } from 'antd';
import { DownloadOutlined, ExpandOutlined, PrinterOutlined, QrcodeOutlined, RedoOutlined, ShareAltOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
import { TrainingAttendanceService } from '../TrainingAttendanceService';
import type { QRSessionResponse } from '@/types/training';

const { Text, Title } = Typography;

interface TrainingQRCodeModalProps {
  training: any;
  open: boolean;
  onClose: () => void;
  onUpdated?: (session: QRSessionResponse | null) => void;
}

const getExpiresMs = (expiresAt?: string) => {
  if (!expiresAt) return 0;
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const TrainingQRCodeModal: React.FC<TrainingQRCodeModalProps> = ({ training, open, onClose, onUpdated }) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<QRSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validHours, setValidHours] = useState(24);
  const [fullscreen, setFullscreen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  const participantCount = useMemo(
    () => training?.attendance_count?.total || training?.participants?.length || training?.attendees || 0,
    [training],
  );
  const attendanceCount = useMemo(
    () => (training?.attendance_count?.completed || 0) + (training?.attendance_count?.present || 0),
    [training],
  );

  const refreshSession = useCallback(async () => {
    if (!training?.id || !open) return;
    setLoading(true);
    try {
      const data = await TrainingAttendanceService.getQrSession(training.id);
      const activeSession = data.active === false ? null : data;
      setSession(activeSession);
      onUpdated?.(activeSession);
    } catch {
      setSession(null);
      onUpdated?.(null);
    } finally {
      setLoading(false);
    }
  }, [onUpdated, open, training?.id]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setRemainingMs(getExpiresMs(session?.expires_at));
    const interval = window.setInterval(() => {
      setRemainingMs(getExpiresMs(session?.expires_at));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session?.expires_at]);

  const generate = async () => {
    if (!training?.id) return;
    setGenerating(true);
    try {
      const data = await TrainingAttendanceService.generateQr(training.id, validHours);
      setSession(data);
      onUpdated?.(data);
      message.success('QR generated successfully');
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to generate QR');
    } finally {
      setGenerating(false);
    }
  };

  const getCanvas = () => qrRef.current?.querySelector('canvas') || null;

  const downloadQR = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `induction-qr-${training?.id || 'training'}.png`;
    link.click();
  };

  const printQR = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const dataUrl = canvas.toDataURL('image/png');
    win.document.write(`
      <html><head><title>Induction QR - ${training.title}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        img { width: 360px; height: 360px; }
        h1 { margin: 18px 0 6px; }
        p { margin: 4px 0; color: #555; }
      </style></head><body>
        <img src="${dataUrl}" alt="Training QR" />
        <h1>${training.title}</h1>
        <p>Session: ${session?.qr_token || ''}</p>
        <p>Expires: ${session?.expires_at ? new Date(session.expires_at).toLocaleString() : ''}</p>
        <p>Participants: ${participantCount}</p>
        <script>window.onload=()=>{window.print();window.close();}</script>
      </body></html>
    `);
    win.document.close();
  };

  const shareQR = async () => {
    if (!session?.qr_payload) return;
    const text = `Induction Training QR\n${training.title}\nSession: ${session.session_token || session.qr_token}\nExpires: ${session.expires_at}`;
    if (navigator.share) {
      await navigator.share({ title: `Induction QR - ${training.title}`, text });
      return;
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(`Induction QR - ${training.title}`)}&body=${encodeURIComponent(text)}`;
  };

  const hasActiveQr = !!session?.qr_payload && remainingMs > 0;

  const renderQrContent = (large = false) => (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'center' }}>
      <div ref={large ? undefined : qrRef} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}>
        {hasActiveQr ? (
          <QRCodeCanvas value={session.qr_payload || ''} size={large ? 420 : 260} level="H" includeMargin />
        ) : (
          <div style={{ width: 260, height: 260, display: 'grid', placeItems: 'center', color: '#64748b' }}>
            No active QR
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <Title level={fullscreen ? 2 : 4} style={{ marginBottom: 4 }}>{training?.title}</Title>
        <Text type="secondary">Session token: {session?.session_token || session?.qr_token || 'Not generated'}</Text>
        <div style={{ marginTop: 8 }}>
          <Space wrap size="large">
            <Statistic title="Expires In" value={hasActiveQr ? formatCountdown(remainingMs) : 'Expired'} />
            <Statistic title="Assigned Users" value={participantCount} />
            <Statistic title="Attendance" value={attendanceCount} suffix={`/ ${participantCount}`} />
          </Space>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        title="Training QR Attendance"
        open={open}
        onCancel={onClose}
        footer={null}
        width={620}
        confirmLoading={loading}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {renderQrContent()}
          <Space wrap>
            <InputNumber min={1} max={168} value={validHours} onChange={(value) => setValidHours(Number(value || 24))} addonAfter="hours" />
            <Button icon={<QrcodeOutlined />} type="primary" onClick={generate} loading={generating}>
              {hasActiveQr ? 'Regenerate QR' : 'Generate QR'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadQR} disabled={!hasActiveQr}>Download QR</Button>
            <Button icon={<ShareAltOutlined />} onClick={shareQR} disabled={!hasActiveQr}>Share QR</Button>
            <Button icon={<PrinterOutlined />} onClick={printQR} disabled={!hasActiveQr}>Print</Button>
            <Button icon={<ExpandOutlined />} onClick={() => setFullscreen(true)} disabled={!hasActiveQr}>Fullscreen</Button>
            <Button icon={<RedoOutlined />} onClick={refreshSession}>Refresh</Button>
          </Space>
        </Space>
      </Modal>

      <Modal
        open={fullscreen}
        onCancel={() => setFullscreen(false)}
        footer={null}
        width="96vw"
        centered
        styles={{ body: { minHeight: '82vh', display: 'grid', placeItems: 'center' } }}
      >
        {renderQrContent(true)}
      </Modal>
    </>
  );
};

export default TrainingQRCodeModal;
