import React, { useEffect, useState } from 'react';
import { Button, Tooltip, Spin } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import * as Types from '../types';
import { getPermitTbt } from '../api';

const DOCUMENT_CONFIG = {
  PTW: {
    ELECTRICAL_WORK: {
      documentName: 'Electrical Work Permit',
      documentNumber: 'PTW-ELEC',
      formatNumber: 'FRM-PTW-001',
      issueNumber: '01',
      revisionNumber: '00',
    },
    HOT_WORK: {
      documentName: 'Hot Work Permit',
      documentNumber: 'PTW-HOT',
      formatNumber: 'FRM-PTW-002',
      issueNumber: '01',
      revisionNumber: '00',
    },
  },
};

interface PTWRecordPrintPreviewProps {
  permitData: Types.Permit;
}

export default function PTWRecordPrintPreview({ permitData }: PTWRecordPrintPreviewProps) {
  const [tbtData, setTbtData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTBT = async () => {
      try {
        setLoading(true);
        const response = await getPermitTbt(permitData.id);
        setTbtData(response.data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    if (permitData.id) {
      fetchTBT();
    }
  }, [permitData.id]);

  const escapeHtml = (value: string | number | null | undefined) => (
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  );

  const formatDateTime = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const formatDateOnly = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  };

  const formatList = (value: any, emptyText: string = 'N/A') => {
    if (!value) return emptyText;
    if (Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item === 'string' || typeof item === 'number') {
            return String(item);
          }
          if (item && typeof item === 'object') {
            return item.label || item.name || item.key || item.text || '';
          }
          return '';
        })
        .filter(Boolean);
      if (items.length === 0) return emptyText;
      return items.map(item => escapeHtml(item)).join(', ');
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return emptyText;
      return keys.map(key => escapeHtml(key)).join(', ');
    }
    return escapeHtml(String(value));
  };

  const findSignatureByType = (permit: any, type: string) => {
    // Check signatures_by_type first (preferred)
    if (permit.signatures_by_type && permit.signatures_by_type[type]) {
      const candidate = permit.signatures_by_type[type];
      if (!candidate.signature_type || candidate.signature_type === type) {
        return candidate;
      }
    }
    
    // Fallback to searching signatures array
    if (permit.signatures && Array.isArray(permit.signatures)) {
      return permit.signatures.find((sig: any) => sig.signature_type === type) || null;
    }
    
    // Fallback to digital_signatures array
    if (permit.digital_signatures && Array.isArray(permit.digital_signatures)) {
      return permit.digital_signatures.find((sig: any) => sig.signature_type === type) || null;
    }
    
    return null;
  };

  const formatChecklist = (value: any) => {
    if (!value) return 'No checklist items';
    const items: string[] = [];
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (typeof item === 'string') {
          items.push(item);
        } else if (item && typeof item === 'object') {
          const label = item.label || item.key || item.text;
          if (label) items.push(label);
        }
      });
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([key, checked]) => {
        if (checked) items.push(key);
      });
    }
    if (items.length === 0) return 'No checklist items';
    return items.map(item => escapeHtml(item)).join(', ');
  };

  const renderSignature = (type: string, permit: any, label: string) => {
    // Use helper function to find signature
    const sig = findSignatureByType(permit, type);
    
    if (!sig) {
      return `
        <div class="signature-box">
          <div class="signature-label">${label}</div>
          <div class="ds-card">
            <div class="ds-content">
              <div class="ds-left-partition">
                <div class="ds-signer-name">${label}</div>
                <div class="ds-designation">Awaiting signature</div>
              </div>
              <div class="ds-divider"></div>
              <div class="ds-right-partition">
                <div class="ds-signed-by">Awaiting signature</div>
                <div class="ds-signed-at">Date: —</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Extract signature details safely
    const signerName = typeof sig.signer_name === 'string' ? sig.signer_name : 
                      (sig.signatory_details?.full_name || sig.signatory_details?.username || 'Unknown');
    const designation = typeof sig.designation === 'string' ? sig.designation : '';
    const employeeId = typeof sig.employee_id === 'string' ? sig.employee_id : '';
    const department = typeof sig.department === 'string' ? sig.department : '';
    const signedDate = formatDateOnly(sig.signed_at);
    const companyLogoUrl = sig.company_logo_url;
    
    // Render signature strokes from JSON payload
    let strokesSvg = '';
    if (sig.signature_payload && sig.signature_payload.strokes) {
      const { width = 300, height = 100, strokes } = sig.signature_payload;
      const viewBoxWidth = Math.max(width, 300);
      const viewBoxHeight = Math.max(height, 100);
      
      const pathElements = strokes.map((stroke, index) => {
        if (!stroke.points || !Array.isArray(stroke.points)) return '';
        
        const pathData = stroke.points.reduce((path, point, i) => {
          const x = point.x || 0;
          const y = point.y || 0;
          return path + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
        }, '');

        return `<path d="${pathData}" stroke="${stroke.color || '#000'}" stroke-width="${stroke.width || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
      }).join('');
      
      strokesSvg = `<svg class="signature-strokes" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="xMidYMid meet">${pathElements}</svg>`;
    }

    return `
      <div class="signature-box">
        <div class="signature-label">${label}</div>
        <div class="ds-card">
          <div class="ds-watermark-layer">
            ${companyLogoUrl ? `<img class="ds-watermark" src="${companyLogoUrl}" alt="" />` : ''}
          </div>
          <div class="ds-content">
            <div class="ds-left-partition">
              <div class="ds-signer-name">${escapeHtml(signerName)}</div>
              ${employeeId ? `<div class="ds-employee-id">ID: ${escapeHtml(employeeId)}</div>` : ''}
              ${designation ? `<div class="ds-designation">${escapeHtml(designation)}</div>` : ''}
            </div>
            <div class="ds-divider"></div>
            <div class="ds-right-partition">
              <div class="ds-signed-by">Digitally signed by ${escapeHtml(signerName)}</div>
              ${department ? `<div class="ds-department">${escapeHtml(department)}</div>` : ''}
              <div class="ds-signed-at">${signedDate}</div>
            </div>
          </div>
          ${strokesSvg ? `<div class="ds-signature-area">${strokesSvg}</div>` : ''}
        </div>
      </div>
    `;
  };

  const getPtwDocumentConfig = (permit: Types.Permit) => {
    const name = String(permit.permit_type_details?.name || '').toLowerCase();
    if (name.includes('electrical')) {
      return DOCUMENT_CONFIG.PTW.ELECTRICAL_WORK;
    }
    if (name.includes('hot')) {
      return DOCUMENT_CONFIG.PTW.HOT_WORK;
    }
    return DOCUMENT_CONFIG.PTW.HOT_WORK;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const docConfig = getPtwDocumentConfig(permitData);
    const workDescription = permitData.description || '';
    const hazards = permitData.permit_parameters?.risk_factors || permitData.hazards;
    const safetyMeasures = permitData.control_measures;
    const emergencyProcedures = permitData.permit_parameters?.emergency_procedures || permitData.emergency_procedures;
    const ppeRequirements = permitData.ppe_requirements;
    const checklist = permitData.safety_checklist;

    const permitNumber = permitData.permit_number || 'N/A';
    const permitType = permitData.permit_type_details?.name || 'N/A';
    const plannedStart = formatDateTime(permitData.planned_start_time);
    const plannedEnd = formatDateTime(permitData.planned_end_time);
    const generatedAt = formatDateTime(new Date().toISOString());

    const contentHtml = `
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
              <tr><td class="label">Permit No.</td><td>${permitNumber}</td></tr>
            </table>
          </div>
        </div>

        <div class="document-title">Permit to Work Record</div>

        <div class="section">
          <div class="section-title">Permit Details</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Permit No.</span><span class="info-value">${escapeHtml(permitNumber)}</span></div>
            <div class="info-item"><span class="info-label">Permit Type</span><span class="info-value">${escapeHtml(permitType)}</span></div>
            <div class="info-item"><span class="info-label">Location</span><span class="info-value">${escapeHtml(permitData.location || 'N/A')}</span></div>
            <div class="info-item"><span class="info-label">Status</span><span class="info-value">${escapeHtml(permitData.status || 'N/A')}</span></div>
            <div class="info-item"><span class="info-label">Planned Start</span><span class="info-value">${escapeHtml(plannedStart)}</span></div>
            <div class="info-item"><span class="info-label">Planned End</span><span class="info-value">${escapeHtml(plannedEnd)}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Work Description</div>
          <div class="text-block">${workDescription ? escapeHtml(workDescription) : 'No description provided'}</div>
        </div>

        <div class="section">
          <div class="section-title">Hazards & Precautions</div>
          <div class="text-block">${formatList(hazards, 'No hazards identified')}</div>
        </div>

        <div class="section">
          <div class="section-title">Safety Measures</div>
          <div class="text-block">${safetyMeasures ? escapeHtml(safetyMeasures) : 'No safety measures specified'}</div>
        </div>

        <div class="section">
          <div class="section-title">PPE Requirements</div>
          <div class="text-block">${formatList(ppeRequirements, 'No PPE specified')}</div>
        </div>

        <div class="section">
          <div class="section-title">Safety Checklist</div>
          <div class="text-block">${formatChecklist(checklist)}</div>
        </div>

        <div class="section">
          <div class="section-title">Emergency Procedures</div>
          <div class="text-block">${formatList(emergencyProcedures, 'No emergency procedures specified')}</div>
        </div>

        ${tbtData && tbtData.tbt ? `
          <div class="section">
            <div class="section-title">Toolbox Talk (TBT)</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Title</span><span class="info-value">${escapeHtml(tbtData.tbt.title || 'N/A')}</span></div>
              <div class="info-item"><span class="info-label">Conducted At</span><span class="info-value">${escapeHtml(formatDateTime(tbtData.tbt.conducted_at))}</span></div>
              <div class="info-item"><span class="info-label">Conducted By</span><span class="info-value">${escapeHtml(tbtData.tbt.conducted_by_name || 'N/A')}</span></div>
              <div class="info-item"><span class="info-label">Notes</span><span class="info-value">${tbtData.tbt.notes ? escapeHtml(tbtData.tbt.notes) : 'N/A'}</span></div>
            </div>
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Work Team${tbtData && tbtData.attendance ? ' & TBT Attendance' : ''}</div>
          <table class="iso-table">
            <thead>
              <tr>
                <th class="center" style="width: 32px;">S.No.</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Company</th>
                ${tbtData && tbtData.attendance ? '<th class="center" style="width: 90px;">TBT Ack</th>' : ''}
                <th style="width: 90px;">Signature</th>
              </tr>
            </thead>
            <tbody>
              ${tbtData && tbtData.workers && tbtData.workers.length > 0 ? 
                tbtData.workers.map((worker: any, i: number) => {
                  const attendance = tbtData.attendance?.find((a: any) => a.permit_worker === worker.id);
                  const ack = attendance?.acknowledged
                    ? `Yes ${attendance.acknowledged_at ? '(' + formatDateTime(attendance.acknowledged_at) + ')' : ''}`
                    : 'No';
                  return `
                    <tr>
                      <td class="center">${i + 1}</td>
                      <td>${escapeHtml(worker.worker_name || '________________')}</td>
                      <td>${escapeHtml(worker.role || '________________')}</td>
                      <td>${escapeHtml(worker.worker_company || '________________')}</td>
                      ${tbtData.attendance ? `<td class="center">${escapeHtml(ack)}</td>` : ''}
                      <td>________________</td>
                    </tr>
                  `;
                }).join('') :
                Array.from({length: 8}, (_, i) => `
                  <tr>
                    <td class="center">${i + 1}</td>
                    <td>________________</td>
                    <td>________________</td>
                    <td>________________</td>
                    ${tbtData && tbtData.attendance ? '<td class="center">________________</td>' : ''}
                    <td>________________</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">J. Digital Signatures</div>
          <div class="signature-grid">
            ${renderSignature('requestor', permitData, 'Permit Requestor')}
            ${renderSignature('verifier', permitData, 'Verifier')}
            ${renderSignature('approver', permitData, 'Approver')}
          </div>
        </div>

        <div class="iso-footer">
          <div class="controlled-document">Controlled Document</div>
          Generated at ${generatedAt}
        </div>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PTW - ${permitData.permit_number || 'Document'}</title>
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
            .text-block { border: 1px solid #111; padding: 6px; min-height: 32px; background: #fff; }
            .iso-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 8.5pt; }
            .iso-table th, .iso-table td { border: 1px solid #111; padding: 4px 3px; text-align: left; vertical-align: top; }
            .iso-table th { background: #f2f2f2; font-weight: bold; text-align: center; }
            .iso-table .center { text-align: center; }
            .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
            .signature-box { border: 1px solid #111; padding: 6px; text-align: left; min-height: 90px; }
            .signature-label { font-weight: bold; margin-bottom: 4px; font-size: 8pt; text-align: center; }
            .ds-card { display: inline-block; position: relative; overflow: hidden; border: 1px solid #ddd; background: #fff; min-width: 200px; min-height: 70px; width: 100%; }
            .ds-watermark-layer { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 0; }
            .ds-watermark { max-width: 85%; max-height: 70%; object-fit: contain; opacity: 0.3; }
            .ds-content { position: relative; z-index: 1; display: flex; align-items: stretch; min-height: 70px; padding: 6px; }
            .ds-left-partition { flex: 1; padding-right: 6px; display: flex; flex-direction: column; justify-content: center; }
            .ds-divider { width: 1px; background: #111; margin: 0 6px; }
            .ds-right-partition { flex: 1; padding-left: 6px; display: flex; flex-direction: column; justify-content: center; font-size: 0.85em; }
            .ds-signer-name { font-weight: bold; font-size: 9pt; margin-bottom: 2px; color: #333; }
            .ds-employee-id, .ds-designation { font-size: 7pt; color: #666; margin-bottom: 1px; }
            .ds-signed-by { font-weight: 500; margin-bottom: 2px; color: #333; }
            .ds-department { font-size: 6pt; color: #888; margin-bottom: 1px; }
            .ds-signed-at { font-size: 7pt; color: #555; }
            .ds-signature-area { position: absolute; bottom: 2px; left: 6px; right: 6px; height: 25px; display: flex; align-items: center; justify-content: center; z-index: 2; }
            .signature-strokes { max-width: 100%; max-height: 100%; opacity: 0.8; }
            .iso-footer { margin-top: 12px; padding-top: 6px; border-top: 1px solid #bbb; text-align: center; font-size: 7.5pt; color: #555; }
            .controlled-document { font-weight: bold; color: #111; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return <Spin size="small" />;
  }

  return (
    <Tooltip title="Print Standard PTW">
      <Button 
        icon={<PrinterOutlined />} 
        onClick={handlePrint}
        size="small"
        style={{ borderRadius: 4 }}
      >
        Print
      </Button>
    </Tooltip>
  );
}
