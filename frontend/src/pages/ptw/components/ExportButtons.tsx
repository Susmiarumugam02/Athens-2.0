import React, { useState } from 'react';
import { Button, Dropdown, message, Space } from 'antd';
import { DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { exportPermitPDF, exportPermitsExcel, bulkExportPDF, bulkExportExcel } from '../api';
import { downloadFile, getFilenameFromResponse } from '../utils/downloadHelper';

interface ExportButtonsProps {
  permitId?: number;
  permitIds?: number[];
  mode: 'single' | 'bulk';
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ permitId, permitIds, mode }) => {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      if (mode === 'single' && permitId) {
        const response = await exportPermitPDF(permitId);
        const filename = getFilenameFromResponse(response, `permit_${permitId}.pdf`);
        downloadFile(response.data, filename);
        message.success('PDF exported successfully');
      } else if (mode === 'bulk' && permitIds && permitIds.length > 0) {
        const response = await bulkExportPDF(permitIds);
        const filename = getFilenameFromResponse(response, 'permits_bulk.zip');
        downloadFile(response.data, filename);
        message.success(`${permitIds.length} permits exported as PDF ZIP`);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async (detailed: boolean = false) => {
    setLoading(true);
    try {
      if (mode === 'single') {
        const response = await exportPermitsExcel({ detailed });
        const filename = getFilenameFromResponse(response, 'permits.xlsx');
        downloadFile(response.data, filename);
        message.success('Excel exported successfully');
      } else if (mode === 'bulk' && permitIds && permitIds.length > 0) {
        const response = await bulkExportExcel(permitIds, detailed);
        const filename = getFilenameFromResponse(response, 'permits_bulk.xlsx');
        downloadFile(response.data, filename);
        message.success(`${permitIds.length} permits exported to Excel`);
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || 'Failed to export Excel');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'single') {
    const menuItems = [
      {
        key: 'pdf',
        icon: <FilePdfOutlined />,
        label: 'Export PDF',
        onClick: handleExportPDF,
      },
      {
        key: 'excel',
        icon: <FileExcelOutlined />,
        label: 'Export Excel',
        onClick: () => handleExportExcel(false),
      },
      {
        key: 'excel-detailed',
        icon: <FileExcelOutlined />,
        label: 'Export Excel (Detailed)',
        onClick: () => handleExportExcel(true),
      },
    ];

    return (
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Button icon={<DownloadOutlined />} loading={loading}>
          Export
        </Button>
      </Dropdown>
    );
  }

  // Bulk mode
  const menuItems = [
    {
      key: 'pdf-bulk',
      icon: <FilePdfOutlined />,
      label: 'Bulk PDF (ZIP)',
      onClick: handleExportPDF,
      disabled: !permitIds || permitIds.length === 0,
    },
    {
      key: 'excel-bulk',
      icon: <FileExcelOutlined />,
      label: 'Bulk Excel',
      onClick: () => handleExportExcel(false),
      disabled: !permitIds || permitIds.length === 0,
    },
    {
      key: 'excel-bulk-detailed',
      icon: <FileExcelOutlined />,
      label: 'Bulk Excel (Detailed)',
      onClick: () => handleExportExcel(true),
      disabled: !permitIds || permitIds.length === 0,
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Button 
        icon={<DownloadOutlined />} 
        loading={loading}
        disabled={!permitIds || permitIds.length === 0}
      >
        Bulk Export {permitIds && permitIds.length > 0 ? `(${permitIds.length})` : ''}
      </Button>
    </Dropdown>
  );
};

export default ExportButtons;
