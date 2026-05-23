import { apiClient } from '../../lib/api';
import type { QRSessionResponse as QRSessionResponseType } from '@/types/training';

export type QRSessionResponse = QRSessionResponseType;
// Runtime compatibility for any stale non-type imports during Vite HMR.
export const QRSessionResponse = undefined;

export const TrainingAttendanceService = {
  async getQrSession(trainingId: number) {
    const response = await apiClient.get<QRSessionResponse>(`/api/training/trainings/${trainingId}/qr-session/`);
    return response.data;
  },

  async generateQr(trainingId: number, validHours = 24) {
    const response = await apiClient.post<QRSessionResponse>(`/api/training/${trainingId}/generate-qr/`, {
      valid_hours: validHours,
    });
    return response.data;
  },

  async validateQr(qrPayload: string) {
    const response = await apiClient.post('/api/training/validate-qr/', {
      qr_payload: qrPayload,
    });
    return response.data;
  },

  /**
   * Scoped QR verification — training_id comes from the URL, not the payload.
   * This is the correct endpoint for attendance marking after a QR scan.
   */
  async verifyQr(trainingId: number, qrPayload: string, gpsLocation: Record<string, unknown> = {}) {
    const response = await apiClient.post(`/api/training/trainings/${trainingId}/verify-qr/`, {
      qr_payload: qrPayload,
      gps_location: gpsLocation,
      device_info: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        scanned_at: new Date().toISOString(),
      },
    });
    return response.data;
  },

  /**
   * @deprecated Use verifyQr(trainingId, ...) instead.
   * Generic endpoint — requires training_id embedded in the QR payload.
   */
  async markAttendance(qrPayload: string, gpsLocation: Record<string, unknown> = {}) {
    const response = await apiClient.post('/api/training/mark-attendance/', {
      qr_payload: qrPayload,
      gps_location: gpsLocation,
      device_info: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        scanned_at: new Date().toISOString(),
      },
    });
    return response.data;
  },

  async getLiveAttendance(trainingId: number) {
    const response = await apiClient.get(`/api/training/trainings/${trainingId}/live-count/`);
    return response.data;
  },
};
