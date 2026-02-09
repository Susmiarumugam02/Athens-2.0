import React from 'react';
import { Button, Tooltip } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import api from '@common/utils/axiosetup';
import { DOCUMENT_CONFIG } from '../../../constants/documentConfig';
import type { JobTrainingData } from '../types';

interface JobTrainingRecordPrintPreviewProps {
  trainingData: JobTrainingData;
}

const escapeHtml = (value: string) => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getParticipantName = (record: any) => (
  record.participant_name || record.worker_name || record.user_name || 'N/A'
);

const getParticipantId = (record: any) => (
  record.worker || record.user_id || record.participant_id || 'N/A'
);

const getParticipantType = (record: any) => (
  record.participant_type ? String(record.participant_type).toUpperCase() : 'UNKNOWN'
);

const buildAttendanceRows = (attendanceData: any[]) => {
  if (!attendanceData.length) {
    return Array.from({ length: 10 }, (_, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>________________</td>
        <td class="center">_____</td>
        <td class="center">_____</td>
        <td class="center">_____</td>
        <td>________________</td>
      </tr>
    `).join('');
  }

  return attendanceData.map((record, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td>${escapeHtml(String(getParticipantName(record)))}</td>
      <td class="center">${escapeHtml(String(getParticipantType(record)))}</td>
      <td class="center">${escapeHtml(String(getParticipantId(record)))}</td>
      <td class="center">${escapeHtml(String(record.status || 'N/A'))}</td>
      <td>${escapeHtml(String(formatDateTime(record.timestamp)))}</td>
    </tr>
  `).join('');
};

const generateJobTrainingDocument = (data: {
  trainingData: JobTrainingData;
  attendanceData: any[];
}) => {
  const { trainingData, attendanceData } = data;
  const docConfig = DOCUMENT_CONFIG.TRAINING.JOB_SPECIFIC_TRAINING;
  const generatedAt = formatDateTime(new Date().toISOString());

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docConfig.documentName}</title>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.25; color: #111; }
          .document-container { max-width: 210mm; margin: 0 auto; background: #fff; }
          .iso-header { display: grid; grid-template-columns: 70px 1fr 180px; gap: 8px; align-items: center; padding: 6px 0; border-bottom: 1px solid #111; margin-bottom: 8px; }
          .company-logo { width: 60px; height: 60px; object-fit: contain; }
          .company-info { text-align: center; }
          .company-name { font-size: 12pt; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
          .company-tagline { font-size: 8pt; font-style: italic; color: #555; }
          .document-meta { font-size: 7.5pt; }
          .document-meta table { width: 100%; border-collapse: collapse; }
          .document-meta td { border: 1px solid #111; padding: 2px 4px; }
          .document-meta .label { font-weight: bold; background: #f5f5f5; width: 45%; }
          .document-title { text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 8px 0 6px; padding: 4px 6px; border: 1px solid #111; background: #f7f7f7; }
          .section { margin: 6px 0; page-break-inside: avoid; }
          .section-title { font-size: 9pt; font-weight: bold; margin-bottom: 4px; padding: 3px 6px; background: #f2f2f2; border-left: 3px solid #111; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0; }
          .info-item { display: flex; align-items: baseline; margin-bottom: 3px; }
          .info-label { font-weight: bold; min-width: 90px; margin-right: 6px; }
          .info-value { border-bottom: 1px solid #111; flex: 1; padding: 1px 4px; min-height: 14px; }
          .iso-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
          .iso-table th, .iso-table td { border: 1px solid #111; padding: 4px 3px; text-align: left; vertical-align: top; }
          .iso-table th { background: #f2f2f2; font-weight: bold; text-align: center; }
          .iso-table .center { text-align: center; }
          .signature-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          .signature-table th, .signature-table td { border: 1px solid #111; padding: 6px; text-align: center; vertical-align: middle; }
          .signature-table th { background: #f2f2f2; font-weight: bold; font-size: 8.5pt; }
          .iso-footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #bbb; text-align: center; font-size: 7.5pt; color: #555; }
          .controlled-document { font-weight: bold; color: #111; margin-bottom: 2px; }
        </style>
      </head>
      <body>
        <div class="document-container">
          <div class="iso-header">
            <div>
              <img src="${window.location.origin}/logo.png" alt="Company Logo" class="company-logo" onerror="this.style.display='none'" />
            </div>
            <div class="company-info">
              <div class="company-name">PROZEAL GREEN ENERGY PVT LTD</div>
              <div class="company-tagline">An initiative towards a cleaner tomorrow</div>
            </div>
            <div class="document-meta">
              <table>
                <tr><td class="label">Document Name</td><td>${docConfig.documentName}</td></tr>
                <tr><td class="label">Document No.</td><td>${docConfig.documentNumber}</td></tr>
                <tr><td class="label">Format No.</td><td>${docConfig.formatNumber}</td></tr>
                <tr><td class="label">Issue No.</td><td>${docConfig.issueNumber}</td></tr>
                <tr><td class="label">Revision No.</td><td>${docConfig.revisionNumber}</td></tr>
                <tr><td class="label">Issue Date</td><td>${docConfig.issueDate}</td></tr>
                <tr><td class="label">Revision Date</td><td>${docConfig.revisionDate}</td></tr>
              </table>
            </div>
          </div>

          <div class="document-title">Job Specific Training Record</div>

          <div class="section">
            <div class="section-title">Training Details</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Training ID</span><span class="info-value">${trainingData.id}</span></div>
              <div class="info-item"><span class="info-label">Title</span><span class="info-value">${escapeHtml(trainingData.title || 'N/A')}</span></div>
              <div class="info-item"><span class="info-label">Date</span><span class="info-value">${formatDate(trainingData.date)}</span></div>
              <div class="info-item"><span class="info-label">Location</span><span class="info-value">${escapeHtml(trainingData.location || 'N/A')}</span></div>
              <div class="info-item"><span class="info-label">Conducted By</span><span class="info-value">${escapeHtml(trainingData.conducted_by || 'N/A')}</span></div>
              <div class="info-item"><span class="info-label">Status</span><span class="info-value">${escapeHtml(trainingData.status || 'N/A')}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Attendance Register</div>
            <table class="iso-table">
              <thead>
                <tr>
                  <th class="center" style="width: 32px;">S.No</th>
                  <th>Name</th>
                  <th class="center" style="width: 70px;">Type</th>
                  <th class="center" style="width: 70px;">ID</th>
                  <th class="center" style="width: 70px;">Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${buildAttendanceRows(attendanceData)}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Trainer Confirmation</div>
            <table class="signature-table">
              <thead>
                <tr>
                  <th>Trainer Name</th>
                  <th>Signature</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${escapeHtml(trainingData.conducted_by || '________________')}</td>
                  <td>________________</td>
                  <td>${formatDate(trainingData.date)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="iso-footer">
            <div>
              <div class="controlled-document">Controlled Document</div>
              Generated at ${generatedAt}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export default function JobTrainingRecordPrintPreview({ trainingData }: JobTrainingRecordPrintPreviewProps) {
  const handlePrint = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let attendanceData: any[] = [];
    let freshTrainingData = { ...trainingData };

    try {
      const [attendanceResponse, trainingResponse] = await Promise.all([
        api.get(`/jobtraining/${trainingData.id}/attendance/`),
        api.get(`/jobtraining/${trainingData.id}/`),
      ]);
      attendanceData = attendanceResponse.data || [];
      if (trainingResponse.data) {
        freshTrainingData = { ...trainingData, ...trainingResponse.data };
      }
    } catch (error) {
      console.error('Failed to fetch training attendance for print:', error);
    }

    const htmlContent = generateJobTrainingDocument({
      trainingData: freshTrainingData,
      attendanceData,
    });

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Tooltip title="Print Training Record">
      <Button
        icon={<PrinterOutlined />}
        onClick={handlePrint}
        size="small"
        type="text"
      />
    </Tooltip>
  );
}
